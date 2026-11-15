// Prints the colours of whole surahs for review: node test/run.js 1,111,112
const T = require('../src/engine.js');
const fs = require('fs');
const core = new Set(['shadid','bayni','rikhw','ghunna','harakat','takhlis','idgham']);
const AB = {shadid:'G', bayni:'B', rikhw:'R', ghunna:'P', harakat:'d', takhlis:'O', idgham:'x', __hide:'_'};
const meta = JSON.parse(fs.readFileSync(__dirname+'/../site/data/meta.json'));
const surah = n => JSON.parse(fs.readFileSync(__dirname+'/../site/data/s/'+String(n).padStart(3,'0')+'.json'));
function show(words, ctx){
  return T.analyzeAyah(words, ctx).map(w => { const r = T.resolve(w, core, T.DEFAULT_ORDER, null);
    return w.units.map(u => { let s = u.ch + (r[u.b] ? '['+AB[r[u.b]]+']' : ''); for (const m of u.marks) { if (r[m.i]) s += '{'+m.t+':'+AB[r[m.i]]+(r.s2[m.i] ? '+'+AB[r.s2[m.i]] : (/tan/.test(m.t)?'+-':''))+'}'; } return s; }).join('') + (w.rules.length ? ' <'+w.rules.map(x=>x.rule).join(',')+'>' : '');
  }).join('  ');
}
const mode = process.argv[3] || 'waqf';
for (const n of process.argv[2].split(',').map(Number)) { const s = surah(n);
  s.ayahs.forEach((a,ai) => { const words = a.w.filter(w=>!w[3]).map(w=>w[0]);
    const prev = ai>0 ? s.ayahs[ai-1].w.at(-1)[0] : null, next = ai<s.ayahs.length-1 ? s.ayahs[ai+1].w.find(w=>!w[3])[0] : (n===114||n===8 ? null : meta.basmala[0][0]);
    console.log(n+':'+a.a, show(words, {settings:{mode}, prevWord: prev, nextWord: next})); }); }
