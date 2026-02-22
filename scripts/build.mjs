import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const js = readFileSync('app.js', 'utf8');

const minCss = s =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();

const minJs = s =>
  s
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('');

const minHtml = s =>
  s
    .replace(/<!--[^]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .trim();

const out = minHtml(
  html
    .replace('<link rel=stylesheet href=style.css>', `<style>${minCss(css)}</style>`)
    .replace('<script src=app.js></script>', `<script>${minJs(js)}</script>`)
);

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.min.html', out);

console.log(`Wrote dist/index.min.html (${Buffer.byteLength(out)} bytes)`);
