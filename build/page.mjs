// Builds two pages from src/: site/index.html (full document for GitHub/Cloudflare Pages)
// and artifact/index.html (fragment for the Claude artifact, which adds its own skeleton).
import fs from "fs";
const src = "../src/";
let html = fs.readFileSync(src + "index.html", "utf8");
const put = (marker, file) => { const c = fs.readFileSync(src + file, "utf8"); html = html.replace(marker, () => c.replace(/<\/script/gi, "<\\/script")); };
put("/*STYLE*/", "style.css");
put("/*ENGINE*/", "engine.js");
put("/*APP*/", "app.js");
fs.mkdirSync("../artifact", { recursive: true });
fs.writeFileSync("../artifact/index.html", html);
const cut = html.indexOf('<svg id="gdefs"');
const head = html.slice(0, cut), body = html.slice(cut);
const reset = `<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>`;
fs.writeFileSync("../site/index.html", `<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${reset}\n${head}</head>\n<body>\n${body}</body>\n</html>\n`);
if (!fs.existsSync("../site/data/state.json")) fs.writeFileSync("../site/data/state.json", JSON.stringify({ v: 1, savedAt: null }));
console.log("site/index.html + artifact/index.html", html.length, "bytes");
