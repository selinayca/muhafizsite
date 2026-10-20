const sharp = require('sharp');
const fs = require('fs'); const path = require('path');
const K = path.resolve(__dirname, '../muhafiz-kit');
const job = async (src, out, w, h, opts = {}) => {
  fs.mkdirSync(path.dirname(path.join(K, out)), { recursive: true });
  const meta = await sharp(path.join(K, src)).metadata();
  const density = Math.min(2400, Math.max(72, Math.ceil(72 * 2 * w / meta.width)));
  let img = sharp(path.join(K, src), { density }).resize(w, h || null, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (opts.flatten) img = img.flatten({ background: opts.flatten });
  return img.png().toFile(path.join(K, out));
};
const jobs = [
  ['app-icon/muhafiz-icon-ios.svg', 'app-icon/ios/AppIcon-1024.png', 1024, 1024, { flatten: '#0F2A47' }],
  ['app-icon/muhafiz-icon-rounded.svg', 'app-icon/muhafiz-icon-rounded-1024.png', 1024, 1024],
  ['app-icon/muhafiz-icon-ios.svg', 'app-icon/android/play-store-512.png', 512, 512, { flatten: '#0F2A47' }],
  ['app-icon/android/ic_launcher_foreground.svg', 'app-icon/android/ic_launcher_foreground-432.png', 432, 432],
  ['app-icon/android/ic_launcher_monochrome.svg', 'app-icon/android/ic_launcher_monochrome-432.png', 432, 432],
  ['web/favicon.svg', 'web/favicon-16.png', 16, 16],
  ['web/favicon.svg', 'web/favicon-32.png', 32, 32],
  ['web/favicon.svg', 'web/favicon-48.png', 48, 48],
  ['app-icon/muhafiz-icon-ios.svg', 'web/apple-touch-icon.png', 180, 180, { flatten: '#0F2A47' }],
  ['app-icon/muhafiz-icon-rounded.svg', 'web/icon-192.png', 192, 192],
  ['app-icon/muhafiz-icon-rounded.svg', 'web/icon-512.png', 512, 512],
  ['web/icon-maskable.svg', 'web/icon-maskable-512.png', 512, 512, { flatten: '#0F2A47' }],
  ['splash/android12-splash-icon-light.svg', 'splash/android12-splash-icon-light.png', 1152, 1152],
  ['splash/android12-splash-icon-dark.svg', 'splash/android12-splash-icon-dark.png', 1152, 1152],
  ['svg/muhafiz-logo-light.svg', 'splash/splash-logo-light.png', 1200],
  ['svg/muhafiz-logo-dark.svg', 'splash/splash-logo-dark.png', 1200],
];
for (const m of ['light', 'dark', 'mono', 'white'])
  for (const n of ['logo', 'wordmark', 'symbol'])
    jobs.push([`svg/muhafiz-${n}-${m}.svg`, `png/muhafiz-${n}-${m}.png`, n === 'symbol' ? 600 : 1600]);
Promise.all(jobs.map(j => job(...j))).then(() => console.log('png ok', jobs.length));
