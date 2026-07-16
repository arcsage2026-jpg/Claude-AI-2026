// Wraps the built single-file avatar.html as a JS module exporting the
// markup as a string constant, so mobile/src/AvatarWebView.js can pass it
// to <WebView source={{ html }}> directly — no file:// URI, no Android
// WebView file-access permissions, no expo-asset download step involved.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = resolve(__dirname, "../dist-avatar/avatar.html");
const outPath = resolve(__dirname, "../mobile/assets/avatar/avatarHtml.js");

const html = readFileSync(srcPath, "utf-8");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `export default ${JSON.stringify(html)};\n`);
console.log(`Wrote ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
