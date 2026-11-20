// Builds the Khmer site (/km/) from the English pages in _site, using the translations in i18n/km.csv.
// Runs after Eleventy (npm run build). Texts are found the same way tools/translation_export.py
// finds them, so each translated row lands back where its English came from. A text with no
// Khmer yet stays in English and is listed at the end of the run.
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = path.join(ROOT, "_site");
const OUT = path.join(SITE, "km");
const SITE_URL = "https://iihec.org";
const REPORT = process.argv.includes("--report");

// Same element groups as tools/translation_export.py
const TEXT_LEVEL = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "dt", "dd", "label", "button", "a",
  "option", "summary", "figcaption", "blockquote", "span", "strong", "em", "small", "legend", "caption"]);
const STRUCTURE = new Set(["div", "section", "article", "aside", "header", "footer", "nav", "main", "form", "fieldset",
  "ul", "ol", "dl", "table", "thead", "tbody", "tfoot", "tr", "p", "li", "td", "th", "dt", "dd",
  "h1", "h2", "h3", "h4", "h5", "h6", "label", "button", "figure", "figcaption", "blockquote",
  "select", "option", "small", "details", "summary"]);
const SKIP = new Set(["script", "style", "noscript", "svg", "template", "input", "textarea", "img", "br"]);
const ATTRS = ["alt", "placeholder", "aria-label", "title", "data-required", "data-invalid"];

const clean = (s) => s.replace(/\s+/g, " ").trim();

// --- translations -------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const dict = new Map();
for (const [key, en, km] of parseCsv(fs.readFileSync(path.join(ROOT, "i18n/km.csv"), "utf8").replace(/^﻿/, "")).slice(1)) {
  if (key && key.trim() && en && km && km.trim()) dict.set(clean(en), clean(km));
}
const missing = new Map(); // English text -> pages

// --- helpers ------------------------------------------------------------------------------
function textOf($, el) {
  const parts = [];
  (function collect(node) {
    for (const c of node.children || []) {
      if (c.type === "text") parts.push(c.data);
      else if (c.type === "tag" || c.type === "script" || c.type === "style") collect(c);
    }
  })(el);
  return clean(parts.join(" ")).replace(/\s+([.,;:!?])/g, "$1");
}

function hasStructure(el) {
  for (const c of el.children || []) {
    if (c.type !== "tag" && c.type !== "script" && c.type !== "style") continue;
    if (STRUCTURE.has(c.name) || hasStructure(c)) return true;
  }
  return false;
}

const isText = (s) => /[A-Za-z]/.test(s) && !/^(?:[\W\d_]+|EN|KH|\S+@\S+|https?:\/\/\S+|\+?[\d ()-]{7,}|US\$[\d,]+)$/.test(s);

function lookup(en, page) {
  if (!isText(en)) return null;
  const km = dict.get(en);
  if (!km) {
    if (!missing.has(en)) missing.set(en, new Set());
    missing.get(en).add(page);
  }
  return km || null;
}

// Put the Khmer text into a leaf element: keep icons and form controls, drop the English words.
function fillLeaf($, el, km) {
  const $el = $(el);
  if ($el.find(".w").length) { // tagline: one span per word or phrase, lit up on scroll
    $el.html(km.split(" ").map((w) => `<span class="w">${escapeHtml(w)}</span>`).join(" "));
    return;
  }
  // A leaf whose text sits in one inline child (a link or bold text inside a paragraph): keep that child.
  const textKids = (el.children || []).filter((c) => (c.type === "text" && c.data.trim()) || (c.type === "tag" && !SKIP.has(c.name) && clean($(c).text())));
  if (textKids.length === 1 && textKids[0].type === "tag") return fillLeaf($, textKids[0], km);
  // "Label: <a>link</a>" (e.g. "Telegram: Message us"): label before the colon, the rest stays in the link.
  const m = km.match(/^(.*?[:៖])\s*(.+)$/);
  if (m && textKids.length === 2 && textKids[0].type === "text" && /:\s*$/.test(textKids[0].data)
      && textKids[1].type === "tag" && textKids[1].name === "a") {
    textKids[0].data = textKids[0].data.replace(/\S[\s\S]*\S|\S/, m[1]);
    $(textKids[1]).text(m[2]);
    return;
  }
  // Two side-by-side parts (e.g. "Year 1 | NCC Education Level 3 Diploma"): split the Khmer at its colon.
  if (m && textKids.length === 2 && textKids.every((c) => c.type === "tag" && c.name === "span")) {
    $(textKids[0]).text(m[1].replace(/\s*[:៖]$/, ""));
    $(textKids[1]).text(m[2]);
    return;
  }
  // Text with links or bold words inside: find those words in the Khmer sentence (same name, or their
  // own translation, or the opening question for a bold lead-in) and wrap only them again.
  const inline = textKids.filter((c) => c.type === "tag" && INLINE.has(c.name));
  if (inline.length && textKids.some((c) => c.type === "text")) {
    const ranges = [];
    let from = 0;
    for (const c of inline) {
      const t = clean($(c).text());
      const cands = [t, dict.get(t), t.replace(/^The /, "")].filter(Boolean);
      if (c === textKids[0] && c.name !== "a") { const q = km.match(/^[^?៖:]*[?៖:]/); if (q) cands.push(q[0]); }
      let hit = null;
      for (const s of cands) { const i = km.indexOf(s, from); if (i >= 0) { hit = [i, i + s.length]; break; } }
      // "See <a>Page name</a>." worded differently in Khmer: link what follows "សូមមើល" (see).
      const after = el.children.slice(el.children.indexOf(c) + 1).map((n) => (n.type === "text" ? n.data : $(n).text())).join("");
      if (!hit && c.name === "a" && !/[^\s.!?]/.test(after)) {
        const see = km.lastIndexOf("សូមមើល");
        if (see >= from) { const s = see + "សូមមើល".length; hit = [s, km.replace(/[។.!?]+\s*$/, "").length]; }
      }
      if (!hit) { if (c.name === "a") lostLinks.add(`${t} -> ${c.attribs.href}`); continue; }
      ranges.push([...hit, c]);
      from = hit[1];
    }
    let html = "", at = 0;
    for (const [s, e, c] of ranges) {
      const attrs = Object.entries(c.attribs).map(([k, v]) => ` ${k}="${v.replace(/"/g, "&quot;")}"`).join("");
      html += escapeHtml(km.slice(at, s)) + `<${c.name}${attrs}>${escapeHtml(km.slice(s, e))}</${c.name}>`;
      at = e;
    }
    $el.html(html + escapeHtml(km.slice(at)));
    return;
  }
  let placed = false;
  for (const c of [...(el.children || [])]) {
    if (c.type === "text") {
      if (!c.data.trim()) continue;
      if (!placed) { c.data = c.data.replace(/\S[\s\S]*\S|\S/, km); placed = true; }
      else c.data = " ";
    } else if (c.type === "tag" && !SKIP.has(c.name) && clean($(c).text())) {
      if (!placed && ["span", "strong", "em", "small"].includes(c.name) && !c.attribs.href) {
        $(c).text(km); placed = true; // e.g. a button whose label is in a span next to an icon
      } else if (c.name === "a" && !placed) {
        $(c).text(km); placed = true;
      } else $(c).remove();
    }
  }
  if (!placed) $el.prepend(escapeHtml(km));
}

const INLINE = new Set(["a", "strong", "em", "span", "b", "i"]);
const lostLinks = new Set();
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function walk($, el, page) {
  if (el.type === "text") {
    if (el.parent && !SKIP.has(el.parent.name)) {
      const km = lookup(clean(el.data), page);
      if (km) el.data = el.data.replace(/\S[\s\S]*\S|\S/, km);
    }
    return;
  }
  if (el.type !== "tag" || SKIP.has(el.name)) return;
  if ((el.attribs.class || "").split(/\s+/).includes("hp")) return;
  if (TEXT_LEVEL.has(el.name) && !hasStructure(el)) {
    const km = lookup(textOf($, el), page);
    if (km) fillLeaf($, el, km);
    return;
  }
  for (const c of [...(el.children || [])]) walk($, c, page);
}

// --- per page -----------------------------------------------------------------------------
function urlPath(file) {
  const rel = path.relative(SITE, file).split(path.sep).join("/");
  return "/" + rel.replace(/index\.html$/, "");
}

const isPage = (href) => href && href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/km/")
  && !/^\/(assets|admin)\//.test(href) && !/\.[a-z0-9]+(?:[?#].*)?$/i.test(href.split("#")[0]);

function translatePage(file) {
  const html = fs.readFileSync(file, "utf8");
  const $ = cheerio.load(html, { decodeEntities: false });
  const page = urlPath(file);

  $("html").attr("lang", "km");
  const title = $("title");
  const t = lookup(clean(title.text()), page);
  if (t) title.text(t);
  $('meta[name="description"], meta[property="og:description"], meta[property="og:title"]').each((_, m) => {
    const km = dict.get(clean($(m).attr("content") || ""));
    if (km) $(m).attr("content", km);
  });

  walk($, $("body")[0], page);
  $("body *").each((_, el) => {
    for (const a of ATTRS) {
      const v = el.attribs[a];
      if (!v) continue;
      const km = lookup(clean(v), page);
      if (km) el.attribs[a] = km;
    }
  });

  // Links stay inside the Khmer site; the language switch goes back to the English page.
  $("a[href], form[action]").each((_, el) => {
    const attr = el.name === "form" ? "action" : "href";
    const v = el.attribs[attr];
    if ($(el).closest(".lang-switch").length) return;
    if (isPage(v)) el.attribs[attr] = "/km" + v;
  });
  const sw = $(".lang-switch");
  const enPage = page === "/404.html" ? "/" : page;
  sw.find(".lang-en").replaceWith(`<a class="lang lang-en" href="${enPage}" hreflang="en" lang="en">EN</a>`);
  sw.find(".lang-km").replaceWith(`<span class="lang lang-km is-current" aria-current="true">KH</span>`);
  $('input[name="site_language"]').attr("value", "Khmer");
  $('input[name="booked_from_page"]').attr("value", "/km" + page);
  $('script[data-en-only]').remove();
  $('meta[property="og:locale"]').attr("content", "km_KH");
  $('link[rel="canonical"], meta[property="og:url"]').each((_, el) => {
    const a = el.name === "link" ? "href" : "content";
    el.attribs[a] = el.attribs[a].replace(SITE_URL, SITE_URL + "/km");
  });

  const out = path.join(OUT, path.relative(SITE, file));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, $.html());
}

function pages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return ["admin", "km", "assets"].includes(d.name) && dir === SITE ? [] : pages(p);
    return d.name.endsWith(".html") ? [p] : [];
  });
}

fs.rmSync(OUT, { recursive: true, force: true });
const files = pages(SITE);
files.forEach(translatePage);
console.log(`[km] ${files.length} Khmer pages written to _site/km/, ${dict.size} translations loaded`);
if (lostLinks.size) console.log(`[km] links whose words were not found in the Khmer text (shown without link):\n  - ${[...lostLinks].join("\n  - ")}`);
if (missing.size) {
  console.log(`[km] ${missing.size} texts still in English:`);
  for (const [en, where] of missing) if (REPORT || missing.size <= 15) console.log(`  - "${en.slice(0, 80)}" (${[...where].slice(0, 3).join(", ")})`);
}
