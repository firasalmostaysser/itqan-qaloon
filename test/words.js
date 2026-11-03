const T = require('../src/engine.js');
const all = new Set(T.CATEGORIES.map(c=>c.id));
const NM = Object.fromEntries(T.CATEGORIES.map(c=>[c.id,c.name]));
function show(words, ctx){
  const W = T.analyzeAyah(words, ctx||{});
  return W.map(w => { const r = T.resolve(w, all, T.DEFAULT_ORDER, null);
    return w.text+' → '+w.units.map(u => { let s=u.ch+(r[u.b]?'['+NM[r[u.b]]+']':''); for(const m of u.marks) if(r[m.i]) s+='{'+m.t+':'+NM[r[m.i]]+'}'; return s;}).join(' ') + '   roles:'+w.units.map(u=>u.role).join(',');
  }).join('\n');
}
const tests = [
 ['ءَٰا۬نذَرْتَهُمْ','أَمْ','لَمْ'], ['أُوْلَٰٓئِكَ','عَلَيٰ'], ['قَالُواْ','إِنَّمَا'], ['سَيِّـَٔاتِهِمْ'], ['اِ۪رْجِعُوٓاْ','إِلَيٰ'],
 ['فِرْعَوْنَ','وَقِرْطَاسٍ'], ['مِرْصَاداٗ'], ['وَالْفَجْرِ'], ['قَدِيرٌ'], ['خَيْرٌ'], ['اِ۬لنَّارِ'], ['وَالشَّمْسِ','وَضُحَيٰهَا'],
 ['مَن','يَّقُولُ','ءَامَنَّا'], ['أَنتُمْ','عَٰلِمُونَ'], ['تَرْمِيهِم','بِحِجَارَةٖ'], ['اَ۬لسَّمَآءِ'], ['جَآءَ','أَحَدُهُم'], ['بِمَآ','أُنزِلَ'], ['أَلَٓمِّٓۖ','ذَٰلِكَ'], ['هُدىٗ','لِّلْمُتَّقِينَ'],
];
for (const t of tests) console.log(show(t), '\n');
// wasl mode Ikhlas 1→2
console.log('WASL:', show(['اِ۬للَّهُ','اُ۬لصَّمَدُۖ'], {settings:{mode:'wasl'}, prevWord:'أَحَدٌۖ', nextWord:'لَمْ'}));
console.log('WAQF:', show(['اِ۬للَّهُ','اُ۬لصَّمَدُۖ'], {settings:{mode:'waqf'}, prevWord:'أَحَدٌۖ', nextWord:'لَمْ'}));
console.log('jalala:', show(['قُلِ','اِ۬للَّهُمَّ','مَٰلِكَ']), '\n', show(['وَاللَّهُ','غَفُورٞ','رَّحِيمٞ']));
