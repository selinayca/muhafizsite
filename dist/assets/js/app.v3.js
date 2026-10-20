/* MUHAFIZ · app.v3.js
   Sayfa JS olmadan da okunur, form çalışır, simülasyon son durumuyla görünür.
   Bu dosya yalnızca iyileştirme ekler. Modüller birbirinden bağımsızdır;
   simülasyon, durum makinesindeki her geçişi olay olarak yayınlar:
   "muhafiz:alarm" (cihaz kartı dinler) ve "muhafiz:sim" (telefon ve canlı
   durum noktaları dinler).
   Dinleyenler kendi senaryo mantığını tutmaz; durumu bu olaydan okur. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ======================================================================
     Başlık: biraz kaydırınca yarı saydam + bulanık zemin
     ====================================================================== */
  function initHeader() {
    var header = $('[data-header]');
    if (!header || !hasIO) return;
    // Sayfanın en üstüne 1px'lik bir nöbetçi; görünmez olunca "kaydırıldı".
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:8px;left:0;width:1px;height:1px';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ======================================================================
     Mobil menü: gerçek <button>, aria-expanded, odak tuzağı, Esc
     ====================================================================== */
  function initMenu() {
    var toggle = $('[data-nav-toggle]');
    var nav = $('[data-nav]');
    var closeBtn = $('[data-nav-close]');
    if (!toggle || !nav) return;

    function focusables() {
      return $$('a[href], button:not([disabled])', nav).filter(function (el) { return el.offsetParent !== null; });
    }
    function open() {
      nav.classList.add('is-open');
      document.body.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      var f = focusables();
      if (f.length) f[0].focus();
    }
    function close(returnFocus) {
      if (!nav.classList.contains('is-open')) return;
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', function () { close(true); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
    document.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.key === 'Escape') { close(true); return; }
      if (e.key !== 'Tab') return;
      // Odak panelin içinde döner; arkadaki sayfaya kaçmaz.
      var f = focusables();
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) close(false);
    });
  }

  /* ======================================================================
     Ekran dışındaki sürekli animasyonları durdur (pil ve CPU için)
     ====================================================================== */
  function initPauseOffscreen() {
    if (!hasIO) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting); });
    });
    $$('[data-anim]').forEach(function (el) { io.observe(el); });
  }

  /* ======================================================================
     Sayaçlar: rakam şeridi ekrana girince sayarak gelir
     ====================================================================== */
  function initCounters() {
    var box = $('[data-counters]');
    if (!box || !hasIO || reduceMotion) return;
    var nums = $$('[data-count]', box);
    nums.forEach(function (n) { n.textContent = '0'; });
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var start = performance.now();
      (function frame(now) {
        var t = Math.min(1, (now - start) / 1200);
        var eased = 1 - Math.pow(1 - t, 3);
        nums.forEach(function (n) { n.textContent = Math.round(eased * Number(n.getAttribute('data-count'))); });
        if (t < 1) requestAnimationFrame(frame);
      })(start);
    }, { threshold: 0.4 });
    io.observe(box);
  }

  /* ======================================================================
     CANLI SİMÜLASYON
     Tek durum makinesi: { scenario, phase: idle|running|done, step, timers }.
     Görünüm yalnızca bu durumdan türetilir; Sıfırla her şeyi temizler ve
     aynı anda iki senaryo çalışamaz.
     ====================================================================== */
  var SCENARIOS = {
    deprem: {
      kind: 'DEPREM ALARMI',
      steps: [
        { fx: 'detect', t: 'Sarsıntı algılandı', d: 'İki sensörden en yüksek değer eşiği aştı; alarm açıldı.' },
        { fx: 'cut', t: 'Gaz ve elektrik kesme sinyali gönderildi', d: 'Doğalgaz ve elektrik için güvenlik sinyali.' },
        { fx: 'lift', t: 'Asansör güvenli moda alındı', d: 'Kabin en yakın katta durdu, kapı açıldı.' },
        { fx: 'notify', t: 'Siren çalıyor, kritik bildirim gitti', d: 'Binanın onaylı sakinlerinin telefonuna siren sesli push.' },
        { fx: 'residents', t: 'Sakinler durum bildiriyor', d: 'Güvendeyim / Yardım istiyorum yanıtları yönetime düşer.', ms: 2000 }
      ]
    },
    yangin: {
      kind: 'YANGIN ALARMI',
      steps: [
        // Duman sensörü [DOĞRULANACAK]; doğrulanana kadar yalnızca sıcaklık ölçümü gösteriliyor.
        { fx: 'heat', t: 'Sıcaklık eşiği aşıldı', d: 'Cihazın sıcaklık ölçümü eşiği geçti; alarm açıldı.' },
        // [DOĞRULANACAK] Yangın senaryosunda gaz/elektrik kesme sinyali gönderiliyor mu?
        { fx: 'cut', t: 'Gaz ve elektrik kesme sinyali gönderildi', d: 'Doğalgaz ve elektrik için güvenlik sinyali.' },
        // [DOĞRULANACAK] Yangın senaryosunda asansör güvenli moda alınıyor mu?
        { fx: 'lift', t: 'Asansör güvenli moda alındı', d: 'Kabin en yakın katta durdu, kapı açıldı.' },
        { fx: 'notify', t: 'Siren çalıyor, kritik bildirim gitti', d: 'Binanın onaylı sakinlerinin telefonuna siren sesli push.' },
        { fx: 'residents', t: 'Sakinler durum bildiriyor', d: 'Güvendeyim / Yardım istiyorum yanıtları yönetime düşer.', ms: 2000 },
        { fx: 'queue', t: 'Yardım talebi yönetici kuyruğunda', d: 'Yönetici talebi üstlenir; konum haritada görünür.' }
      ]
    }
  };
  var STEP_MS = 1200;
  // 12 daire: D1 (1. kat sol) … D12 (6. kat sağ). Yardım: D7; yanıt yok: D2, D11.
  var SAFE_ORDER = [9, 3, 12, 5, 1, 10, 6, 4, 8];
  var HELP_APT = 7;

  function initSimulation() {
    var root = $('[data-sim]');
    if (!root) return null;

    var el = {
      list: $('[data-steps]', root),
      badge: $('[data-sim-badge]', root),
      building: $('[data-building]', root),
      apts: $$('.apt', root),
      cabin: $('[data-cabin]', root),
      notify: $('[data-notify]', root),
      notifyKind: $('[data-notify-kind]', root),
      log: $('[data-log]', root),
      live: $('[data-sim-live]', root),
      rSafe: $('[data-r-safe]', root),
      rHelp: $('[data-r-help]', root),
      rWait: $('[data-r-wait]', root),
      buttons: $$('[data-scenario-btn]', root),
      reset: $('[data-sim-reset]', root),
      systems: {
        power: $('[data-system="power"]', root),
        gas: $('[data-system="gas"]', root),
        lift: $('[data-system="lift"]', root)
      }
    };
    var sim = { scenario: 'deprem', phase: 'idle', step: -1, timers: [] };

    /* --- yardımcılar --- */
    // Adım temposu (pace) hareket tercihinden bağımsızdır: azaltılmış harekette de
    // adımlar ~1.2 sn arayla ilerler. Adım İÇİ küçük geçişler (kapı, pencereler)
    // ise azaltılmış harekette anında olur.
    function pace(fn, ms) { sim.timers.push(setTimeout(fn, ms)); }
    function later(fn, ms) { sim.timers.push(setTimeout(fn, reduceMotion ? 0 : ms)); }
    function clearTimers() { sim.timers.forEach(clearTimeout); sim.timers = []; }
    function announce(text) { el.live.textContent = text; }
    function emitAlarm(active) {
      document.dispatchEvent(new CustomEvent('muhafiz:alarm', { detail: { active: active, scenario: sim.scenario } }));
    }
    // Durum makinesinin anlık görüntüsü: dinleyenler (telefon) yalnızca bunu okur.
    function emitState(fx) {
      document.dispatchEvent(new CustomEvent('muhafiz:sim', {
        detail: { scenario: sim.scenario, kind: SCENARIOS[sim.scenario].kind, phase: sim.phase, step: sim.step, fx: fx || null }
      }));
    }
    function log(time, text) {
      var li = document.createElement('li');
      var t = document.createElement('time');
      t.textContent = time;
      li.appendChild(t);
      li.appendChild(document.createTextNode(text));
      el.log.appendChild(li);
      // Eski satırlar CSS ile gizleniyor; DOM'u da sınırlı tut.
      while (el.log.children.length > 12) el.log.removeChild(el.log.firstChild);
    }
    function setBadge(kind) {
      var map = {
        normal: ['badge--normal', 'NORMAL', '#i-check'],
        alarm: ['badge--alarm', 'ALARM', '#i-bell'],
        safe: ['badge--safe-mode', 'GÜVENLİ MOD', '#i-check']
      }[kind];
      el.badge.className = 'badge ' + map[0];
      el.badge.innerHTML = '<svg class="icon" aria-hidden="true"><use href="' + map[2] + '"/></svg>' + map[1];
    }
    function setSystem(name, state, text) {
      var row = el.systems[name];
      row.setAttribute('data-state', state);
      $('.system__val', row).textContent = text;
    }
    function setResidents(safe, help, wait) {
      el.rSafe.textContent = safe; el.rHelp.textContent = help; el.rWait.textContent = wait;
    }
    function apt(n) { return el.apts[n - 1]; }

    /* --- adım listesi --- */
    var BADGE = {
      pending: '<span class="badge badge--pending">BEKLEMEDE</span>',
      active: '<span class="badge badge--active"><span class="ring" aria-hidden="true"></span>İŞLENİYOR</span>',
      done: '<span class="badge badge--done"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>TAMAMLANDI</span>'
    };
    function buildSteps() {
      el.list.innerHTML = '';
      SCENARIOS[sim.scenario].steps.forEach(function (s, i) {
        var li = document.createElement('li');
        li.className = 'step';
        li.innerHTML = '<span class="step__num">' + (i + 1) + '</span>' +
          '<div class="step__text"><strong></strong><span></span></div>' + BADGE.pending;
        $('strong', li).textContent = s.t;
        $('.step__text span', li).textContent = s.d;
        li.setAttribute('data-state', 'pending');
        el.list.appendChild(li);
      });
    }
    function setStepState(i, state) {
      var li = el.list.children[i];
      if (!li) return;
      li.setAttribute('data-state', state);
      li.lastElementChild.outerHTML = BADGE[state];
    }

    /* --- görünümü başa al --- */
    function resetView() {
      setBadge('normal');
      el.building.classList.remove('is-alarm', 'is-shaking');
      el.apts.forEach(function (a) { a.classList.remove('is-safe', 'is-help', 'is-fire'); });
      el.cabin.classList.remove('is-moving', 'is-at-floor', 'is-open');
      setSystem('power', 'normal', 'Normal');
      setSystem('gas', 'normal', 'Normal');
      setSystem('lift', 'normal', 'Normal');
      el.notify.classList.remove('is-in');
      setResidents('–', '–', '–');
      el.log.innerHTML = '';
      log('00:00.0', 'sistem izlemede · bina A');
    }

    /* --- adım etkileri --- */
    var FX = {
      detect: function () {
        setBadge('alarm');
        el.building.classList.add('is-alarm', 'is-shaking');
        later(function () { el.building.classList.remove('is-shaking'); }, 900);
        el.cabin.classList.add('is-moving');
        setSystem('lift', 'moving', 'Hareket halinde');
        emitAlarm(true);
        log('00:00.4', 'sensor_a 0.42g > eşik');
        log('00:00.5', 'sensor_b 0.38g > eşik');
        log('00:01.1', 'alarm açıldı · bina A');
      },
      heat: function () {
        setBadge('alarm');
        el.building.classList.add('is-alarm');
        el.cabin.classList.add('is-moving');
        setSystem('lift', 'moving', 'Hareket halinde');
        emitAlarm(true);
        log('00:00.6', 'sicaklik > eşik');
        log('00:01.1', 'alarm açıldı · bina A');
      },
      cut: function () {
        setSystem('power', 'cut', 'Kesildi');
        setSystem('gas', 'cut', 'Kesildi');
        log('00:01.3', 'gaz_kes · elektrik_kes sinyali');
      },
      lift: function () {
        el.cabin.classList.remove('is-moving');
        el.cabin.classList.add('is-at-floor');
        later(function () { el.cabin.classList.add('is-open'); }, 800);
        setSystem('lift', 'safe', 'Güvenli katta · Kapı: Açık');
        setBadge('safe');
        log('00:01.9', 'asansör güvenli mod · kat 4');
      },
      notify: function () {
        el.notifyKind.textContent = SCENARIOS[sim.scenario].kind;
        el.notify.classList.add('is-in');
        log('00:02.3', 'siren açık');
        log('00:02.3', 'push gönderildi · 12 cihaz');
      },
      residents: function () {
        var safe = 0;
        setResidents(0, 0, 12);
        SAFE_ORDER.forEach(function (n, i) {
          later(function () {
            apt(n).classList.add('is-safe');
            safe++;
            setResidents(safe, i >= 4 ? 1 : 0, 12 - safe - (i >= 4 ? 1 : 0));
          }, 120 + i * 150);
          if (i === 4) {
            later(function () {
              apt(HELP_APT).classList.add('is-help');
              log('00:08.2', 'yardım talebi · D7 · konum alındı');
            }, 120 + i * 150 + 60);
          }
        });
        later(function () {
          setResidents(9, 1, 2);
          log('00:12.6', 'güvende 9/12 · yardım 1 · bekleniyor 2');
        }, 120 + SAFE_ORDER.length * 150);
      },
      queue: function () {
        log('00:14.0', 'yardım kuyruğu · D7 · yönetici üstlendi');
      }
    };

    /* --- durum makinesi --- */
    function syncButtons() {
      var running = sim.phase === 'running';
      el.buttons.forEach(function (b) {
        b.disabled = running;
        b.setAttribute('aria-pressed', String(b.getAttribute('data-scenario-btn') === sim.scenario));
      });
      root.setAttribute('data-phase', sim.phase);
      root.setAttribute('data-scenario', sim.scenario);
    }
    function next() {
      var steps = SCENARIOS[sim.scenario].steps;
      if (sim.step >= 0) setStepState(sim.step, 'done');
      sim.step++;
      if (sim.step >= steps.length) {
        sim.phase = 'done';
        syncButtons();
        emitState();
        announce('Senaryo tamamlandı. Tekrar izlemek için Sıfırla’ya basın ya da diğer senaryoyu seçin.');
        return;
      }
      var s = steps[sim.step];
      setStepState(sim.step, 'active');
      FX[s.fx]();
      emitState(s.fx);
      announce('Adım ' + (sim.step + 1) + ' / ' + steps.length + ': ' + s.t + '.');
      pace(next, s.ms || STEP_MS);
    }
    function reset(silent) {
      clearTimers();
      sim.phase = 'idle';
      sim.step = -1;
      resetView();
      buildSteps();
      syncButtons();
      emitAlarm(false);
      // Sessiz sıfırlama (açılış ya da senaryo başlangıcı) yayınlanmaz; telefon
      // yalnızca kullanıcının Sıfırla'sına ve adım 4'e tepki verir.
      if (!silent) {
        emitState();
        announce('Simülasyon sıfırlandı. Bina normal durumda.');
      }
    }
    function start(scenario) {
      if (sim.phase === 'running') return; // aynı anda iki senaryo yok
      sim.scenario = scenario;
      reset(true);
      sim.phase = 'running';
      syncButtons();
      announce(SCENARIOS[scenario].kind + ' senaryosu başladı.');
      next();
    }

    el.buttons.forEach(function (b) {
      b.addEventListener('click', function () { start(b.getAttribute('data-scenario-btn')); });
    });
    el.reset.addEventListener('click', function () { reset(false); });

    reset(true); // JS varsa statik son kareden başlangıca dön
    return { start: start, root: root };
  }

  /* Hero'daki "Canlı simülasyonu başlat": panele kay, deprem senaryosunu başlat. */
  function initHeroStart(sim) {
    var trigger = $('[data-sim-start]');
    if (!trigger || !sim) return;
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      sim.root.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      var pressed = $('[data-scenario-btn="deprem"]', sim.root);
      if (pressed) pressed.focus({ preventScroll: true });
      setTimeout(function () { sim.start(trigger.getAttribute('data-sim-start')); }, reduceMotion ? 0 : 650);
    });
  }

  /* ======================================================================
     Cihaz kartı: terminalde küçük, gerçekçi oynamalar; simülasyonla ortak alarm
     ====================================================================== */
  function initUnit() {
    var unit = $('[data-unit]');
    if (!unit) return;
    var f = function (k) { return $('[data-t="' + k + '"]', unit); };
    var ledAlarm = $('[data-led-alarm]', unit);
    var ledText = $('[data-led-alarm-text]', unit);
    var visible = true;
    var alarm = null; // null | 'deprem' | 'yangin'
    var seen = 2;

    function jitter(base, spread) { return (base + (Math.random() - 0.5) * spread).toFixed(3) + 'g'; }
    function setStatus(key, text, isAlarm) {
      var s = f(key);
      s.textContent = text;
      s.className = isAlarm ? 't-alarm' : 't-ok';
    }
    function sample() {
      if (alarm === 'deprem') {
        f('a').textContent = jitter(0.42, 0.04);
        f('b').textContent = jitter(0.38, 0.04);
      } else {
        f('a').textContent = jitter(0.012, 0.004);
        f('b').textContent = jitter(0.010, 0.004);
      }
      f('rssi').textContent = '-' + (59 + Math.round(Math.random() * 5)) + 'dBm';
    }
    function render() {
      var quake = alarm === 'deprem';
      setStatus('a-st', quake ? 'ALARM' : 'OK', quake);
      setStatus('b-st', quake ? 'ALARM' : 'OK', quake);
      ledAlarm.className = 'led ' + (alarm ? 'led--alarm' : 'led--off');
      ledText.textContent = alarm ? ': aktif' : ': sönük';
      sample();
    }

    // Cihaz 4 sn'de bir veri gönderiyormuş gibi: LAST_SEEN 1→4, sonra yeni ölçüm.
    setInterval(function () {
      if (!visible) return;
      seen++;
      if (seen > 4) { seen = 1; sample(); }
      f('seen').textContent = seen;
    }, 1000);

    if (hasIO) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(unit);
    }
    document.addEventListener('muhafiz:alarm', function (e) {
      alarm = e.detail.active ? e.detail.scenario : null;
      render();
    });
  }


  /* ======================================================================
     Sakin uygulaması telefonu
     Ekranlar uygulamadaki akışı izler: alarm → (Güvendeyim: SnackBar)
     → (Yardım: alt sayfa → "Emin misiniz?" → acil kişilere haber ver).
     Durum: { screen, helpLabel, loc }. Görünüm data-screen'den türetilir.
     ====================================================================== */
  function initPhone() {
    var phone = $('[data-phone]');
    if (!phone) return;
    var stage = $('[data-phone-stage]');
    var tilt = $('[data-phone-tilt]');
    var main = $('[data-app-main]', phone);
    var live = $('[data-phone-live]', stage);
    var kindEl = $('[data-phone-kind]', phone);
    var chips = $$('.chip', phone);
    var send = $('[data-send]', phone);
    var locBtn = $('[data-loc]', phone);
    var labelEl = $('[data-help-label]', phone);
    var shareMain = $('[data-share-main]', phone);
    var controls = $$('.phone-controls [data-go]', stage);
    var resetBtn = $('.phone-reset', stage);
    var state = { screen: 'alarm', helpLabel: '', loc: false };

    var SAY = {
      alarm: function () { return 'Telefon: alarm ekranı. ' + kindEl.textContent + ', A Blok.'; },
      safe: function () { return 'Güvende olarak işaretlendiniz.'; },
      help: function () { return 'Yardım talebi paneli açıldı. Yardım tipini seçin.'; },
      confirm: function () { return 'Emin misiniz? Yardım talebi onayı: ' + state.helpLabel + '.'; },
      sent: function () { return 'Yardım talebi gönderildi. Acil kişilere haber verme paneli açıldı.'; }
    };
    // Telefonun altındaki seçici: yardım akışının tüm ekranları "Yardım"a sayılır.
    var GROUP = { alarm: 'alarm', safe: 'safe', help: 'help', confirm: 'help', sent: 'help' };

    function render(focusInside, silent) {
      phone.setAttribute('data-screen', state.screen);
      // Alt sayfa ya da onay açıkken arkadaki alarm ekranı etkileşime kapanır.
      var modal = state.screen === 'help' || state.screen === 'confirm' || state.screen === 'sent';
      if (modal) main.setAttribute('inert', ''); else main.removeAttribute('inert');
      var sheet = $('.sheet[data-layer~="help"]', phone);
      if (state.screen === 'confirm') sheet.setAttribute('inert', ''); else sheet.removeAttribute('inert');

      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.textContent === state.helpLabel)); });
      send.disabled = !state.helpLabel;
      locBtn.setAttribute('aria-checked', String(state.loc));
      labelEl.textContent = state.helpLabel;
      // Uygulamadaki gibi: konum paylaşıldıysa WhatsApp, değilse SMS önerilir.
      shareMain.textContent = state.loc ? 'WhatsApp ile Haber Ver (önerilen)' : 'SMS ile Haber Ver (önerilen)';

      controls.forEach(function (b) {
        if (b === resetBtn) return;
        b.setAttribute('aria-pressed', String(b.getAttribute('data-go') === GROUP[state.screen]));
      });
      resetBtn.hidden = state.screen === 'alarm';
      // Simülasyondan gelen değişiklikler sessiz: simülasyon kendi duyurusunu yapıyor.
      if (!silent) live.textContent = SAY[state.screen]();

      if (focusInside) {
        var target = {
          help: chips[0],
          confirm: $('.dialog [data-go="sent"]', phone),
          sent: $('.sheet[data-layer~="sent"] .sheet__title', phone)
        }[state.screen];
        if (target) {
          if (!target.matches('button')) target.setAttribute('tabindex', '-1');
          // Katman görünür olunca odakla: visibility geçişi bitmeden focus() boşa gider.
          (function tryFocus(n) {
            if (getComputedStyle(target).visibility === 'visible') target.focus({ preventScroll: true });
            else if (n > 0) requestAnimationFrame(function () { tryFocus(n - 1); });
          })(40);
        }
      }
    }
    function go(screen, focusInside, silent) {
      if (screen === 'alarm' || screen === 'safe') { state.helpLabel = ''; state.loc = false; }
      state.screen = screen;
      render(focusInside, silent);
    }

    phone.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) { state.helpLabel = chip.textContent; render(false); return; }
      if (e.target.closest('[data-loc]')) { state.loc = !state.loc; render(false); return; }
      if (e.target.closest('[data-send]')) { if (state.helpLabel) go('confirm', true); return; }
      var b = e.target.closest('[data-go]');
      if (b) go(b.getAttribute('data-go'), true);
    });
    controls.forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-go'), false); });
    });
    phone.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.screen !== 'alarm') {
        // Uygulamadaki geri hareketi: onaydan alt sayfaya, alt sayfadan alarma.
        go(state.screen === 'confirm' ? 'help' : 'alarm', true);
      }
    });

    /* Simülasyonla bağ: durum makinesinin yayınını oku, kopya mantık yok.
       Adım 4 (kritik bildirim) → alarm ekranı + titreşim; sıfırlama → başa. */
    document.addEventListener('muhafiz:sim', function (e) {
      var d = e.detail;
      if (d.fx === 'notify') {
        kindEl.textContent = d.kind;
        go('alarm', false, true);
        if (!reduceMotion) {
          phone.classList.remove('is-buzz');
          void phone.offsetWidth; // animasyonu yeniden başlat
          phone.classList.add('is-buzz');
        }
      } else if (d.phase === 'idle') {
        kindEl.textContent = 'DEPREM ALARMI';
        go('alarm', false, true);
      }
    });
    phone.addEventListener('animationend', function () { phone.classList.remove('is-buzz'); });

    /* Fareyle hafif eğilme (en fazla 6°); dokunmatikte ve azaltılmış harekette kapalı. */
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (tilt && finePointer && !reduceMotion) {
      var raf = 0, px = 0, py = 0;
      var apply = function () {
        raf = 0;
        tilt.style.setProperty('--ry', (px * 6).toFixed(2) + 'deg');
        tilt.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg');
      };
      stage.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = stage.getBoundingClientRect();
        px = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
        py = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
        if (!raf) raf = requestAnimationFrame(apply);
      });
      stage.addEventListener('pointerleave', function () { px = 0; py = 0; if (!raf) raf = requestAnimationFrame(apply); });
    }

    // İlk yüklemede duyuru yapma; yalnızca görünümü kur.
    phone.setAttribute('data-screen', 'alarm');
  }

  /* ======================================================================
     Canlı durum noktaları (menü + hero rozeti): senaryo çalışırken kırmızı.
     Kendi durumu yok; simülasyonun yayınladığı aşamayı (phase) okur.
     ====================================================================== */
  function initLiveDots() {
    var dots = $$('.live-dot');
    if (!dots.length) return;
    document.addEventListener('muhafiz:sim', function (e) {
      var alarm = e.detail.phase === 'running';
      document.documentElement.classList.toggle('is-sim-alarm', alarm);
      dots.forEach(function (d) { d.title = alarm ? 'Simülasyon: alarm' : 'Sistem çevrimiçi'; });
    });
  }

  /* ======================================================================
     "Bayimiz olun": forma kaydırırken rolü seç
     ====================================================================== */
  function initRoleLinks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-role]');
      var select = document.getElementById('f-role');
      if (link && select) select.value = link.getAttribute('data-role');
    });
  }

  /* ======================================================================
     Form: alan altı hata mesajları + fetch ile gönderim
     ====================================================================== */
  function initForm() {
    var form = $('[data-form]');
    if (!form) return;
    var loadedAt = Date.now();
    var status = $('[data-form-status]', form);
    var label = $('[data-submit-label]', form);
    var MESSAGES = {
      name: 'Lütfen adınızı ve soyadınızı yazın.',
      phone: 'Lütfen geçerli bir telefon numarası yazın (en az 10 rakam).',
      email: 'Lütfen geçerli bir e-posta adresi yazın.',
      role: 'Lütfen rolünüzü seçin.',
      building_type: 'Lütfen bina tipini seçin.',
      city: 'Lütfen şehir ve ilçeyi yazın.',
      kvkk: 'Devam etmek için Aydınlatma Metni’ni onaylayın.'
    };

    form.setAttribute('novalidate', '');

    function showError(field, msg) {
      var box = $('[data-error-for="' + field.name + '"]', form);
      if (msg) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      if (box) box.textContent = msg || '';
    }
    function check(field) {
      if (!MESSAGES[field.name]) return true;
      var ok = field.checkValidity();
      if (ok && field.name === 'phone') ok = field.value.replace(/\D/g, '').length >= 10;
      showError(field, ok ? '' : MESSAGES[field.name]);
      return ok;
    }
    // Doğrulama gönderimde; hatalı alan yazdıkça güncellenir. Blur'da doğrulamıyoruz:
    // hata satırı o anda kaybolursa düzen kayar ve sonraki tıklama hedefi ıskalar.
    function recheck(e) { if (e.target.getAttribute('aria-invalid') === 'true') check(e.target); }
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);

    function setSending(on) {
      form.classList.toggle('is-sending', on);
      label.textContent = on ? 'Gönderiliyor…' : 'Teklif iste';
    }

    form.addEventListener('submit', function (e) {
      var firstBad = null;
      $$('input, select, textarea', form).forEach(function (f) {
        if (!check(f) && !firstBad) firstBad = f;
      });
      $('[data-elapsed]', form).value = String(Date.now() - loadedAt);
      if (firstBad) { e.preventDefault(); firstBad.focus(); return; }
      if (!window.fetch || !window.FormData) return; // klasik gönderim

      e.preventDefault();
      setSending(true);
      status.className = 'form__status';
      status.textContent = '';
      // Yalnızca sunucunun kendi mesajını göster; ağ ya da ayrıştırma hatası
      // (ör. hosting PHP çalıştırmıyorsa) genel mesaja düşer.
      var serverMsg = '';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data || {} }; });
        })
        .then(function (r) {
          if (r.ok && r.data.ok) {
            form.reset();
            status.classList.add('is-ok');
            status.textContent = 'Teşekkürler, talebiniz bize ulaştı. En kısa sürede size dönüş yapacağız.';
            return;
          }
          var errs = r.data.errors || {};
          Object.keys(errs).forEach(function (name) {
            var f = form.elements[name];
            if (f && f.name) showError(f, errs[name]);
          });
          serverMsg = r.data.message || '';
          throw new Error('server');
        })
        .catch(function () {
          status.classList.add('is-error');
          status.textContent = serverMsg || 'Talep gönderilemedi. Lütfen bu bölümdeki telefon ya da e-postadan ulaşın.';
        })
        .then(function () { setSending(false); });
    });
  }

  /* ---------------------------------------------------------------------- */
  initHeader();
  initMenu();
  initPauseOffscreen();
  initCounters();
  initUnit();              // önce dinleyenler: simülasyonun ilk olaylarını duysunlar
  initPhone();
  initLiveDots();
  initHeroStart(initSimulation());
  initRoleLinks();
  initForm();
})();
