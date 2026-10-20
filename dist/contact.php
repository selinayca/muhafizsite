<?php
/**
 * MUHAFIZ · iletişim formu alıcısı
 *
 * index.html'deki teklif formunu alır, doğrular ve PHP mail() ile iletir.
 * - JS açıkken form fetch ile gelir (Accept: application/json) → JSON döner.
 * - JS kapalıyken klasik POST gelir → küçük bir HTML sonuç sayfası döner.
 *
 * KURULUM: Aşağıdaki iki adresi doldurun.
 *   $TO   : mesajların gideceği adres
 *   $FROM : gönderen adres. Paylaşımlı hostinglerin çoğu, alan adınıza ait ve
 *           hosting panelinde tanımlı bir adres ister (ör. form@muhafiz.site);
 *           yoksa mail spam'e düşer ya da hiç gönderilmez.
 */

$TO   = '[ILETISIM_EPOSTA]';
$FROM = '[GONDEREN_EPOSTA]';

// En az bu kadar sürede doldurulmayan form bot sayılır (milisaniye).
const MIN_FILL_MS = 3000;

date_default_timezone_set('Europe/Istanbul');

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$wantsJson = isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: index.html#teklif', true, 303);
    exit;
}

/** Tek satırlık alan: etiketleri ve satır sonlarını at (başlık enjeksiyonu). */
function clean_line($value, $max) {
    $value = is_string($value) ? $value : '';
    $value = strip_tags($value);
    $value = preg_replace('/[\r\n\t\x00-\x1F\x7F]+/u', ' ', $value);
    $value = trim(preg_replace('/\s{2,}/u', ' ', $value));
    return mb_substr($value, 0, $max, 'UTF-8');
}

/** Çok satırlı alan: satır sonları kalır, diğer kontrol karakterleri gider. */
function clean_text($value, $max) {
    $value = is_string($value) ? $value : '';
    $value = strip_tags($value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
    $value = str_replace("\r\n", "\n", $value);
    return trim(mb_substr($value, 0, $max, 'UTF-8'));
}

function respond($ok, $status, $message, $errors = []) {
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message, 'errors' => (object) $errors], JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    $title = $ok ? 'Teşekkürler' : 'Mesaj gönderilemedi';
    $items = '';
    foreach ($errors as $e) {
        $items .= '<li>' . htmlspecialchars($e, ENT_QUOTES, 'UTF-8') . '</li>';
    }
    $msg = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $back = $ok ? 'Ana sayfaya dön' : 'Forma geri dön';
    echo <<<HTML
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{$title} · MUHAFIZ</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/style.v4.css">
</head>
<body>
<main class="standalone">
  <div class="standalone__box">
    <img src="assets/img/muhafiz-logo-dark.svg" width="168" height="50" alt="MUHAFIZ">
    <h1>{$title}</h1>
    <p>{$msg}</p>
    <ul>{$items}</ul>
    <a class="btn btn--primary" href="index.html#teklif">{$back}</a>
  </div>
</main>
</body>
</html>
HTML;
    exit;
}

// --- Spam kontrolleri: botu sessizce "başarılı" diye savuştur. -------------
$honeypot = isset($_POST['website']) ? trim((string) $_POST['website']) : '';
$elapsed  = isset($_POST['elapsed']) ? (int) $_POST['elapsed'] : -1;
// elapsed boşsa JS kapalıdır; o durumda yalnızca bal küpüne güveniyoruz.
if ($honeypot !== '' || ($elapsed >= 0 && $_POST['elapsed'] !== '' && $elapsed < MIN_FILL_MS)) {
    respond(true, 200, 'Teşekkürler, mesajınız bize ulaştı.');
}

// --- Alanlar ---------------------------------------------------------------
$roles = [
    'yonetici'  => 'Site / bina yöneticisi',
    'bayi'      => 'Bayi adayı',
    'muteahhit' => 'Müteahhit',
    'diger'     => 'Diğer',
];
$types = [
    'apartman' => 'Apartman / site',
    'ticari'   => 'Ticari',
    'kamu'     => 'Kamu',
    'diger'    => 'Diğer',
];

$name    = clean_line($_POST['name'] ?? '', 100);
$phone   = clean_line($_POST['phone'] ?? '', 20);
$email   = clean_line($_POST['email'] ?? '', 150);
$roleKey = clean_line($_POST['role'] ?? '', 20);
$typeKey = clean_line($_POST['building_type'] ?? '', 20);
$city    = clean_line($_POST['city'] ?? '', 80);
$units   = clean_line($_POST['units'] ?? '', 60);
$message = clean_text($_POST['message'] ?? '', 2000);
$kvkk    = ($_POST['kvkk'] ?? '') === '1';

$errors = [];
if (mb_strlen($name, 'UTF-8') < 2) {
    $errors['name'] = 'Lütfen adınızı ve soyadınızı yazın.';
}
if (!preg_match('/^[0-9 +()\-]{10,20}$/', $phone) || strlen(preg_replace('/\D/', '', $phone)) < 10) {
    $errors['phone'] = 'Lütfen geçerli bir telefon numarası yazın (en az 10 rakam).';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Lütfen geçerli bir e-posta adresi yazın.';
}
if (!isset($roles[$roleKey])) {
    $errors['role'] = 'Lütfen rolünüzü seçin.';
}
if (!isset($types[$typeKey])) {
    $errors['building_type'] = 'Lütfen bina tipini seçin.';
}
if (mb_strlen($city, 'UTF-8') < 2) {
    $errors['city'] = 'Lütfen şehir ve ilçeyi yazın.';
}
if (!$kvkk) {
    $errors['kvkk'] = 'Devam etmek için Aydınlatma Metni’ni onaylayın.';
}
if ($errors) {
    respond(false, 422, 'Lütfen işaretli alanları düzeltin.', $errors);
}

// Yer tutucu doldurulmadıysa sessizce kaybetmek yerine açıkça söyle.
if (strpos($TO, '[') !== false || !filter_var($TO, FILTER_VALIDATE_EMAIL)) {
    respond(false, 500, 'Form henüz yapılandırılmadı. Lütfen e-posta ya da telefonla ulaşın.');
}

// --- E-posta ---------------------------------------------------------------
$role    = $roles[$roleKey];
$type    = $types[$typeKey];
$subject = 'MUHAFIZ teklif talebi: ' . $name . ' (' . $role . ', ' . $city . ')';
$body = "Yeni keşif / teklif talebi (muhafiz.site)\n"
      . "--------------------------------\n"
      . "Ad soyad   : {$name}\n"
      . "Telefon    : {$phone}\n"
      . "E-posta    : {$email}\n"
      . "Rol        : {$role}\n"
      . "Bina tipi  : {$type}\n"
      . "Blok/daire : " . ($units !== '' ? $units : '-') . "\n"
      . "Şehir/ilçe : {$city}\n"
      . "KVKK onayı : Aydınlatma Metni onaylandı\n"
      . "Tarih      : " . date('Y-m-d H:i:s') . "\n"
      . "--------------------------------\n\n"
      . ($message !== '' ? $message : '(mesaj yok)') . "\n";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'Reply-To: ' . $email,
    'X-Mailer: muhafiz-site',
];
$params = '';
if (strpos($FROM, '[') === false && filter_var($FROM, FILTER_VALIDATE_EMAIL)) {
    $headers[] = 'From: ' . mb_encode_mimeheader('MUHAFIZ Web', 'UTF-8') . ' <' . $FROM . '>';
    $params = '-f' . $FROM; // bazı hostlar zarf göndericisini de ister
}

$sent = mail(
    $TO,
    mb_encode_mimeheader($subject, 'UTF-8', 'B'),
    $body,
    implode("\r\n", $headers),
    $params
);

if (!$sent) {
    respond(false, 500, 'Mesaj şu anda gönderilemedi. Lütfen e-posta ya da telefonla ulaşın.');
}
respond(true, 200, 'Talebiniz bize ulaştı. En kısa sürede size dönüş yapacağız.');
