#!/usr/bin/env node
/* build.js — pravi jedan samostalan fajl dist/index.html (sav CSS + JS unutra).
 * Idealno za prenos na tablet ili objavu na vebu. Pokreni:  node build.js
 */
const fs = require('fs');
const path = require('path');
const root = __dirname;

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// 1) Ukloni PWA blokove (single-file nema zasebne fajlove)
html = html.replace(/<!-- PWA:START -->[\s\S]*?<!-- PWA:END -->/g, '');

// 2) Ubaci CSS
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, href) => {
  const css = fs.readFileSync(path.join(root, href), 'utf8');
  return `<style>\n${css}\n</style>`;
});

// 3) Ubaci JS (redom)
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) => {
  const js = fs.readFileSync(path.join(root, src), 'utf8');
  return `<script>\n${js}\n</script>`;
});

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'index.html');
fs.writeFileSync(out, html);
console.log('OK -> ' + out + '  (' + (fs.statSync(out).size / 1024).toFixed(1) + ' KB)');
console.log('Otvori dvoklikom, hostuj bilo gde, ili prebaci na tablet.');
