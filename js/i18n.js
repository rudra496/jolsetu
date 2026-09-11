// JolSetu i18n — Bangla + English. t(key) resolves from the active dictionary.
const STR = {
  brand: { en: "JolSetu", bn: "জলসেতু" },
  tagline: {
    en: "The people's bridge to safe tubewell water",
    bn: "নিরাপদ নলকূপের পানিতে মানুষের সেতু",
  },
  nav_home: { en: "Home", bn: "হোম" },
  nav_map: { en: "Live Map", bn: "লাইভ ম্যাপ" },
  nav_test: { en: "Test Kit AI", bn: "কিট রিডার" },
  nav_checkin: { en: "Well Check-in", bn: "কুয়া চেক-ইন" },
  nav_predict: { en: "Predict & Prioritize", bn: "পূর্বাভাস" },
  nav_school: { en: "School Program", bn: "স্কুল কর্মসূচি" },
  nav_dash: { en: "Officer Dashboard", bn: "অফিসার ড্যাশবোর্ড" },
  nav_about: { en: "Evidence", bn: "প্রমাণ" },

  hero_stat_20m: { en: "Bangladeshis drink water above the national arsenic standard (50 µg/L)", bn: "বাংলাদেশি মানুষ জাতীয় আর্সেনিক মানের (৫০ মাইক্রোগ্রাম/লিটার) চেয়ে বেশি আসল পানি পান করেন" },
  hero_stat_45m: { en: "drink above the WHO guideline (10 µg/L)", bn: "জিন মানদণ্ডের (১০ মাইক্রোগ্রাম/লিটার) চেয়ে বেশি আসল পানি পান করেন" },
  hero_stat_24k: { en: "adult deaths attributed to arsenic every year", bn: "প্রতি বছর আর্সেনিকজনিত প্রাপ্তবয়স্ক মৃত্যু" },
  hero_quote: { en: "\u201cThe largest poisoning of a population in history.\u201d — WHO Bulletin, 2000", bn: "\u201cইতিহাসের সবচেয়ে বড় জনগোষ্ঠীর বিষক্রিয়া।\u201d — ডব্লিউএইচও বুলেটিন, ২০০০" },

  how1_t: { en: "1 · Read any $1 test kit", bn: "১ · যেকোনো ১ ডলারের কিট পড়ুন" },
  how1_d: { en: "Point your camera at the reaction pad. JolSetu reads the Gutzeit color chart for you — no more guessing by eye.", bn: "বিক্রিয়া প্যাডে ক্যামেরা ধরুন। জলসেতু আপনার জন্য রঙের চার্ট পড়ে — আর চোখে অনুমান নয়।" },
  how2_t: { en: "2 · Stamp the well with QR", bn: "২ · কুয়ায় কিউআর স্ট্যাম্প" },
  how2_d: { en: "Each check-in is signed, GPS-geofenced and fraud-checked, so the live map can be trusted.", bn: "প্রতিটি চেক-ইন স্বাক্ষরিত, জিপিএস-জিওফেন্সযুক্ত ও জালিয়াতি-যাচাইকৃত — তাই লাইভ ম্যাপে ভরসা করা যায়।" },
  how3_t: { en: "3 · Walk to the safe well", bn: "৩ · নিরাপদ কুয়ায় হাঁটুন" },
  how3_d: { en: "Offline, in Bangla, with voice: distance, direction and walking time to the nearest verified safe well.", bn: "অফলাইনে, বাংলায়, ভয়েসসহ: কাছের যাচাইকৃত নিরাপদ কুয়ার দূরত্ব, দিক ও হাঁটার সময়।" },

  map_title: { en: "Live well map — Araihazar pilot", bn: "লাইভ কুয়া ম্যাপ — আড়াইহাজার পাইলট" },
  map_sub: { en: "Every dot is a real measured tubewell. Tap any well for details, or press “Route me” to find safe water nearby.", bn: "প্রতিটি বিন্দু একটি প্রকৃত পরিমাপকৃত নলকূপ। বিবরণের জন্য কুয়ায় চাপ দিন, বা কাছের নিরাপদ পানি খুঁজতে \u201cরুট দিন\u201d চাপুন।" },
  map_safe: { en: "Safe (< 50 µg/L)", bn: "নিরাপদ (৫০ মি.গ্রা/লি.-এর কম)" },
  map_unsafe: { en: "Unsafe (≥ 50 µg/L)", bn: "অনিরাপদ (৫০+ মি.গ্রা/লি.)" },
  btn_route: { en: "Route me to safe water", bn: "নিরাপদ পানিতে রুট দিন" },
  route_here: { en: "Use my location", bn: "আমার অবস্থান ব্যবহার করুন" },
  route_demo: { en: "Demo location", bn: "ডেমো অবস্থান" },

  test_title: { en: "Test Kit AI reader", bn: "কিট রিডার এআই" },
  test_sub: { en: "Photograph the reaction pad next to the white strip. The AI normalizes lighting and matches the standard color chart.", bn: "সাদা দাগের পাশে বিক্রিয়া প্যাডের ছবি তুলুন। এআই আলো ঠিক করে স্ট্যান্ডার্ড রঙের চার্টের সাথে মেলায়।" },
  test_demo_btn: { en: "Try a demo pad", bn: "ডেমো প্যাড দেখুন" },
  test_upload: { en: "Upload pad photo", bn: "প্যাডের ছবি আপলোড" },
  test_result_unknown: { en: "Take a photo or pick a demo pad", bn: "ছবি তুলুন বা ডেমো প্যাড বাছুন" },
  test_conf: { en: "Confidence", bn: "আত্মবিস্তার" },
  test_safe: { en: "SAFE for drinking (Bangladesh standard)", bn: "পান করার জন্য নিরাপদ (জাতীয় মান)" },
  test_caution: { en: "Above WHO guideline — test again / prefer a safer well", bn: "জিন মানদণ্ডের চেয়ে বেশি — আবার পরীক্ষা করুন / নিরাপদ কুয়া বেছে নিন" },
  test_unsafe: { en: "UNSAFE — switch to a verified safe well", bn: "অনিরাপদ — যাচাইকৃত নিরাপদ কুয়ায় যান" },
  test_kitfact: { en: "Why AI reading matters: on 943 real kit-vs-lab comparisons, human chart reading caught 99.3% of unsafe wells but wrongly condemned 37% of safe ones.", bn: "এআই পাঠ কেন জরুরি: ৯৪৩টি প্রকৃত কিট-বনাম-ল্যাব তুলনায় মানুষের চার্ট পাঠ ৯৯.৩% অনিরাপদ কুয়া ধরেছে, কিন্তু ৩৭% নিরাপদ কুয়াকে ভুলভাবে অনিরাপদ বলেছে।" },

  ci_title: { en: "QR well check-in", bn: "কিউআর কুয়া চেক-ইন" },
  ci_sub: { en: "Every submission is HMAC-signed and geofenced. Try an honest check-in and a simulated cheater to see fraud control.", bn: "প্রতিটি জমা HMAC-স্বাক্ষরিত ও জিওফেন্সযুক্ত। সৎ চেক-ইন ও জাল চেক-ইন দুটোই চেষ্টা করে দেখুন।" },
  ci_pick: { en: "Well", bn: "কুয়া" },
  ci_honest: { en: "Check in at well (honest)", bn: "কুয়ায় চেক-ইন (সৎ)" },
  ci_cheat: { en: "Simulate cheater (500 m away)", bn: "জাল চেক-ইন (৫০০ মি. দূরে)" },
  ci_pass: { en: "Verified at well", bn: "কুয়ায় যাচাই হয়েছে" },
  ci_flag: { en: "Flagged — outside geofence", bn: "ফ্ল্যাগ হয়েছে — জিওফেন্সের বাইরে" },
  ci_reject: { en: "Rejected — far outside geofence", bn: "বাতিল — জিওফেন্স থেকে অনেক দূরে" },
  ci_ledger: { en: "Local ledger", bn: "স্থানীয় খাতা" },

  pr_title: { en: "Predict & prioritize", bn: "পূর্বাভাস ও অগ্রাধিকার" },
  pr_sub: { en: "A demo risk model (AUC 0.67 on held-out real wells) finds where the map and the model disagree — the crowd tests there next. That is the learning loop.", bn: "একটি ডেমো রিস্ক মডেল (বাস্তব কুয়ায় এইউসি ০.৬৭) খুঁজে দেখে ম্যাপ ও মডেল কোথায় দ্বিমত করে — সেখানেই পরবর্তী পরীক্ষা। এটাই শেখার লুপ।" },
  pr_model: { en: "Model card", bn: "মডেল কার্ড" },
  pr_top: { en: "Top sites to test next", bn: "পরবর্তী পরীক্ষার শীর্ষ স্থান" },
  pr_depth: { en: "Depth lesson from real data", bn: "বাস্তব তথ্যের গভীরতা-শিক্ষা" },
  pr_depth_note: { en: "Unsafe share by depth band (real wells): the 50–100 ft aquifer is the danger zone; deeper wells are far safer. JolSetu tells families this before they drill.", bn: "গভীরতা অনুযায়ী অনিরাপদ অনুপাত (প্রকৃত কুয়া): ৫০–১০০ ফুট জলস্তরই বিপদ; গভীর কুয়া অনেক নিরাপদ। কুয়া খোঁড়ানোর আগেই জলসেতু পরিবারকে এটা জানায়।" },

  sc_title: { en: "Adopt-a-Well school program", bn: "কুয়া দত্তক স্কুল কর্মসূচি" },
  sc_sub: { en: "Clubs adopt wells, test them monthly, and earn verified points. (Seeded demo data.)", bn: "ক্লাবগুলো কুয়া দত্তক নেয়, মাসে পরীক্ষা করে এবং যাচাইকৃত পয়েন্ট পায়। (ডেমো তথ্য।)" },
  sc_club: { en: "Club", bn: "ক্লাব" },
  sc_pts: { en: "Points", bn: "পয়েন্ট" },
  sc_badges: { en: "Badges", bn: "ব্যাজ" },

  da_title: { en: "Officer dashboard (DPHE view)", bn: "অফিসার ড্যাশবোর্ড (ডিপিএইচই ভিউ)" },
  da_sub: { en: "Where to spend the next testing taka — union by union, from real measurements.", bn: "পরবর্তী পরীক্ষার টাকা কোথায় খরচ হবে — ইউনিয়ন ধরে ধরে, প্রকৃত পরিমাপ থেকে।" },
  da_wells: { en: "wells in pilot", bn: "কুয়া পাইলটে" },
  da_unsafe: { en: "unsafe (≥50 µg/L)", bn: "অনিরাপদ (৫০+ মি.গ্রা/লি.)" },
  da_cost: { en: "Safe-water switch costs ≈ $11 per person (UNICEF 2006–11 program). Scale the pilot:", bn: "নিরাপদ পানিতে স্যুইচের খরচ ≈ ১১ ডলার/জন (ইউনিসেফ ২০০৬-১১)। পাইলট স্কেল করুন:" },
  da_people: { en: "people", bn: "মানুষ" },

  ab_title: { en: "Evidence & transparency", bn: "প্রমাণ ও স্বচ্ছতা" },
  voice_on: { en: "Voice: on", bn: "ভয়েস: চালু" },
  voice_off: { en: "Voice: off", bn: "ভয়েস: বন্ধ" },
};

const BN_DIGITS = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };

let lang = localStorage.getItem("jolsetu_lang") || "en";

export function setLang(l) {
  lang = l === "bn" ? "bn" : "en";
  localStorage.setItem("jolsetu_lang", lang);
}
export function getLang() {
  return lang;
}
export function t(key) {
  const row = STR[key];
  return row ? row[lang] || row.en : key;
}
export function toBn(numStr) {
  return String(numStr).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
}
export function num(n) {
  const s = Number(n).toLocaleString("en-US");
  return lang === "bn" ? toBn(s) : s;
}
export function speak(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "bn" ? "bn-BD" : "en-US";
    u.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) { /* voice is best-effort */ }
}
