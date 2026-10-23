// GTFS の CSV（RFC 4180）を読む（010）。BOM・CRLF・引用符で囲んだ値（中のカンマ・改行・"" の二重引用符）に対応する。
// 取り込みスクリプトから Node で直接読み込むので、外部に依存しない

export type CsvRecord = Record<string, string>;

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        field += char;
      }
      i += 1;
      continue;
    }
    if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else {
      field += char;
    }
    i += 1;
  }
  if (quoted) throw new Error("CSV の引用符が閉じていません");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 空行（列が1つで空のもの）は読み飛ばす
  return rows.filter((cells) => !(cells.length === 1 && cells[0].trim() === ""));
}

// 1行目を見出しとして、行ごとのオブジェクトにする。値の前後の空白は外す。足りない列は空文字にする
export function parseCsv(text: string): CsvRecord[] {
  const [header, ...body] = parseRows(text);
  if (!header) return [];
  const names = header.map((name) => name.trim());
  return body.map((cells, index) => {
    if (cells.length > names.length) {
      throw new Error(`${index + 2}行目：列の数が見出し（${names.length}列）より多い`);
    }
    const record: CsvRecord = {};
    names.forEach((name, column) => {
      record[name] = (cells[column] ?? "").trim();
    });
    return record;
  });
}
