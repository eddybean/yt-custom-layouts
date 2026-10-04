import * as esbuild from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { watch as fsWatch } from 'node:fs';

const watch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const options = {
  entryPoints: {
    content: 'src/content/main.ts',
    chat: 'src/chat/main.ts',
    background: 'src/background.ts',
    popup: 'src/popup/popup.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
};

const copyStatic = () => cp('static', 'dist', { recursive: true });

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyStatic();

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  fsWatch('static', { recursive: true }, () => copyStatic().catch(console.error));
} else {
  await esbuild.build(options);
}
