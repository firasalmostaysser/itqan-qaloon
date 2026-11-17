// End-to-end check of the student and cheikh pages against an in-memory stand-in for the itqan_* database functions.
//   cd site && python3 -m http.server 8765 &   then   node test/school-flow.js [screenshot dir]
const { chromium } = require("playwright");
const crypto = require("crypto");
const OUT = process.argv[2] || ".";
const id = () => crypto.randomUUID();
const db = { levels: [], cohorts: [], students: [], sessions: [], attendance: [], evaluations: [], attempts: [] };
const L1 = { id: id(), name: "المستوى الأول", description: "", surahs: [1, 114, 113, 112, 111], sort: 1 };
db.levels.push(L1);
db.cohorts.push({ id: id(), level_id: L1.id, name: "الدفعة الأولى", join_code: "ABC234", live_url: "https://meet.google.com/abc-defg-hij", schedule: "السبت بعد العصر", active: true });
const fail = (msg) => ({ status: 400, body: { message: msg } });
const me = (sid) => {
  const s = db.students.find((x) => x.id === sid), c = db.cohorts.find((x) => x.id === s.cohort_id), l = c && db.levels.find((x) => x.id === c.level_id);
  const prog = {};
  for (const a of db.attempts.filter((x) => x.student_id === sid)) { const k = a.surah + "|" + a.kind, p = Math.round((100 * a.right) / a.total); prog[k] = { surah: a.surah, kind: a.kind, n: ((prog[k] || {}).n || 0) + 1, best: Math.max(p, (prog[k] || {}).best || 0) }; }
  return { student: { id: s.id, name: s.name }, cohort: c ? { id: c.id, name: c.name, live_url: c.live_url, schedule: c.schedule } : null, level: l || null,
    sessions: db.sessions.filter((x) => x.cohort_id === s.cohort_id).map((x) => ({ ...x, status: (db.attendance.find((a) => a[0] === x.id && a[1] === sid) || [])[2] || null })),
    evaluations: db.evaluations.filter((e) => e.student_id === sid), progress: Object.values(prog) };
};
const api = {
  itqan_join({ p_code, p_name }) {
    const c = db.cohorts.find((x) => x.join_code === p_code.toUpperCase());
    if (!c) return fail("bad_code");
    const s = { id: id(), cohort_id: c.id, name: p_name, phone: "", token: "tok-" + id(), active: true, created_at: new Date().toISOString(), last_seen: new Date().toISOString() };
    db.students.push(s); return { token: s.token, ...me(s.id) };
  },
  itqan_me({ p_token }) { const s = db.students.find((x) => x.token === p_token); return s ? me(s.id) : fail("bad_token"); },
  itqan_attempt(a) { const s = db.students.find((x) => x.token === a.p_token); if (!s) return fail("bad_token"); db.attempts.push({ student_id: s.id, surah: a.p_surah, kind: a.p_kind, right: a.p_right, total: a.p_total, exam: a.p_exam, errors: a.p_errors, at: new Date().toISOString() }); return null; },
  itqan_t_data({ p_key }) {
    if (p_key !== "TK") return fail("bad_key");
    const prog = {}; for (const a of db.attempts) { const k = [a.student_id, a.surah, a.kind].join("|"), p = Math.round((100 * a.right) / a.total); const o = prog[k] || [a.student_id, a.surah, a.kind, 0, 0, null, a.at]; o[3]++; o[4] = Math.max(o[4], p); if (a.exam) o[5] = Math.max(o[5] || 0, p); prog[k] = o; }
    const errs = {}; for (const a of db.attempts) for (const e of a.errors) { const k = [a.student_id, a.kind, e[1] || e[2], e[0]].join("|"); errs[k] = (errs[k] || 0) + (e[3] || 1); }
    return { teacher: "الشيخ", levels: db.levels, cohorts: db.cohorts, students: db.students.map(({ token, ...s }) => s), sessions: db.sessions, attendance: db.attendance,
      evaluations: db.evaluations, progress: Object.values(prog), errors: Object.entries(errs).map(([k, c]) => [...k.split("|"), c]) };
  },
  itqan_t_save({ p_key, p_kind, p_row }) {
    if (p_key !== "TK") return fail("bad_key");
    const table = { level: "levels", cohort: "cohorts", student: "students", session: "sessions", evaluation: "evaluations" }[p_kind];
    if (p_kind === "attendance") { db.attendance = db.attendance.filter((a) => !(a[0] === p_row.session_id && a[1] === p_row.student_id)); if (p_row.status) db.attendance.push([p_row.session_id, p_row.student_id, p_row.status, ""]); return {}; }
    let row = p_row.id && db[table].find((x) => x.id === p_row.id);
    if (!row) { row = { id: id(), at: new Date().toISOString().slice(0, 10), title: "", surahs: [], description: "", live_url: "", schedule: "", active: true, scores: {}, note: "" }; if (p_kind === "cohort") row.join_code = "NEW" + db.cohorts.length + "XY"; db[table].push(row); }
    Object.assign(row, p_row); if (p_row.surah === "") row.surah = null; else if (p_row.surah) row.surah = +p_row.surah;
    if (p_row.new_code) row.join_code = "RNW" + Math.floor(Math.random() * 999);
    return row;
  },
  itqan_t_delete({ p_kind, p_id }) { const t = { level: "levels", cohort: "cohorts", student: "students", session: "sessions", evaluation: "evaluations" }[p_kind]; db[t] = db[t].filter((x) => x.id !== p_id); return null; },
  itqan_t_level_program({ p_id, p_program }) { const l = db.levels.find((x) => x.id === p_id); if (l) l.program = p_program; return null; },
  itqan_t_student({ p_student }) { return { ...me(p_student), attempts: [] }; },
};
(async () => {
  const b = await chromium.launch(), errors = [];
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.route("https://*.supabase.co/rest/v1/rpc/*", async (route) => {
    const fn = route.request().url().split("/").pop(), r = api[fn](JSON.parse(route.request().postData() || "{}"));
    if (r && r.status) return route.fulfill({ status: r.status, contentType: "application/json", body: JSON.stringify(r.body) });
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r) });
  });
  const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
  // ---- student ----
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push("student: " + e.message));
  await p.addInitScript(() => localStorage.setItem("itqan:tour:student", "1"));
  await p.goto("http://localhost:8765/#j=abc234");
  await p.waitForTimeout(2500);
  if (await p.$(".tour")) { for (let i = 0; i < 4; i++) { await p.click("#tNext"); await p.waitForTimeout(80); } }
  await shot(p, "1-join");
  await p.fill("#jName", "أحمد بن علي"); await p.click("#jGo"); await p.waitForTimeout(800);
  console.log("joined:", await p.textContent("#v-home .page-title"), "| level cards:", await p.$$eval("#v-home .sgrid:first-of-type .scard", (x) => x.length));
  await shot(p, "2-home");
  await p.click('#v-home .scard[data-s="111"]'); await p.waitForTimeout(1500);
  await shot(p, "3-mushaf");
  await p.click('#v-mushaf #stabs button[data-st="paint"]'); await p.waitForTimeout(800);
  await p.click("#pAyah use[data-c]"); await p.click("#ptCheck"); await p.waitForTimeout(600);
  console.log("attempts sent:", db.attempts.length);
  await p.click('#v-practice #stabs button[data-st="time"]'); await p.waitForTimeout(500);
  await p.click("#pExam"); await p.waitForTimeout(300); await p.click('[data-pw="1000"]'); await p.click("td[data-col]"); await p.click("#pCheck"); await p.waitForTimeout(600);
  console.log("attempts sent:", db.attempts.length, "exam:", db.attempts.at(-1).exam);
  await p.evaluate(() => { localStorage.setItem("itqan:surah", "1"); location.hash = "#home"; }); await p.waitForTimeout(500);
  await p.click('#v-home .scard[data-s="1"]'); await p.waitForTimeout(1200);
  await p.click('#v-mushaf #stabs button[data-st="wasl"]'); await p.waitForTimeout(700);
  console.log("wasl forms:", await p.$$eval(".wforms .wform", (x) => x.length));
  await p.click(".wform"); await p.click("#wSolve"); await p.waitForTimeout(300);
  await shot(p, "4-wasl");
  // the cheikh's tables on al-Layl
  await p.selectOption("#pS", "92"); await p.waitForTimeout(900);
  for (const k of ["madd", "ra", "huruf"]) {
    await p.click(`#v-practice #stabs button[data-st="${k}"]`); await p.waitForTimeout(700);
    if (k === "madd") { const sel = await p.$$("select[data-ans$='t']"); console.log("madd rows:", sel.length); await sel[0].selectOption("tabii"); }
    if (k === "ra") { const b = await p.$$("[data-ra]"); console.log("ra rows:", b.length / 2); await b[0].click(); await p.waitForTimeout(200); }
    if (k === "huruf") { console.log("letters:", await p.$$eval(".hcard", (x) => x.length)); await p.selectOption(".hcard select", "aqsa_halq"); }
    await p.click("#tCheck"); await p.waitForTimeout(500);
    console.log(k, "result:", (await p.textContent(".result b")).trim());
    await shot(p, "4-" + k);
  }
  // ---- cheikh ----
  const c = await ctx.newPage();
  c.on("pageerror", (e) => errors.push("cheikh: " + e.message));
  await c.addInitScript(() => { localStorage.setItem("itqan:sk", JSON.stringify("TK")); localStorage.setItem("itqan:tour:cheikh", "1"); });
  await c.goto("http://localhost:8765/#students"); await c.waitForTimeout(2500);
  await shot(c, "5-overview");
  await c.click('[data-sv="sessions"]'); await c.waitForTimeout(400);
  await c.selectOption("#nsSurah", "111"); await c.fill("#nsTitle", "تمكين الغنّة"); await c.click("#nsGo"); await c.waitForTimeout(600);
  await c.click('.att [data-st="present"]'); await c.waitForTimeout(400);
  console.log("attendance rows:", db.attendance.length, db.attendance[0] && db.attendance[0][2]);
  await shot(c, "6-attendance");
  await c.click('[data-sv="eval"]'); await c.waitForTimeout(400);
  for (const [k, v] of [["makharij", 8], ["harakat", 9], ["ghunna", 6]]) await c.click(`.evbtns[data-k="${k}"] button[data-v="${v}"]`);
  await c.fill("#evNote", "انتبه لغنّة التنوين قبل الباء"); await c.click("#evGo"); await c.waitForTimeout(600);
  console.log("evaluations:", db.evaluations.length, JSON.stringify(db.evaluations[0].scores));
  await c.click('[data-sv="levels"]'); await c.waitForTimeout(400);
  await c.selectOption(".lvl .lAdd", "110"); await c.waitForTimeout(600);
  console.log("level surahs:", db.levels[0].surahs.join(","));
  await c.fill(".lvl .lProg", "التجويد النظري"); await c.click(".lvl .lSave"); await c.waitForTimeout(600);
  await c.click('.lvl [data-dr="madd"]'); await c.waitForTimeout(500);
  console.log("program:", db.levels[0].program, "| drills:", JSON.stringify(db.levels[0].config));
  await shot(c, "7b-levels");
  await c.click('[data-sv="cohort"]'); await c.waitForTimeout(400);
  await shot(c, "7-cohort");
  await c.click('[data-sv="overview"]'); await c.waitForTimeout(400);
  await c.click("[data-stu]"); await c.waitForTimeout(600);
  await shot(c, "8-report");
  await c.emulateMedia({ media: "print" }); await c.evaluate(() => document.body.classList.add("print-report")); await c.waitForTimeout(300);
  await shot(c, "9-report-print");
  // ---- student sees the cheikh's work; framed print of a surah ----
  await p.evaluate(() => { location.hash = "#progress"; }); await p.waitForTimeout(1500);
  await shot(p, "10-progress");
  await p.evaluate(() => { localStorage.setItem("itqan:surah", "92"); location.hash = "#mushaf"; }); await p.waitForTimeout(1500);
  await p.emulateMedia({ media: "print" }); await p.waitForTimeout(300);
  await shot(p, "11-print-mushaf");
  console.log("errors:", errors);
  await b.close();
})();
