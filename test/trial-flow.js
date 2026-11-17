// Password-free sign-in of the trial (school kept on the device): cd site && python3 -m http.server 8765 &  then  node test/trial-flow.js
const {chromium}=require("playwright");(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:900}});
const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem("itqan:tour:student","1");localStorage.setItem("itqan:tour:cheikh","1")});
await p.goto("http://localhost:8765/#home");await p.waitForTimeout(2500);
console.log("header:",(await p.textContent("#acct")).trim());
await p.click("#acct a");await p.waitForTimeout(800);await p.screenshot({path:"t1-login.png",fullPage:true});
await p.click("#lgT");await p.waitForTimeout(1200);
console.log("cheikh header:",(await p.textContent("#acct")).trim(),"| page:",(await p.textContent("#v-students .page-title")).trim());
await p.click('[data-sv="sessions"]');await p.waitForTimeout(300);await p.click("#nsGo");await p.waitForTimeout(300);
await p.click("#acctOut");await p.waitForTimeout(600);
console.log("after logout:",(await p.textContent("#acct")).trim());
await p.click("#acct a");await p.waitForTimeout(800);
await p.fill("#lgN","سارة التجريبية");await p.click("#lgGo");await p.waitForTimeout(1200);
console.log("student header:",(await p.textContent("#acct")).trim(),"| home:",(await p.textContent("#v-home .page-title")).trim());
await p.click('#v-home .scard[data-s="111"]');await p.waitForTimeout(1200);
await p.click('#v-mushaf #stabs button[data-st="paint"]');await p.waitForTimeout(600);await p.click("#pAyah use[data-c]",{force:true});await p.click("#ptCheck");await p.waitForTimeout(500);
await p.click("#acctOut");await p.waitForTimeout(500);
await p.click("#acct a");await p.waitForTimeout(800);
console.log("existing students:",await p.$$eval("#lgS option",x=>x.map(o=>o.textContent)));
await p.click("#lgT");await p.waitForTimeout(1200);
console.log("overview students:",await p.$$eval("[data-stu]",x=>x.map(o=>o.textContent)));
await p.screenshot({path:"t2-overview.png",fullPage:true});
console.log("errors",errs);await b.close()})()
