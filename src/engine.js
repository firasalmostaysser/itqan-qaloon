/* Tajweed colour engine for «الطريق إلى الإتقان» — method of الشيخ المقرئ محمّد بن عبد الله جوّاد.
   Works on KFGQPC Qaloon text. Every rule returns {i: charIndex, cat, why} candidates; the page
   resolves them per character with the cheikh's priority order and the visible categories. */
(function (root) {
  "use strict";

  const CATEGORIES = [
    // The cheikh's six colours, in his order.
    { id: "shadid", name: "ساكن شديد", color: "#39B54A", dark: "#5ED36E", core: true, on: true, table: true,
      short: "سكون أو شدّة على حرف من (أجد قط بكت): ينحبس معه الصوت في المخرج." },
    { id: "bayni", name: "ساكن بيني", color: "#29ABE2", dark: "#5CC6F2", core: true, on: true, table: true,
      short: "سكون أو شدّة على حرف من (لن عمر): يجري معه الصوت جرياناً جزئياً." },
    { id: "rikhw", name: "ساكن رخو", color: "#ED1C24", dark: "#FF5C61", core: true, on: true, table: true,
      short: "سكون أو شدّة على باقي الحروف: يجري معها الصوت جرياناً كاملاً." },
    { id: "ghunna", name: "تمكين الغنة", color: "#EC008C", dark: "#FF4DB3", core: true, on: true, table: true,
      short: "الغنّة الكاملة: النون والميم المشدّدتان، والمدغم والمخفى والمقلب." },
    { id: "harakat", name: "إتمام الحركات", color: "#21409A", dark: "#86A2FF", core: true, on: true, table: true,
      short: "الفتحة والضمّة والكسرة تُتمّ ولا تُختلس: الفتحة بفتح الفم، والضمّة بضمّ الشفتين، والكسرة بخفض الفك." },
    { id: "takhlis", name: "تخليص الحروف", color: "#F7941D", dark: "#FFAE4D", core: true, on: true, table: true,
      short: "(خص ضغط قظ) والراء المفخّمة ولام لفظ الجلالة بعد فتح أو ضمّ: لا يؤثّر المفخّم في المرقّق ولا العكس." },
    // Extras the cheikh can switch on.
    { id: "idgham", name: "حرف مدغم لا يُنطق", color: "#B0B0B0", dark: "#6E6E6E", on: true,
      short: "حرف يُدغم في الذي بعده فلا يُنطق مستقلاً، مثل نون «مِن» قبل «مَّسَد»." },
    { id: "wasl", name: "ضبط همزة الوصل", color: "#0E7C66", dark: "#3CC9A8", on: false,
      short: "همزة الوصل وعلامة ضبطها: تسقط في الوصل وتثبت في الابتداء." },
    { id: "tashil", name: "التسهيل", color: "#8E44AD", dark: "#C08BE0", on: false,
      short: "تسهيل الهمزة الثانية بين الهمزة والألف (رواية قالون)." },
    { id: "ikhtilas", name: "الاختلاس والإشمام", color: "#7D5A3C", dark: "#C89B72", on: false,
      short: "مواضع الاختلاس والإشمام الخاصة برواية قالون." },
    { id: "madd_lazim", name: "مدّ لازم", color: "#B03A2E", dark: "#E07065", on: false, short: "مدّ بعده سكون أصلي: ستّ حركات." },
    { id: "madd_muttasil", name: "مدّ متّصل", color: "#C0392B", dark: "#E4776B", on: false, short: "حرف المدّ وبعده همز في كلمة واحدة." },
    { id: "madd_munfasil", name: "مدّ منفصل", color: "#D35400", dark: "#F08A45", on: false, short: "حرف المدّ آخر الكلمة والهمز أول التي بعدها." },
    { id: "madd_arid", name: "مدّ عارض للسكون", color: "#A04000", dark: "#D9773A", on: false, short: "حرف المدّ قبل الحرف الموقوف عليه." },
    { id: "madd_tabii", name: "مدّ طبيعي", color: "#16A085", dark: "#48D1B5", on: false, short: "الألف بعد فتح، والواو بعد ضمّ، والياء بعد كسر: حركتان." },
    { id: "madd_sila", name: "مدّ الصلة", color: "#2E86C1", dark: "#64B1E6", on: false, short: "صلة هاء الكناية (الواو والياء الصغيرتان)." },
    { id: "ghunna_naqisa", name: "غنّة ناقصة", color: "#F06EAA", dark: "#F59AC4", on: false, short: "النون والميم الساكنتان المظهرتان." },
    { id: "ghunna_anqas", name: "غنّة أنقص", color: "#F7B2D2", dark: "#F9C9DF", on: false, short: "النون والميم المتحرّكتان." },
    { id: "lam_shamsiya", name: "لام شمسية", color: "#95A5A6", dark: "#7F8C8D", on: false, short: "لام «ال» المدغمة في الحرف الشمسي بعدها." },
    { id: "zaid", name: "حرف زائد لا يُنطق", color: "#BDC3C7", dark: "#5D6D7E", on: false, short: "حرف يُكتب ولا يُنطق، مثل الألف بعد واو الجماعة." },
  ];

  const DEFAULT_ORDER = ["ghunna", "idgham", "shadid", "bayni", "rikhw", "takhlis", "harakat", "wasl", "tashil", "ikhtilas",
    "madd_lazim", "madd_muttasil", "madd_munfasil", "madd_arid", "madd_tabii", "madd_sila", "ghunna_naqisa", "ghunna_anqas",
    "lam_shamsiya", "zaid"];

  const SETTINGS = {
    mode: "waqf",            // waqf: وقف على رؤوس الآي | wasl | marks: وقف عند علامات الوقف
    finalHaraka: "keep",     // keep (إتمام الحركات) | sakin (لون الساكن) | hide
    tanweenAtWaqf: "harakat", // harakat: no ghunna at a stop (default) | keep: keep the ghunna colour
    classes: { shadid: "ءأإؤئجدقطبكت", bayni: "لنعمر", takhlis: "خصضغطقظ" },
  };

  const MT = {
    "َ": "fatha", "ُ": "damma", "ِ": "kasra", "ْ": "sukun", "ۡ": "sukun", "ّ": "shadda",
    "ً": "tanF", "ٌ": "tanD", "ٍ": "tanK", "ٗ": "otanF", "ٞ": "otanD", "ٖ": "otanK",
    "ࣰ": "otanF", "ࣱ": "otanD", "ࣲ": "otanK", "ۢ": "iqlab", "ۭ": "iqlab", "ٓ": "madd",
    "ٰ": "dagger", "ۥ": "swaw", "ۦ": "sya", "ۧ": "sya", "ۨ": "snoon", "۬": "dot",
    "۪": "dot2", "۟": "zero", "۠": "zero", "ٔ": "hamza", "ٕ": "hamza", "۩": "sajda",
    "‏": "ctrl", "ۖ": "waqf", "ۗ": "waqf", "ۘ": "waqf", "ۙ": "waqf", "ۚ": "waqf",
    "ۛ": "waqf", "ۜ": "waqf",
  };
  const VOW = { fatha: "a", damma: "u", kasra: "i", tanF: "a", tanD: "u", tanK: "i", otanF: "a", otanD: "u", otanK: "i" };
  const IKHFA = "تثجدذزسشصضطظفقك";
  const LETTER_NAME = { "ء": "الهمزة", "ب": "الباء", "ت": "التاء", "ث": "الثاء", "ج": "الجيم", "ح": "الحاء", "خ": "الخاء", "د": "الدال",
    "ذ": "الذال", "ر": "الراء", "ز": "الزاي", "س": "السين", "ش": "الشين", "ص": "الصاد", "ض": "الضاد", "ط": "الطاء", "ظ": "الظاء",
    "ع": "العين", "غ": "الغين", "ف": "الفاء", "ق": "القاف", "ك": "الكاف", "ل": "اللام", "م": "الميم", "ن": "النون", "ه": "الهاء",
    "و": "الواو", "ي": "الياء", "ا": "الألف", "ى": "الألف", "ة": "التاء المربوطة" };

  function norm(ch, marks) {
    if (ch === "آ") return "ا"; // alif + maddah, precomposed
    if ("أإؤئء".includes(ch)) return "ء";
    if (ch === "ـ") return marks.some((m) => m.t === "hamza") ? "ء" : "ـ";
    if (ch === "ے") return "ي";
    if (ch === "ٱ") return "ا";
    return ch;
  }

  function classOf(L, settings) {
    const c = (settings && settings.classes) || SETTINGS.classes;
    if (L === "ة") return "rikhw"; // read as ه at a stop
    if (c.shadid.includes(L)) return "shadid";
    if (c.bayni.includes(L)) return "bayni";
    return "rikhw";
  }
  const CLASS_WHY = { shadid: "حرف شديد (أجد قط بكت) ينحبس معه الصوت", bayni: "حرف بيني (لن عمر) يجري معه الصوت جرياناً جزئياً", rikhw: "حرف رخو يجري معه الصوت جرياناً كاملاً" };

  /** Split one word into letter units (base + its marks). */
  function parseWord(text) {
    const chars = Array.from(text);
    const units = [];
    chars.forEach((ch, i) => {
      const t = MT[ch];
      if (t && units.length) units[units.length - 1].marks.push({ i, ch, t });
      else if (!t) units.push({ b: i, ch, marks: [] });
    });
    for (const u of units) {
      u.L = norm(u.ch, u.marks);
      const has = (t) => u.marks.find((m) => m.t === t);
      u.vowelMark = u.marks.find((m) => m.t === "fatha" || m.t === "damma" || m.t === "kasra") || null;
      u.tanMark = u.marks.find((m) => /tan/.test(m.t)) || null;
      u.vowel = u.vowelMark ? VOW[u.vowelMark.t] : u.tanMark ? VOW[u.tanMark.t] : null;
      u.sukun = has("sukun") || null;
      u.shadda = has("shadda") || null;
      u.iqlab = has("iqlab") || null;
      u.madd = has("madd") || (u.ch === "آ" ? { i: u.b, ch: u.ch, t: "madd" } : null);
      u.dagger = has("dagger") || null;
      u.dot = has("dot") || has("dot2") || null;
      u.zero = has("zero") || null;
      u.waqf = has("waqf") || null;
      u.bare = !u.marks.some((m) => m.t !== "waqf" && m.t !== "sajda" && m.t !== "ctrl");
    }
    return { text, chars, units };
  }

  /** Word-internal roles: wasl alif, madd letters, silent letters, tanween carried on an alif. */
  function wordRoles(w) {
    const U = w.units;
    U.forEach((u, k) => {
      const prev = U[k - 1], next = U[k + 1];
      if (u.ch === "ٱ" || (k === 0 && u.L === "ا" && (u.dot || u.zero || (u.vowelMark && !u.sukun)))) { u.role = "wasl"; return; }
      if (u.L === "ا") {
        if (u.sukun || u.zero) { u.role = "zaid"; return; }
        if (u.tanMark || (u.iqlab && prev)) { u.role = "tanAlif"; if (prev && !prev.vowel) { prev.vowel = "a"; prev.tanOn = u; prev.bare = false; } return; }
        if (u.dot && k > 0) { u.role = "tashil"; return; }
        if (u.vowelMark) { u.role = "letter"; return; }
        if (prev && next && (next.sukun || next.shadda || (next.L === "ل" && (next.bare || next.sukun))) && !u.madd && k <= 2 && "وفبكلت".includes(prev.L)) { u.role = "silentWasl"; return; }
        if (prev && (prev.vowel === "a" || prev.dagger)) { u.role = "madd"; return; }
        if (prev && prev.L === "ء" && !prev.vowel) { u.role = "madd"; return; }
        u.role = k === 0 ? "letter" : "zaid"; return;
      }
      if (u.L === "ى" && u.tanMark) { u.role = "tanAlif"; if (prev && !prev.vowel) { prev.vowel = "a"; prev.tanOn = u; prev.bare = false; } return; }
      if ((u.L === "ى" || u.L === "ي" || u.L === "و") && u.dagger && !u.vowelMark && !u.sukun && !u.shadda) { u.role = "madd"; return; } // عَلَيٰ ، ضُحَيٰ
      if (u.L === "ى") { u.role = u.vowelMark ? "letter" : "madd"; return; }
      if (u.L === "و" && !u.vowel && !u.sukun && !u.shadda && prev && prev.vowel === "u") { u.role = "madd"; return; }
      if (u.L === "ي" && !u.vowel && !u.sukun && !u.shadda && prev && prev.vowel === "i") { u.role = "madd"; return; }
      if (u.L === "و" && u.sukun && k === 1 && prev && prev.L === "ء" && prev.vowel === "u" && next && next.L === "ل") { u.role = "zaid"; return; } // أُوْلَٰٓئِكَ
      if (u.zero) { u.role = "zaid"; return; }
      if (u.L === "ـ") { u.role = "kashida"; return; }
      u.role = "letter";
    });
    // lam of «ال» merged into a sun letter
    U.forEach((u, k) => {
      if (u.role === "letter" && u.L === "ل" && u.bare && U[k + 1] && U[k + 1].shadda && U[k - 1] && (U[k - 1].role === "wasl" || U[k - 1].role === "silentWasl")) u.role = "lamShams";
    });
    // lafz al-jalala: …ل ل ه
    const plain = U.map((u) => u.L).join("");
    const j = plain.lastIndexOf("لله");
    if (j >= 0 && /^(ء)?(و|ف|ب|ت|ل|ك)?(ا)?$/.test(plain.slice(0, j)) && U[j + 2] && U[j + 2].L === "ه" && (j + 3 === U.length || (U[j + 3].L === "م" && j + 4 === U.length))) {
      w.jalala = j + 1;
      if (U[j].bare && U[j].role === "letter") U[j].role = "lamShams";
    }
    return w;
  }

  const pronounced = (u) => u && (u.role === "letter" || u.role === "madd");

  /**
   * Analyse one ayah.
   * words: array of word texts (symbols such as ۞ allowed).
   * ctx: { settings, prevWord, nextWord, stopAtEnd, startHere }
   *   prevWord / nextWord: neighbouring word texts across the ayah boundary (wasl only).
   * Returns per word: { text, chars, units, cand: Array<Array<{cat, why, slot}>> } indexed by char.
   */
  function analyzeAyah(words, ctx) {
    ctx = ctx || {};
    const S = Object.assign({}, SETTINGS, ctx.settings || {});
    const W = words.map((t) => wordRoles(parseWord(t)));
    W.forEach((w) => (w.cand = w.chars.map(() => [])));
    const mode = S.mode;
    const n = W.length;
    // stops: word index after which the reader pauses
    const stopAfter = (wi) => {
      if (wi === n - 1) return mode !== "wasl" || ctx.stopAtEnd === true || !ctx.nextWord;
      if (mode === "marks") return W[wi].units.some((u) => u.waqf);
      return false;
    };
    const startsAt = (wi) => (wi === 0 ? mode !== "wasl" || ctx.startHere === true || !ctx.prevWord : stopAfter(wi - 1));
    const extPrev = ctx.prevWord ? wordRoles(parseWord(ctx.prevWord)) : null;
    const extNext = ctx.nextWord ? wordRoles(parseWord(ctx.nextWord)) : null;

    const add = (w, i, cat, why) => { if (i != null && w.cand[i]) w.cand[i].push({ cat, why }); };
    // the visible body of a letter: the base glyph, plus the hamza drawn as a mark on a tatweel
    const addBody = (w, u, cat, why) => { add(w, u.b, cat, why); const h = u.marks.find((m) => m.t === "hamza"); if (h) add(w, h.i, cat, why); };
    const addMark = (w, m, cat, why) => m && add(w, m.i, cat, why);

    // next pronounced unit after (wi,k), crossing into the next word only when reading continues
    function nextUnit(wi, k) {
      let w = W[wi];
      for (let kk = k + 1; kk < w.units.length; kk++) { const u = w.units[kk]; if (u.role !== "zaid" && u.role !== "kashida") return { u, sameWord: true, w }; }
      if (stopAfter(wi)) return null;
      const nw = wi + 1 < n ? W[wi + 1] : extNext;
      if (!nw) return null;
      for (const u of nw.units) if (u.role !== "zaid" && u.role !== "silentWasl" && u.role !== "wasl" && u.role !== "lamShams") return { u, sameWord: false, w: nw };
      return null;
    }
    // vowel heard right before unit k of word wi (for ra and lafz al-jalala)
    function vowelBefore(wi, k) {
      const w = W[wi];
      for (let kk = k - 1; kk >= 0; kk--) {
        const u = w.units[kk];
        if (u.role === "wasl") return { wasl: true, v: startsAt(wi) ? "a" : endVowel(wi - 1) };
        if (u.role === "silentWasl" || u.role === "lamShams" || u.role === "zaid" || u.role === "kashida") continue;
        if (u.role === "madd") return { v: u.L === "و" ? "u" : u.L === "ي" ? "i" : "a", madd: u };
        if (u.vowel) return { v: u.vowel, u };
        return { v: null, sakin: u, k: kk };
      }
      return { v: startsAt(wi) ? "a" : endVowel(wi - 1), cross: true };
    }
    function endVowel(wi) {
      const w = wi >= 0 ? W[wi] : extPrev;
      if (!w) return "a";
      for (let kk = w.units.length - 1; kk >= 0; kk--) {
        const u = w.units[kk];
        if (u.role === "zaid" || u.role === "kashida") continue;
        if (u.role === "tanAlif" || u.tanMark) return "i";
        if (u.role === "madd") return u.L === "و" ? "u" : u.L === "ي" ? "i" : "a";
        if (u.vowel) return u.vowel;
        return "i";
      }
      return "a";
    }
    function lastPronounced(w) {
      for (let kk = w.units.length - 1; kk >= 0; kk--) { const u = w.units[kk]; if (u.role !== "zaid" && u.role !== "kashida") return kk; }
      return -1;
    }

    W.forEach((w, wi) => {
      const U = w.units;
      const stopHere = stopAfter(wi);
      const lastK = lastPronounced(w);
      // ---- stop on the last letter (waqf) ----
      let waqfK = -1;
      if (stopHere && lastK >= 0) {
        const u = U[lastK];
        if (u.role === "tanAlif" || u.role === "madd") { waqfK = -2; }
        else if (u.role === "letter") waqfK = lastK;
      }

      U.forEach((u, k) => {
        const L = u.L, name = LETTER_NAME[L] || L;
        if (u.role === "wasl") { add(w, u.b, "wasl", "همزة وصل: تسقط في الوصل وتثبت عند الابتداء"); u.marks.forEach((m) => add(w, m.i, "wasl", "علامة ضبط همزة الوصل (ليست حركة تُنطق في الوصل)")); return; }
        if (u.role === "silentWasl") { add(w, u.b, "wasl", "ألف وصل لا تُنطق في الوصل"); return; }
        if (u.role === "zaid") { add(w, u.b, "zaid", "حرف يُكتب ولا يُنطق"); u.marks.forEach((m) => add(w, m.i, "zaid", "علامة على حرف لا يُنطق")); return; }
        if (u.role === "lamShams") { add(w, u.b, "lam_shamsiya", "لام مدغمة في الحرف بعدها لا تُنطق"); return; }
        if (u.role === "tashil") { add(w, u.b, "tashil", "همزة مسهّلة بين الهمزة والألف"); addMark(w, u.dot, "tashil", "علامة التسهيل"); u.marks.filter((m) => m !== u.dot).forEach((m) => VOW[m.t] && add(w, m.i, "harakat", "إتمام الحركة")); return; }

        const cls = classOf(L, S);
        const isNM = L === "ن" || L === "م";
        const prevInfo = () => vowelBefore(wi, k);

        // ---- sukun ----
        if (u.sukun && u.role !== "madd") {
          if (isNM) add(w, u.b, "ghunna_naqisa", `غنّة ناقصة في ${name} الساكنة المظهرة`);
          add(w, u.sukun.i, cls, `سكون على ${name}: ${CLASS_WHY[cls]}`);
        }
        // ---- shadda ----
        if (u.shadda) {
          if (isNM) add(w, u.shadda.i, "ghunna", `${name} مشدّدة: غنّة كاملة`);
          else if ((L === "ي" || L === "و") && precededByHiddenNun(wi, k)) add(w, u.shadda.i, "ghunna", `إدغام بغنّة في ${name}`);
          add(w, u.shadda.i, cls, `شدّة على ${name}: ${CLASS_WHY[cls]}`);
        }
        // ---- vowels and tanween ----
        if (u.vowelMark && u.role !== "wasl") {
          const isFinal = k === waqfK;
          if (isFinal && S.finalHaraka === "sakin") add(w, u.vowelMark.i, cls, "تُسكَّن عند الوقف");
          else if (isFinal && S.finalHaraka === "hide") add(w, u.vowelMark.i, "__hide", "لا تُنطق عند الوقف");
          add(w, u.vowelMark.i, "harakat", "إتمام الحركة: لا تُنقص ولا تُختلس");
          if (isNM && !u.shadda) add(w, u.b, "ghunna_anqas", `غنّة أنقص في ${name} المتحرّكة`);
        }
        const tanUnits = u.tanMark || u.role === "tanAlif" ? [{ host: u }] : [];
        for (const { host } of tanUnits) {
          const m = host.tanMark;
          const open = m && m.t.startsWith("o");
          const nx = nextUnit(wi, k);
          const atStop = stopHere && (k >= lastK - 1);
          if (m) {
            if (open && !(nx && (nx.u.L === "ل" || nx.u.L === "ر"))) {
              if (!(atStop && S.tanweenAtWaqf === "harakat")) add(w, m.i, "ghunna", atStop ? "تنوين يُخفى أو يُدغم بغنّة عند الوصل" : nx && "يو".includes(nx.u.L) ? "تنوين مدغم بغنّة" : nx && nx.u.L === "م" ? "تنوين مدغم في الميم بغنّة" : nx && nx.u.L === "ن" ? "تنوين مدغم في النون بغنّة" : "إخفاء التنوين بغنّة");
            }
            add(w, m.i, "harakat", open ? "حركة التنوين" : "تنوين مظهر: إتمام الحركة");
          }
          if (host.iqlab && !(atStop && S.tanweenAtWaqf === "harakat")) add(w, host.iqlab.i, "ghunna", "إقلاب: التنوين يُقلب ميماً مخفاة بغنّة");
          if (host.vowelMark && host.role === "tanAlif") add(w, host.vowelMark.i, "harakat", "إتمام الحركة");
        }
        if (u.iqlab && u.role !== "tanAlif" && !(stopHere && k >= lastK - 1 && S.tanweenAtWaqf === "harakat")) add(w, u.iqlab.i, "ghunna", "إقلاب: يُقلب ميماً مخفاة بغنّة");
        u.marks.forEach((m) => { if (m.t === "snoon") add(w, m.i, "ghunna", "نون صغيرة مخفاة بغنّة"); });

        // ---- bare nun / meem (hidden or merged) ----
        if (u.role === "letter" && u.bare && isNM && k !== waqfK) {
          const nx = nextUnit(wi, k);
          if (nx) {
            if (L === "ن") {
              if (nx.u.shadda) { add(w, u.b, "idgham", `نون مدغمة في ${LETTER_NAME[nx.u.L] || nx.u.L} فلا تُنطق`); }
              else if (IKHFA.includes(nx.u.L) || nx.u.L === "ب" || "يو".includes(nx.u.L)) add(w, u.b, "ghunna", nx.u.L === "ب" ? "إقلاب النون ميماً بغنّة" : "إخفاء النون بغنّة");
            } else {
              if (nx.u.L === "ب") add(w, u.b, "ghunna", "إخفاء الميم عند الباء بغنّة");
              else if (nx.u.L === "م" && nx.u.shadda) add(w, u.b, "idgham", "ميم مدغمة في الميم بعدها");
            }
          }
        } else if (u.role === "letter" && u.bare && k !== waqfK && !isNM) {
          const nx = nextUnit(wi, k);
          if (nx && nx.u.shadda && L !== "ا") add(w, u.b, "idgham", `${name} مدغمة في ${LETTER_NAME[nx.u.L] || nx.u.L} بعدها`);
        }

        // ---- stop: last letter becomes sakin ----
        if (k === waqfK) {
          addBody(w, u, cls, `الوقف يُسكّن ${L === "ة" ? "التاء المربوطة هاءً" : name}: ${CLASS_WHY[cls]}`);
          if (u.shadda) add(w, u.shadda.i, cls, `شدّة عند الوقف: ${CLASS_WHY[cls]}`);
          if (u.tanMark && S.finalHaraka === "hide") add(w, u.tanMark.i, "__hide", "لا يُنطق التنوين عند الوقف");
        }

        // ---- takhlis: heavy letters, ra, lafz al-jalala ----
        if (S.classes.takhlis.includes(L)) addBody(w, u, "takhlis", `${name} من حروف الاستعلاء (خص ضغط قظ): تُخلَّص من التأثّر بما جاورها`);
        if (L === "ر" && u.role === "letter") {
          const st = raState(wi, k);
          if (st === "tafkhim") add(w, u.b, "takhlis", raWhy(st));
        }
        if (w.jalala === k) {
          const pv = prevInfo();
          if (pv.v === "a" || pv.v === "u") add(w, u.b, "takhlis", `لام لفظ الجلالة بعد ${pv.v === "a" ? "فتح" : "ضمّ"}: تُفخّم`);
        }

        // ---- madd ----
        if (u.role === "madd" || u.dagger || u.madd) {
          const target = u.madd || u.dagger;
          let cat = "madd_tabii", why = "مدّ طبيعي بمقدار حركتين";
          if (u.madd) {
            const nx = nextUnit(wi, k);
            if (nx && nx.sameWord && nx.u.L === "ء") { cat = "madd_muttasil"; why = "مدّ متّصل: بعده همز في الكلمة نفسها"; }
            else if (nx && !nx.sameWord && nx.u.L === "ء") { cat = "madd_munfasil"; why = "مدّ منفصل: الهمز في أوّل الكلمة التالية"; }
            else { cat = "madd_lazim"; why = "مدّ لازم: بعده سكون أصلي"; }
          } else if (stopHere && (k === lastK - 1 || (k === lastK - 2 && U[lastK - 1] && U[lastK - 1].role === "zaid"))) { cat = "madd_arid"; why = "مدّ عارض للسكون بسبب الوقف"; }
          if (u.role === "madd") add(w, u.b, cat, why);
          if (target) add(w, target.i, cat, why);
        }
        u.marks.forEach((m) => { if (m.t === "swaw" || m.t === "sya") add(w, m.i, "madd_sila", "صلة هاء الكناية"); });
        if (u.dot && u.role === "letter") add(w, u.dot.i, "ikhtilas", "علامة اختلاس أو إشمام (قالون)");
      });
    });

    function precededByHiddenNun(wi, k) {
      const w = W[wi];
      let p = w.units[k - 1], pw = w;
      if (!p) { if (wi === 0 || stopAfter(wi - 1)) return false; pw = W[wi - 1]; p = pw.units[pw.units.length - 1]; while (p && p.role === "zaid") p = pw.units[pw.units.indexOf(p) - 1]; }
      if (!p) return false;
      if (p.L === "ن" && p.bare) return true;
      if (p.tanMark && p.tanMark.t.startsWith("o")) return true;
      if (p.role === "tanAlif" && p.tanMark && p.tanMark.t.startsWith("o")) return true;
      return false;
    }
    function raState(wi, k) {
      const w = W[wi], u = w.units[k];
      const stop = stopAfter(wi) && k === lastPronounced(w);
      if (u.vowel && !(stop && !u.shadda)) return u.vowel === "i" ? "tarqiq" : "tafkhim";
      if (u.shadda && u.vowel) return u.vowel === "i" ? "tarqiq" : "tafkhim";
      // sakin ra (written sukun, or at a stop)
      const pv = vowelBefore(wi, k);
      if (pv.wasl) return "tafkhim";
      if (pv.madd) return pv.madd.L === "ي" ? "tarqiq" : "tafkhim";
      if (pv.sakin) {
        if (pv.sakin.L === "ي") return "tarqiq";
        const pp = vowelBefore(wi, pv.k);
        if (pp.v === "i") return w.units[pv.k] && S.classes.takhlis.includes(w.units[pv.k].L) ? "tafkhim" : "tarqiq";
        return "tafkhim";
      }
      if (pv.v === "i") {
        if (pv.cross) return "tafkhim";
        const nx = w.units[k + 1];
        if (nx && S.classes.takhlis.includes(nx.L) && nx.vowel !== "i") return "tafkhim";
        return "tarqiq";
      }
      return "tafkhim";
    }
    function raWhy(st) { return st === "tafkhim" ? "راء مفخّمة: تُخلَّص فلا تتأثّر بالمرقّق" : "راء مرقّقة"; }

    return W;
  }

  /** Resolve the displayed category per char. visible: Set of category ids; order: priority list; ov: {charIndex: catId|""} */
  function resolve(word, visible, order, ov) {
    const rank = new Map(order.map((id, i) => [id, i]));
    return word.cand.map((list, i) => {
      if (ov && Object.prototype.hasOwnProperty.call(ov, i)) return ov[i] || null;
      let best = null, br = 1e9;
      for (const c of list) {
        if (c.cat === "__hide") continue;
        if (!visible.has(c.cat)) continue;
        const r = rank.has(c.cat) ? rank.get(c.cat) : 500;
        if (r < br) { br = r; best = c.cat; }
      }
      if (list.some((c) => c.cat === "__hide") && visible.has("harakat")) return "__hide";
      return best;
    });
  }

  const api = { CATEGORIES, DEFAULT_ORDER, SETTINGS, parseWord, wordRoles, analyzeAyah, resolve, classOf, LETTER_NAME, MT };
  root.Tajweed = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
