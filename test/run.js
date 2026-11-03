const T = require('../src/engine.js');
const fs = require('fs');
const core = new Set(['shadid','bayni','rikhw','ghunna','harakat','takhlis','idgham']);
const AB = {shadid:'G', bayni:'B', rikhw:'R', ghunna:'P', harakat:'d', takhlis:'O', idgham:'x', __hide:'_'};
const MN = {fatha:'َ',damma:'ُ',kasra:'ِ',sukun:'ْ',shadda:'ّ'};
function show(words, ctx){
  const W = T.analyzeAyah(words, ctx);
  return W.map(w => {
    const r = T.resolve(w, core, T.DEFAULT_ORDER, null);
    return w.units.map(u => {
      let s = u.ch + (r[u.b] ? '['+AB[r[u.b]]+']' : '');
      for (const m of u.marks) if (r[m.i]) s += '{'+(m.t)+':'+AB[r[m.i]]+'}';
      return s;
    }).join('');
  }).join('  ');
}
const meta = JSON.parse(fs.readFileSync(__dirname+'/../site/data/meta.json'));
function surah(n){ return JSON.parse(fs.readFileSync(__dirname+'/../site/data/s/'+String(n).padStart(3,'0')+'.json')); }
const mode = process.argv[3] || 'waqf';
console.log('BASMALA:', show(meta.basmala.map(w=>w[0]), {settings:{mode}}));
for (const n of process.argv[2].split(',').map(Number)) {
  const s = surah(n);
  s.ayahs.forEach((a,ai) => {
    const words = a.w.map(w=>w[0]);
    const prev = ai>0 ? s.ayahs[ai-1].w.at(-1)[0] : null, next = ai<s.ayahs.length-1 ? s.ayahs[ai+1].w[0][0] : null;
    console.log(n+':'+a.a, show(words, {settings:{mode}, prevWord: prev, nextWord: next}));
  });
}
