import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const files = ['index.html', 'style.css', 'app.js'];
const maxRaw = 10000;
const maxGzip = 3500;

let rawTotal = 0;
let gzipTotal = 0;

for (const file of files) {
  const buf = readFileSync(file);
  const gz = gzipSync(buf);
  rawTotal += buf.length;
  gzipTotal += gz.length;
  console.log(`${file.padEnd(10)} raw=${String(buf.length).padStart(5)} gzip=${String(gz.length).padStart(5)}`);
}

console.log(`core       raw=${String(rawTotal).padStart(5)} gzip=${String(gzipTotal).padStart(5)}`);

if (existsSync('dist/index.min.html')) {
  const dist = readFileSync('dist/index.min.html');
  const distGzip = gzipSync(dist);
  console.log(`dist       raw=${String(dist.length).padStart(5)} gzip=${String(distGzip.length).padStart(5)}`);
}

if (rawTotal > maxRaw || gzipTotal > maxGzip) {
  console.error(`Budget failed (limits: raw<=${maxRaw}, gzip<=${maxGzip})`);
  process.exit(1);
}

console.log('Budget passed');
