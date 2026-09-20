import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function decodeXml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function colIndex(ref) {
  const letters = (String(ref).match(/^[A-Z]+/) || [""])[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => {
    const texts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodeXml(t[1]));
    return texts.join("");
  });
}

function parseSheet(xml, strings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c ([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2];
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      if (!ref) continue;
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1] || "";
      let value = "";
      if (type === "inlineStr") {
        const text = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = text ? decodeXml(text[1]) : "";
      } else {
        const raw = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (!raw) continue;
        value = type === "s" ? (strings[Number(raw[1])] ?? "") : raw[1];
      }
      row[colIndex(ref)] = value;
    }
    for (let i = 0; i < row.length; i += 1) if (row[i] == null) row[i] = "";
    if (row.some((cell) => String(cell).length)) rows.push(row);
  }
  return rows;
}

export async function rowsFromXlsx(xlsxPath) {
  const dir = await mkdtemp(join(tmpdir(), "xlsx-"));
  try {
    await execFileAsync("tar", ["-xf", xlsxPath, "-C", dir]);
    const strings = parseSharedStrings(await readFile(join(dir, "xl", "sharedStrings.xml"), "utf8"));
    const sheet = await readFile(join(dir, "xl", "worksheets", "sheet1.xml"), "utf8");
    return parseSheet(sheet, strings);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
