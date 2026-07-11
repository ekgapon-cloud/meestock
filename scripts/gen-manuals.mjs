// Generates downloadable .doc (Word-compatible HTML) files from the Markdown
// user manuals in docs/user-manual/ into apps/web/public/manuals/.
// Run: node scripts/gen-manuals.mjs   (re-run whenever the .md sources change)
//
// Self-contained: no npm dependencies. Handles the Markdown subset the manuals
// use (headings, bold, inline code, code fences, tables, ordered/unordered
// lists, blockquotes, horizontal rules, links). Internal *.md / relative links
// are flattened to plain text since they don't resolve in a downloaded file.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const srcDir = join(repoRoot, "docs", "user-manual");
const fullManual = join(repoRoot, "docs", "user-manual.md");
const outDir = join(repoRoot, "apps", "web", "public", "manuals");

// file -> nice title used in the doc and download name
const jobs = [
  { src: fullManual, out: "meestock-manual-full.doc", title: "คู่มือการใช้งาน M.EE Warehouse (ฉบับเต็ม)" },
  { src: join(srcDir, "requester.md"), out: "meestock-manual-requester.doc", title: "คู่มือ - ผู้ขอเบิกวัสดุ" },
  { src: join(srcDir, "approver.md"), out: "meestock-manual-approver.doc", title: "คู่มือ - ผู้อนุมัติ" },
  { src: join(srcDir, "warehouse.md"), out: "meestock-manual-warehouse.doc", title: "คู่มือ - เจ้าหน้าที่คลัง" },
  { src: join(srcDir, "purchasing.md"), out: "meestock-manual-purchasing.doc", title: "คู่มือ - ฝ่ายจัดซื้อ" },
  { src: join(srcDir, "executive.md"), out: "meestock-manual-executive.doc", title: "คู่มือ - ผู้บริหาร/ผู้จัดการ" },
  { src: join(srcDir, "admin.md"), out: "meestock-manual-admin.doc", title: "คู่มือ - ผู้ดูแลระบบ" },
];

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text) {
  let s = escapeHtml(text);
  // inline code
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // links: keep external http(s); flatten internal .md / relative links to text
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    if (/^https?:\/\//.test(href)) return `<a href="${href}">${label}</a>`;
    return label;
  });
  return s;
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join("<br>")}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // code fence
    if (trimmed.startsWith("```")) {
      flushPara();
      i++;
      const code = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing fence
      out.push(`<pre><code>${code.join("\n")}</code></pre>`);
      continue;
    }

    // blank line
    if (trimmed === "") {
      flushPara();
      i++;
      continue;
    }

    // horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      flushPara();
      out.push("<hr>");
      i++;
      continue;
    }

    // heading
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // table (header row followed by separator row)
    if (trimmed.startsWith("|") && i + 1 < lines.length && /^\|[\s:|-]+\|?$/.test(lines[i + 1].trim())) {
      flushPara();
      const parseRow = (row) =>
        row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const headers = parseRow(lines[i]);
      i += 2; // skip header + separator
      const body = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        body.push(parseRow(lines[i]));
        i++;
      }
      let t = "<table><thead><tr>";
      t += headers.map((c) => `<th>${inline(c)}</th>`).join("");
      t += "</tr></thead><tbody>";
      for (const r of body) {
        t += "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>";
      }
      t += "</tbody></table>";
      out.push(t);
      continue;
    }

    // blockquote (consecutive > lines)
    if (trimmed.startsWith(">")) {
      flushPara();
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${quote.map((q) => (q === "" ? "" : inline(q))).join("<br>")}</blockquote>`);
      continue;
    }

    // ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ol>`);
      continue;
    }

    // unordered list
    if (/^[-*]\s/.test(trimmed)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s/, ""));
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`);
      continue;
    }

    // plain paragraph line
    para.push(trimmed);
    i++;
  }
  flushPara();
  return out.join("\n");
}

function wrapDoc(title, bodyHtml) {
  // HTML that Microsoft Word opens natively when saved with a .doc extension.
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: "TH Sarabun New", "Sarabun", "Tahoma", sans-serif; font-size: 15pt; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 24pt; border-bottom: 2px solid #333; padding-bottom: 6px; }
  h2 { font-size: 19pt; margin-top: 18pt; color: #0b3d66; }
  h3 { font-size: 16pt; margin-top: 14pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #eef3f7; }
  code { font-family: "Consolas", monospace; background: #f2f2f2; padding: 1px 4px; }
  pre { background: #f6f8fa; border: 1px solid #ddd; padding: 8px; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #b7c7d6; margin: 8pt 0; padding: 4pt 12pt; background: #f6f9fc; color: #33475b; }
  a { color: #0b5cad; }
  hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

mkdirSync(outDir, { recursive: true });
for (const job of jobs) {
  const md = readFileSync(job.src, "utf8");
  const html = wrapDoc(job.title, mdToHtml(md));
  // BOM helps Word detect UTF-8 for Thai text
  writeFileSync(join(outDir, job.out), "﻿" + html, "utf8");
  console.log("wrote", job.out);
}
console.log("done ->", outDir);
