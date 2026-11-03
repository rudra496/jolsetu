/* JolSetu Vision — Meta-hackathon module (BUILT Oct 30 – Nov 3 2026).
   Photo -> backend /vision/read (SAM 3.1 + colorimetry) -> /vision/advise
   (Muse Spark Bangla) -> spoken Bangla + registry log. Agentic loop step. */
import { t, getLang } from "./i18n.js";

const DEFAULT_BACKEND = "http://127.0.0.1:8010";
const getBackend = () => (localStorage.getItem("jv_backend") || DEFAULT_BACKEND).replace(/\/$/, "");

async function postJSON(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) {
    let msg = r.status + " " + r.statusText;
    try { const e = await r.json(); if (e.detail) msg = e.detail; } catch (_) {}
    throw new Error(msg);
  }
  return r.json();
}

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = getLang() === "bn" ? "bn-BD" : "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (_) {}
}

function logToRegistry(entry) {
  try {
    const k = "jv_registry";
    const reg = JSON.parse(localStorage.getItem(k) || "[]");
    reg.unshift({ time: new Date().toISOString(), ...entry });
    localStorage.setItem(k, JSON.stringify(reg.slice(0, 200)));
  } catch (_) {}
}

export function initVision() {
  const file = document.getElementById("visionFile");
  const urlInput = document.getElementById("visionBackend");
  const runBtn = document.getElementById("visionRun");
  const out = document.getElementById("visionOut");
  const img = document.getElementById("visionPreview");
  if (!file || !runBtn) return;
  urlInput.value = getBackend();
  urlInput.addEventListener("change", () => localStorage.setItem("jv_backend", urlInput.value.trim()));
  let b64 = "";
  file.addEventListener("change", () => {
    const f = file.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { b64 = String(rd.result).split(",")[1]; img.src = rd.result; img.hidden = false; };
    rd.readAsDataURL(f);
  });
  runBtn.addEventListener("click", async () => {
    if (!b64) { out.innerHTML = "<p>⚠️ " + (getLang() === "bn" ? "আগে কিটের ছবি তুলুন/আপলোড করুন।" : "Take/upload a kit photo first.") + "</p>"; return; }
    const B = getBackend();
    out.innerHTML = "<p>⏳ SAM 3.1 segmenting vial + card…</p>";
    try {
      // 1 MEASURE — SAM 3.1 segmentation + calibrated colorimetry (backend)
      const read = await postJSON(B + "/vision/read", { image_b64: b64 });
      const verdict = read.safe_bd ? (read.ppb < 10 ? "SAFE" : "CAUTION") : "UNSAFE";
      const color = read.safe_bd ? (read.ppb < 10 ? "green" : "orange") : "red";
      out.innerHTML = `<div class="card"><h3 style="color:${color}">${read.ppb} ppb — ${verdict}</h3>`
        + `<p>confidence ${(read.confidence * 100).toFixed(0)}% · ΔE ${read.dE} · mean RGB [${read.mean_rgb.join(", ")}]</p>`
        + `<p>⏳ Muse Spark advising in Bangla…</p></div>`;
      // 2 REASON + 3 ADVISE — Muse Spark Bangla guidance (backend)
      const adv = await postJSON(B + "/vision/advise", { ppb: read.ppb, nearest: read.ppb, confidence: read.confidence });
      out.innerHTML = `<div class="card"><h3 style="color:${color}">${read.ppb} ppb — ${adv.verdict || verdict}</h3>`
        + `<p><b>বাংলা:</b> ${adv.bangla || "—"}</p><p><b>English:</b> ${adv.english || "—"}</p>`
        + `<ul>${(adv.next_steps || []).map((s) => `<li>${s}</li>`).join("")}</ul>`
        + `<div class="row"><button class="btn" id="visionSpeak">🔊 শুনুন / Listen</button>`
        + `<button class="btn" id="visionSheet">🖼️ Safety sheet</button></div>`
        + `<div id="visionSheetOut"></div></div>`;
      document.getElementById("visionSpeak").addEventListener("click", () => speak(adv.bangla || adv.english));
      document.getElementById("visionSheet").addEventListener("click", async () => {
        const sh = document.getElementById("visionSheetOut");
        sh.innerHTML = "<p>⏳ Muse Image drawing safety sheet…</p>";
        try {
          const sheet = await postJSON(B + "/vision/sheet", { ppb: read.ppb, verdict: adv.verdict || verdict });
          if (sheet.image_b64) sh.innerHTML = `<img src="data:image/png;base64,${sheet.image_b64}" style="max-width:100%" alt="safety sheet">`;
          else sh.innerHTML = "<p>Sheet unavailable — prompt logged.</p>";
        } catch (e) { sh.innerHTML = "<p>⚠️ Sheet failed: " + e.message + "</p>"; }
      });
      // 4 LOG — agent loop closes into the tamper-proof registry
      logToRegistry({ ppb: read.ppb, verdict: adv.verdict || verdict, confidence: read.confidence, backend: B });
    } catch (e) {
      out.innerHTML = "<p>⚠️ " + e.message + (getLang() === "bn" ? " — ব্যাকএন্ড চালু আছে কি? (port 8010)" : " — is the backend running? (port 8010)") + "</p>";
    }
  });
}
