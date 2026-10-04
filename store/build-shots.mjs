// ストア用スクリーンショットを headless Chrome で撮影し、store/screenshots/ に PNG を出力する。
// 事前に npm run build で dist/ を作っておくこと（4 枚目は実際のポップアップ画面を埋め込む）。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const shotsDir = join(root, 'store/shots');
const outDir = join(root, 'store/screenshots');
const tmpDir = join(root, 'store/.tmp');

const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
if (!chrome) throw new Error('Chrome が見つかりません。CHROME_PATH で指定してください');

// 4 枚目用: 実際のポップアップ画面に、chrome.* API のスタブを差し込んだもの
const stub = `window.chrome = {
  storage: {
    sync: { get: async () => ({ settings: { preset: 'above-related', chatHeight: 420, chatWidth: 420, chatFontScale: 1.1, hideTicker: true } }), set: async () => {} },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener() {} },
  },
  runtime: { openOptionsPage() {}, onMessage: { addListener() {} } },
  tabs: { query: async () => [], sendMessage: async () => {} },
};`;
mkdirSync(tmpDir, { recursive: true });
writeFileSync(
  join(tmpDir, 'popup.html'),
  readFileSync(join(root, 'dist/popup.html'), 'utf8')
    .replace('href="popup.css"', 'href="../../dist/popup.css"')
    .replace('<script src="popup.js"></script>', `<script>${stub}</script><script src="../../dist/popup.js"></script>`),
);

const shots = [
  ['1-overlay', 1280, 800],
  ['2-above-related', 1280, 800],
  ['3-above-comments', 1280, 800],
  ['4-settings', 1280, 800],
  ['5-picker', 1280, 800],
  ['promo-small', 440, 280],
];

mkdirSync(outDir, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'ytcl-shots-'));
try {
  for (const [name, width, height] of shots) {
    const out = join(outDir, `${name}.png`);
    execFileSync(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-dark-mode',
      '--force-device-scale-factor=1',
      '--allow-file-access-from-files',
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      '--virtual-time-budget=2000',
      `--screenshot=${out}`,
      pathToFileURL(join(shotsDir, `${name}.html`)).href,
    ], { stdio: 'ignore' });
    console.log(`${name}.png`);
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}
