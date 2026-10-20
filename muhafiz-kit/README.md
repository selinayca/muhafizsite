# MUHAFIZ Logo Seti

Kalkanın içindeki M, yazının ilk harfidir: logo "[M]UHAFIZ" diye okunur, M iki kez yazılmaz. Kalkanın üstünde sinyal (uyarı), yazıda ev biçimli A ve içindeki turkuaz pencere ("güvendeyim").
Bütün SVG'ler dolgu şekillerden oluşur; kontur ya da clip-path içermez. Tarayıcı, Figma,
Illustrator ve `flutter_svg` aynı sonucu verir.

## Renkler

| Ad | HEX | Kullanım |
|---|---|---|
| Gece Laciverti | `#0F2A47` | Logo, ana marka rengi |
| Sinyal Turkuazı | `#14B8C4` | Sinyal halkaları ve pencere; logodaki tek vurgu |
| Mürekkep | `#0B1220` | Koyu mod zemini |
| Kağıt | `#F7F9FB` | Açık mod zemini |

Kırmızı, yeşil ve amber logoda hiç kullanılmaz; arayüzde alarm, güvende ve uyarı durumlarına ayrılmıştır.

## Hangi dosya nerede?

| Dosya | Ne zaman |
|---|---|
| `svg/muhafiz-logo-*` | Ana logo: kalkanlı M + UHAFIZ. Her yerde öncelikle bu kullanılır. Web panel kenar menüsü, giriş ekranı, e-posta, belge başlığı |
| `svg/muhafiz-wordmark-*` | Sadece yazı (MUHAFIZ). Yalnızca kalkanın kullanılamadığı yerler (tek satır metin, çok dar alanlar). Kalkanın yanına asla konmaz |
| `svg/muhafiz-symbol-*` | Sadece kalkan. Avatar, bildirim ikonu, filigran, küçük alanlar |
| `app-icon/` | Mobil uygulama ikonları |
| `web/` | Favicon, PWA ve Apple ikonları |
| `splash/` | Açılış ekranı görselleri |
| `png/` | Aynı logoların PNG hali (sunum, Word, e-posta) |

### Renk modları

| Ek | Zemin | Açıklama |
|---|---|---|
| `-light` | Beyaz / açık | Lacivert + turkuaz |
| `-dark` | Lacivert / koyu | Beyaz + turkuaz; kalkanın içindeki M zemin rengini gösterir |
| `-mono` | Açık | Tek renk lacivert (faks, damga, tek renk baskı) |
| `-white` | Fotoğraf / renkli | Tek renk beyaz |

## Kurallar

- **Boşluk:** Logonun her yanında en az harf yüksekliğinin yarısı kadar boşluk bırakın (yazıdaki harflerin yarı yüksekliği).
- **En küçük boyut:** Ana logo ekranda 160 px, baskıda 40 mm genişlik. Yazı 100 px. Sembol 16 px. 160 px altında yatay yerine sadece sembol kullanın.
- **Yapılmayacaklar:** Renkleri değiştirmeyin, gölge/gradyan eklemeyin, harf aralığını değiştirmeyin, yazıyı başka bir fontla yeniden yazmayın, kalkanı yazının sağına koymayın.

## Flutter

`pubspec.yaml` (dev_dependencies: `flutter_launcher_icons`, `flutter_native_splash`):

```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/brand/app-icon/ios/AppIcon-1024.png"
  remove_alpha_ios: true
  adaptive_icon_background: "#0F2A47"
  adaptive_icon_foreground: "assets/brand/app-icon/android/ic_launcher_foreground-432.png"
  adaptive_icon_monochrome: "assets/brand/app-icon/android/ic_launcher_monochrome-432.png"

flutter_native_splash:
  color: "#F7F9FB"
  image: "assets/brand/splash/splash-logo-light.png"
  color_dark: "#0B1220"
  image_dark: "assets/brand/splash/splash-logo-dark.png"
  android_12:
    color: "#F7F9FB"
    image: "assets/brand/splash/android12-splash-icon-light.png"
    color_dark: "#0B1220"
    image_dark: "assets/brand/splash/android12-splash-icon-dark.png"
```

Uygulama içinde (`flutter_svg`):

```dart
SvgPicture.asset(
  Theme.of(context).brightness == Brightness.dark
      ? 'assets/brand/svg/muhafiz-logo-dark.svg'
      : 'assets/brand/svg/muhafiz-logo-light.svg',
  height: 40,
  semanticsLabel: 'MUHAFIZ',
);
```

## Next.js (App Router)

`web/` içindekileri `public/` altına kopyalayın, `app/layout.tsx`:

```ts
export const metadata = {
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport = { themeColor: '#0F2A47' };
```

`public/manifest.webmanifest`:

```json
{
  "name": "MUHAFIZ",
  "short_name": "MUHAFIZ",
  "background_color": "#0F2A47",
  "theme_color": "#0F2A47",
  "display": "standalone",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Açık/koyu moda göre logo:

```tsx
<picture>
  <source srcSet="/brand/muhafiz-logo-dark.svg" media="(prefers-color-scheme: dark)" />
  <img src="/brand/muhafiz-logo-light.svg" alt="MUHAFIZ" height={32} />
</picture>
```

## Kaynak

Logolar `src/kit_muhafiz.py` ile üretilir (`final.py` ve `muhafiz.py` yardımcılarını kullanır) (geometri: harf yüksekliği 68, çizgi kalınlığı 14, çatı 45°).
Değişiklik gerekiyorsa SVG'leri elle düzenlemek yerine bu betiği değiştirip yeniden çalıştırın.
