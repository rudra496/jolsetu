// JolSetu app — wires core.js logic to the UI. All heavy data is real (see /about).
import {
  BD_STANDARD, WHO_GUIDELINE, haversine, bearing, nearestSafeWells,
  readStrip, verdict, riskProbability, prioritySites,
  wellCode, verifyWellCode, geofenceVerdict, CHART,
} from "./core.js";
import { setLang, getLang, t, num, speak } from "./i18n.js";

const SECRET = "jolsetu-demo-2026"; // demo signing key; production keys live server-side
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// ---------- data ----------
const wells = WELLS.map((r) => ({
  id: r[0], lat: r[1], lon: r[2], as: r[3], dep: r[4], union: r[5], village: r[6], yr: r[7],
}));
const unsafeCount = wells.filter((w) => w.as >= BD_STANDARD).length;

// ---------- i18n render ----------
let voiceOn = localStorage.getItem("jolsetu_voice") === "1";

function renderStaticText() {
  document.body.lang = getLang();
  $("#brandName").textContent = t("brand");
  $("#brandTag").textContent = t("tagline");
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $("#voiceLabel").textContent = t(voiceOn ? "voice_on" : "voice_off");
  $("#heroQuote").textContent = t("hero_quote");
  $("#deepLabel").textContent = getLang() === "bn"
    ? "শুধু গভীর কুয়া (১৫০ ফুট+)" : "Deep wells only (≥150 ft)";
  $("#pilotTitle").textContent = getLang() === "bn"
    ? "পাইলট: আড়াইহাজার, নারায়ণগঞ্জ — প্রকৃত তথ্যে নির্মিত"
    : "Pilot: Araihazar, Narayanganj — built on real data";
  $("#pilotBody").textContent = getLang() === "bn"
    ? `এই অ্যাপের প্রতিটি কুয়া প্রকৃত পরিমাপ — কলাম্বিয়া বিশ্ববিদ্যালয়ের আড়াইহাজার জরিপের ${num(wells.length)}টি নলকূপ (HydroShare DOI 10.4211/hs.8e1373d87419447c945625af13f0a2ea)। এর মধ্যে ${num(unsafeCount)}টি অর্থাৎ ${num(Math.round((unsafeCount / wells.length) * 100))}% জাতীয় মানের চেয়ে বেশি আর্সেনিকযুক্ত। ডেমো মডেল ও কিট-তুলনা — সবই এই বাস্তব তথ্য থেকে গণনাকৃত।`
    : `Every well in this app is a real measurement — ${num(wells.length)} tubewells from Columbia University's Araihazar survey (HydroShare DOI 10.4211/hs.8e1373d87419447c945625af13f0a2ea). ${num(unsafeCount)} of them (${num(Math.round((unsafeCount / wells.length) * 100))}%) exceed the national standard. The demo model and the kit-accuracy table are both computed from this real dataset.`;
  $("#footLine").textContent = getLang() === "bn"
    ? "জলসেতু — Xylem Global Student Innovation Challenge 2026 · পানির গুণমান বিভাগ · প্রোটোটাইপ"
    : "JolSetu — Xylem Global Student Innovation Challenge 2026 · Water Quality · prototype";
}

function nav() {
  const pages = [
    ["home", "nav_home"], ["map", "nav_map"], ["test", "nav_test"],
    ["checkin", "nav_checkin"], ["predict", "nav_predict"],
    ["school", "nav_school"], ["dash", "nav_dash"], ["about", "nav_about"],
  ];
  $("#tabs").innerHTML = pages.map(([id, key]) =>
    `<button data-page="${id}" class="${id === "home" ? "active" : ""}">${t(key)}</button>`).join("");
  $$("#tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.page)));
}

function show(id) {
  $$(".page").forEach((p) => { p.hidden = p.id !== "page-" + id; });
  $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.page === id));
  window.scrollTo({ top: 0 });
  if (id === "map" && !map) initMap();
  if (id === "predict") lazyPredict();
  if (id === "dash") renderDash();
  if (id === "checkin") renderLedger();
}

$("#langBtn").addEventListener("click", () => {
  setLang(getLang() === "en" ? "bn" : "en");
  renderStaticText(); nav();
});
$("#voiceBtn").addEventListener("click", () => {
  voiceOn = !voiceOn;
  localStorage.setItem("jolsetu_voice", voiceOn ? "1" : "0");
  renderStaticText();
});

// ---------- HOME ----------
function renderHome() {
  const pct = Math.round((unsafeCount / wells.length) * 100);
  $("#stat1").textContent = getLang() === "bn" ? "২ কোটি" : "20M";
  $("#stat2").textContent = getLang() === "bn" ? "৪.৫ কোটি" : "45M";
  $("#stat3").textContent = getLang() === "bn" ? "২৪,০০০+" : "24,000+";
}

// ---------- MAP ----------
let map = null, markerLayer = null, routeLayer = null, deepOnlyCb = null;

function wellColor(as) { return as >= BD_STANDARD ? "#e76f51" : "#2a9d8f"; }

function initMap() {
  map = L.map("map", { preferCanvas: true }).setView([23.795, 90.645], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  drawWells();
  $("#deepOnly").addEventListener("change", drawWells);
  $("#routeBtn").addEventListener("click", () => routeMe(true));
  $("#routeDemoBtn").addEventListener("click", () => routeMe(false));
}

function drawWells() {
  markerLayer.clearLayers();
  const deep = $("#deepOnly").checked;
  const shown = deep ? wells.filter((w) => w.dep >= 150) : wells;
  for (const w of shown) {
    L.circleMarker([w.lat, w.lon], {
      radius: 3.5, weight: 0.5, color: "#ffffff44",
      fillColor: wellColor(w.as), fillOpacity: 0.85,
    }).bindPopup(wellPopup(w)).addTo(markerLayer);
  }
}

function wellPopup(w) {
  const safe = w.as < BD_STANDARD;
  return `
    <b>${w.village}</b>, ${w.union}<br>
    ${getLang() === "bn" ? "আর্সেনিক" : "Arsenic"}: <b style="color:${wellColor(w.as)}">${w.as} µg/L</b><br>
    ${getLang() === "bn" ? "গভীরতা" : "Depth"}: ${w.dep > 0 ? w.dep + " ft" : "—"}<br>
    ${getLang() === "bn" ? "স্থাপন" : "Installed"}: ${w.yr || "—"}<br>
    <b>${safe ? t("map_safe") : t("map_unsafe")}</b>`;
}

function routeMe(useGeo) {
  const setTarget = (lat, lon) => {
    const near = nearestSafeWells(wells, lat, lon, 3);
    routeLayer.clearLayers();
    L.marker([lat, lon], {
      opacity: 0.95,
      icon: L.divIcon({
        className: "you-marker",
        html: '<div class="you-dot"></div>',
        iconSize: [18, 18], iconAnchor: [9, 9],
      }),
    }).addTo(routeLayer)
      .bindTooltip(getLang() === "bn" ? "আপনি" : "You");
    const list = near.map((w, i) => {
      const dir = bearing(lat, lon, w.lat, w.lon);
      const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(dir / 45) % 8];
      L.polyline([[lat, lon], [w.lat, w.lon]], { color: "#01baef", dashArray: "6 6", weight: 2 })
        .addTo(routeLayer);
      L.circleMarker([w.lat, w.lon], {
        radius: 7, color: "#fff", weight: 2, fillColor: "#2a9d8f", fillOpacity: 1,
      }).addTo(routeLayer).bindPopup(wellPopup(w));
      return `<li><b>#${i + 1}</b> ${w.village} (${w.union}) — ${num(Math.round(w.dist))} m · ${compass} · ${num(w.walkMin)} min · ${w.as} µg/L</li>`;
    }).join("");
    $("#routeOut").innerHTML = `<div class="card"><h3>${t("btn_route")}</h3><ol>${list}</ol>
      <p class="hint-line">${getLang() === "bn" ? "অফলাইন মোডে দূরত্ব ও দিক কাজ করে; রাস্তার নির্দেশ উৎপাদন সংস্করণে আসবে।" : "Distance + direction work offline; turn-by-turn roads come in the production version."}</p></div>`;
    if (near[0]) map.fitBounds([[lat, lon], [near[0].lat, near[0].lon]], { padding: [30, 30] });
  };
  if (!useGeo) return setTarget(23.8021, 90.6402);
  if (!navigator.geolocation) return setTarget(23.8021, 90.6402);
  navigator.geolocation.getCurrentPosition(
    (p) => setTarget(p.coords.latitude, p.coords.longitude),
    () => setTarget(23.8021, 90.6402), { timeout: 8000 });
}

// ---------- TEST KIT READER ----------
const cv = $("#readerCanvas"), ctx = cv.getContext("2d");
let readerState = "idle"; // idle -> picked-white -> picked-pad
let picks = {};

function drawScene(padRGB, label) {
  ctx.fillStyle = "#10242c"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = "#f4f4f2"; ctx.fillRect(60, 90, 90, 220); // white strip (reference)
  const chart = CHART;
  chart.forEach((c, i) => {
    const x = 180 + i * 62;
    ctx.fillStyle = `rgb(${c.rgb.join(",")})`;
    ctx.fillRect(x, 120, 52, 52);
    ctx.fillStyle = "#dfe9ee"; ctx.font = "13px sans-serif";
    ctx.fillText(c.ppb + (i === chart.length - 1 ? "+" : ""), x + 14, 190);
  });
  ctx.fillStyle = `rgb(${padRGB.join(",")})`;
  ctx.beginPath(); ctx.arc(420, 300, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffffff88"; ctx.stroke();
  ctx.fillStyle = "#9fc3d2"; ctx.font = "14px sans-serif";
  ctx.fillText(label, 60, 60);
  ctx.fillText(getLang() === "bn" ? "১) সাদা দাগে চাপ দিন  ২) প্যাডে চাপ দিন" : "1) tap the white strip  2) tap the pad", 60, 80);
}

function demoPad(ppb) {
  const nearest = CHART.reduce((a, c) => (Math.abs(c.ppb - ppb) < Math.abs(a.ppb - ppb) ? c : a));
  const lo = CHART[Math.max(0, CHART.indexOf(nearest) - 1)];
  const hi = CHART[Math.min(CHART.length - 1, CHART.indexOf(nearest) + 1)];
  const span = hi.ppb - lo.ppb || 1;
  const f = Math.min(1, Math.max(0, (ppb - lo.ppb) / span));
  const rgb = lo.rgb.map((v, i) => Math.round(v + (hi.rgb[i] - v) * f));
  const jitter = rgb.map((v) => Math.max(0, Math.min(255, v + Math.round((Math.random() - 0.5) * 10))));
  drawScene(jitter, `DEMO — target ${ppb} µg/L`);
  return jitter;
}

function readFromPicks() {
  const white = picks.white, pad = picks.pad;
  const res = readStrip(pad, white);
  const v = verdict(res.ppb);
  const cls = v.level === "safe" ? "safe" : v.level;
  const bar = `<div class="conf-bar"><div class="conf-fill" style="width:${Math.round(res.confidence * 100)}%"></div></div>`;
  $("#readerResult").innerHTML = `
    <div class="ppb-big">${res.ppb} µg/L</div>
    <div class="verdict ${cls}">${res.ppb >= BD_STANDARD ? t("test_unsafe") : res.ppb >= WHO_GUIDELINE ? t("test_caution") : t("test_safe")}</div>
    <p class="hint-line">${t("test_conf")}: ${Math.round(res.confidence * 100)}% · ${getLang() === "bn" ? "কাছের চার্ট রঙ" : "nearest chart color"}: ${res.nearest.ppb} µg/L</p>
    ${bar}
    <p class="hint-line">${getLang() === "bn" ? "রিডিংটি লাইভ ম্যাপে চেক-ইন করে যাচাই করুন।" : "Now check it in on the Live Map to verify the well."}</p>`;
  if (voiceOn) {
    speak(getLang() === "bn"
      ? `পাঠ: ${res.ppb} মাইক্রোগ্রাম প্রতি লিটার। ${res.ppb >= BD_STANDARD ? "অনিরাপদ। নিরাপদ কুয়ায় যান।" : "নিরাপদ।"}`
      : `Reading ${res.ppb} micrograms per liter. ${res.ppb >= BD_STANDARD ? "Unsafe. Switch to a safe well." : "Safe."}`);
  }
}

function canvasPick(evt) {
  const rect = cv.getBoundingClientRect();
  const x = ((evt.clientX - rect.left) / rect.width) * cv.width;
  const y = ((evt.clientY - rect.top) / rect.height) * cv.height;
  const px = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  const rgb = [px[0], px[1], px[2]];
  if (readerState === "idle") {
    picks.white = rgb; readerState = "white";
    $("#readerHint").textContent = getLang() === "bn" ? "এখন প্যাডে চাপ দিন" : "Now tap the pad";
  } else {
    picks.pad = rgb; readerState = "idle";
    $("#readerHint").textContent = "";
    readFromPicks();
  }
}
cv.addEventListener("click", canvasPick);

$$("[data-pad]").forEach((b) => b.addEventListener("click", () => {
  const pad = demoPad(Number(b.dataset.pad)); // draws the scene and returns the pad color
  readerState = "idle";
  picks = { white: [244, 244, 242], pad };
  readFromPicks();
}));

$("#padFile").addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    readerState = "idle";
    $("#readerHint").textContent = getLang() === "bn"
      ? "ছবিতে: ১) সাদা অংশে চাপ দিন ২) প্যাডে চাপ দিন"
      : "On the photo: 1) tap a white area 2) tap the pad";
  };
  img.src = URL.createObjectURL(f);
});

// initial canvas
drawScene([230, 170, 40], "JolSetu " + (getLang() === "bn" ? "কিট রিডার" : "kit reader"));

// ---------- CHECK-IN ----------
// Raw CSV order is sorted by As, so step-sample to cover the full range in the picker.
const sampleWells = wells.filter((_, i) => i % 22 === 0).slice(0, 300);
function fillWellPicker() {
  const opts = sampleWells.map((w) =>
    `<option value="${w.id}">#${w.id} — ${w.village} (${w.union}) · ${w.as} µg/L</option>`).join("");
  $("#wellPick").innerHTML = opts;
}

function ledger() { try { return JSON.parse(localStorage.getItem("jolsetu_ledger") || "[]"); } catch { return []; } }
function saveLedger(l) { localStorage.setItem("jolsetu_ledger", JSON.stringify(l.slice(-50))); }

async function doCheckIn(honest) {
  const id = Number($("#wellPick").value);
  const w = wells.find((x) => x.id === id);
  if (!w) return;
  const code = await wellCode(SECRET, id);
  const ok = await verifyWellCode(SECRET, code);
  const lat = honest ? w.lat : w.lat + 0.0045; // ~500 m north
  const lon = honest ? w.lon : w.lon + 0.0045;
  const dist = haversine(lat, lon, w.lat, w.lon);
  const g = geofenceVerdict(dist, 30);
  const sameDayDup = ledger().some((r) => r.well === id && new Date(r.ts).toDateString() === new Date().toDateString());
  const flagged = g.verdict !== "pass" || sameDayDup;
  const entry = {
    ts: Date.now(), well: id, dist: Math.round(dist), code,
    verdict: g.verdict === "pass" && sameDayDup ? "flagged" : g.verdict,
    flag: [g.flag, sameDayDup ? "duplicate-day" : ""].filter(Boolean).join(","),
    sigOk: ok.ok,
  };
  const all = ledger(); all.push(entry); saveLedger(all);
  const msg = entry.verdict === "pass" ? t("ci_pass") : entry.verdict === "flagged" ? t("ci_flag") : t("ci_reject");
  $("#ciResult").innerHTML = `
    <div class="verdict ${entry.verdict === "pass" ? "safe" : entry.verdict === "flagged" ? "caution" : "unsafe"}">${msg}</div>
    <p class="hint-line">${getLang() === "bn" ? "কোড" : "Code"}: <code>${code}</code> ·
      ${getLang() === "bn" ? "দূরত্ব" : "distance"}: ${num(entry.dist)} m ·
      ${getLang() === "bn" ? "স্বাক্ষর" : "signature"}: ${entry.sigOk ? "OK" : "FAIL"}
      ${entry.flag ? " · " + entry.flag : ""}</p>`;
  renderLedger();
  if (voiceOn) speak(msg);
}

function renderLedger() {
  const rows = ledger().slice().reverse().map((r, i) => `
    <tr><td>${i + 1}</td><td>${new Date(r.ts).toLocaleTimeString()}</td><td>#${r.well}</td>
    <td>${r.dist} m</td>
    <td><span class="status-pill status-${r.verdict}">${r.verdict}</span></td></tr>`).join("");
  $("#ledgerTbl tbody").innerHTML = rows;
}
$("#honestBtn").addEventListener("click", () => doCheckIn(true));
$("#cheatBtn").addEventListener("click", () => doCheckIn(false));

// ---------- PREDICT ----------
let predicted = false;
function lazyPredict() {
  renderModelCard();
  renderDepthBars();
  if (predicted) return;
  predicted = true;
  setTimeout(() => {
    const sites = prioritySites(wells, MODEL, { s: 23.76, n: 23.86, w: 90.60, e: 90.72 }, 0.02);
    $("#prList").innerHTML = sites.map((s, i) => `
      <li>lat ${s.lat.toFixed(3)}, lon ${s.lon.toFixed(3)} —
        ${getLang() === "bn" ? "দ্বিমত" : "model-vs-map gap"}: <b>${(s.gap * 100).toFixed(0)}%</b>
        (${num(s.localN)} ${getLang() === "bn" ? "কুয়া কাছে" : "wells nearby"})</li>`).join("");
  }, 30);
}

function renderModelCard() {
  const m = MODEL;
  $("#modelCard").innerHTML = `
    <table>
      <tr><td>${getLang() === "bn" ? "লক্ষ্য" : "Target"}</td><td><b>${m.target}</b></td></tr>
      <tr><td>${getLang() === "bn" ? "প্রশিক্ষণ" : "Trained on"}</td><td>${m.trained_on}</td></tr>
      <tr><td>${getLang() === "bn" ? "পরীক্ষা" : "Held-out test"}</td><td>${m.tested_on}</td></tr>
      <tr><td>AUC / ${getLang() === "bn" ? "নির্ভুলতা" : "accuracy"}</td><td><b>${m.auc_test} / ${m.acc_test_pct}%</b> (${getLang() === "bn" ? "ভিত্তিরেখা" : "baseline"} ${m.acc_baseline_pct}%)</td></tr>
      <tr><td>${getLang() === "bn" ? "বৈশিষ্ট্য" : "Features"}</td><td>lat, lon, lat², lon², lat·lon, depth, has-depth</td></tr>
    </table>
    <p class="hint-line">${m.disclosure}</p>`;
}

function renderDepthBars() {
  const rows = KIT.stats.depth_prior.map((d) => {
    const pct = getLang() === "bn" ? String(d.p50).replace(/[0-9]/g, (x) => "০১২৩৪৫৬৭৮৯"[x]) : d.p50;
    return `<div class="bar-row"><span>${d.lo}–${d.hi} ft</span>
      <div class="bar-track"><div class="bar-fill ${d.p50 < 30 ? "good" : ""}" style="width:${d.p50}%"></div></div>
      <span>${pct}%</span></div>`;
  }).join("");
  $("#depthBars").innerHTML = rows;
}

// ---------- SCHOOL (seeded demo) ----------
function renderSchool() {
  const clubs = [
    ["Araihazar High School Eco Club", 412, ["Tester ×30", "Deep-well advocate"]],
    ["Duptara Girls' Guide Unit", 388, ["Tester ×25", "Map hero"]],
    ["Bazra Science Club", 341, ["Tester ×18"]],
    ["Kanchpur Water Rangers", 277, ["Tester ×12"]],
    ["Sanarpar Green Club", 205, ["Rookie tester"]],
  ];
  $("#clubTbl tbody").innerHTML = clubs.map((c, i) => `
    <tr><td>${i + 1}</td><td>${c[0]}</td><td><b>${num(c[1])}</b></td><td>${c[2].join(" · ")}</td></tr>`).join("");
}

// ---------- DASHBOARD ----------
function renderDash() {
  const pct = ((unsafeCount / wells.length) * 100).toFixed(1);
  const deep = wells.filter((w) => w.dep >= 150);
  const deepUnsafe = deep.filter((w) => w.as >= BD_STANDARD).length;
  const kpis = [
    [num(wells.length), t("da_wells")],
    [num(pct) + "%", t("da_unsafe")],
    [num(deep.length ? ((deepUnsafe / deep.length) * 100).toFixed(1) : 0) + "%",
      getLang() === "bn" ? "গভীর কুয়া অনিরাপদ" : "deep wells unsafe (≥150 ft)"],
  ];
  $("#kpiRow").innerHTML = kpis.map(([n, d]) =>
    `<div class="card kpi"><div class="n">${n}</div><div class="d">${d}</div></div>`).join("");

  const unions = {};
  for (const w of wells) {
    unions[w.union] = unions[w.union] || [0, 0];
    unions[w.union][0]++; if (w.as >= BD_STANDARD) unions[w.union][1]++;
  }
  const rows = Object.entries(unions).sort((a, b) => b[1][1] / b[1][0] - a[1][1] / a[1][0]).map(([u, [n, bad]]) => {
    const p = (bad / n) * 100;
    return `<div class="bar-row"><span>${u}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${p.toFixed(0)}%"></div></div>
      <span>${p.toFixed(0)}%</span></div>`;
  }).join("");
  $("#unionTitle").textContent = getLang() === "bn" ? "ইউনিয়নভিত্তিক অনিরাপদ অনুপাত" : "Unsafe share by union";
  $("#unionBars").innerHTML = rows;

  const slider = $("#costSlider");
  const upd = () => {
    const people = Number(slider.value);
    const total = people * 11;
    $("#costPeople").textContent = num(people);
    $("#costTotal").textContent = "$" + num(total);
  };
  slider.removeEventListener("input", upd);
  slider.addEventListener("input", upd);
  upd();
}

// ---------- ABOUT ----------
function renderAbout() {
  const en = getLang() === "en";
  $("#aboutEvidence").innerHTML = `<h3>${en ? "Evidence" : "প্রমাণ"}</h3>
    <ol>
      <li>Smith AH, Lingas EO, Rahman M. Contamination of drinking-water by arsenic in Bangladesh: a public health emergency. <em>Bull WHO</em> 2000;78(9):1093–103. (PMID 11019458)</li>
      <li>Flanagan SV, Johnston RB, Zheng Y. Arsenic in tube well water in Bangladesh: health and economic impacts and implications for arsenic mitigation. <em>Bull WHO</em> 2012;90(11):839–46. doi:10.2471/BLT.11.101253 — 20M >50 µg/L; 45M >10 µg/L; 24,000 (+up to 19,000) adult deaths/yr; US$13B over 20 yrs; US$11 per capita.</li>
      <li>Haque et al. Quantitative drinking water arsenic concentrations in field environments using mobile phone photometry of field kits. <em>Sci Total Environ</em> 2018. doi:10.1016/j.scitotenv.2016.12.123</li>
      <li>Reddy et al. Evaluation of arsenic field test kits for drinking water. <em>Water Research</em> 2020. doi:10.1016/j.watres.2019.115325</li>
      <li>Podgorski J, Berg M. Global threat of arsenic in groundwater. <em>Science</em> 2020;368:845–50. doi:10.1126/science.aba1510</li>
      <li>Jamil NB, Feng H, Ahmed KM, et al. Effectiveness of Different Approaches to Arsenic Mitigation over 18 Years in Araihazar, Bangladesh. <em>Environ Sci Technol</em> 2019;53:5596–604. doi:10.1021/acs.est.9b01375</li>
      <li>Van Geen A. et al. Groundwater arsenic measurements from Araihazar, Bangladesh. CUAHSI HydroShare, 2021. doi:10.4211/hs.8e1373d87419447c945625af13f0a2ea — this app's ${num(wells.length)} wells.</li>
    </ol>`;
  $("#aboutLimitations").innerHTML = `<h3>${en ? "Honest limitations" : "সৎ সীমাবদ্ধতা"}</h3>
    <ul>
      <li>${en ? "Demo model is logistic (AUC 0.67, one upazila). Production target: gradient-boosted national model (Podgorski & Berg approach) updated live by verified crowd tests."
    : "ডেমো মডেল লজিস্টিক (এইউসি ০.৬৭, এক উপজেলা)। উৎপাদন লক্ষ্য: গ্রেডিয়েন্ট-বুস্টেড জাতীয় মডেল, যাচাইকৃত ক্রাউড পরীক্ষায় লাইভ আপডেট।"}</li>
      <li>${en ? "Demo pad colors approximate the standard Gutzeit chart; production needs per-batch scanned calibration." : "ডেমো প্যাডের রঙ আনুমানিক; উৎপাদনে প্রতি-ব্যাচ ক্যালিব্রেশন লাগবে।"}</li>
      <li>${en ? "Ledger is local (localStorage) for the demo; production uses a server with officer review (architecture ready — the RippleUp-style geofence is fully wired)." : "ডেমো খাতা লোকাল; উৎপাদনে সার্ভার + অফিসার রিভিউ (স্থাপত্য প্রস্তুত)।"}</li>
    </ul>`;
  $("#aboutRoadmap").innerHTML = `<h3>${en ? "8-week plan" : "৮ সপ্তাহের পরিকল্পনা"}</h3>
    <ul>
      <li><b>W1–2</b> ${en ? "Bamail pilot: 2 schools, 50 kits, per-batch chart calibration" : "বামাইল পাইলট: ২ স্কুল, ৫০ কিট, ব্যাচ ক্যালিব্রেশন"}</li>
      <li><b>W3–4</b> ${en ? "Server ledger + officer review; national risk model v1" : "সার্ভার খাতা + অফিসার রিভিউ; জাতীয় মডেল v১"}</li>
      <li><b>W5–6</b> ${en ? "DPHE + NGO partnerships; SMS fallback for feature phones" : "ডিপিএইচই + এনজিও সহযোগিতা; ফিচার-ফোনের জন্য এসএমএস"}</li>
      <li><b>W7–8</b> ${en ? "Impact audit: wells switched, exposure avoided" : "প্রভাব নিরীক্ষা: স্যুইচ হওয়া কুয়া, এড়ানো এক্সপোজার"}</li>
    </ul>`;
}

// ---------- boot ----------
renderStaticText();
nav();
renderHome();
fillWellPicker();
renderSchool();
renderLedger();
$("#readerHint").textContent = "";
window.addEventListener("online", () => {});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
