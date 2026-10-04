// npm version の "version" フックから呼ばれ、package.json のバージョンを static/manifest.json に反映する
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const path = 'static/manifest.json';
const manifest = JSON.parse(readFileSync(path, 'utf8'));
manifest.version = version;
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest.json のバージョンを ${version} に更新しました`);
