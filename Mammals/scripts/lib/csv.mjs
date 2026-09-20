export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.length));
}

export function indexHeaders(headerRow) {
  const map = new Map();
  headerRow.forEach((name, i) => map.set(String(name).trim().toLowerCase(), i));
  return map;
}

export function pick(headers, row, names) {
  for (const name of names) {
    const idx = headers.get(name.toLowerCase());
    if (idx != null && row[idx] != null && String(row[idx]).trim() !== "") {
      return String(row[idx]).trim();
    }
  }
  return "";
}
