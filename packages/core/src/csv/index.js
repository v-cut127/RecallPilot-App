const UTF8_BOM = [0xef, 0xbb, 0xbf];
export function detectEncoding(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const hasBom = bytes.length >= 3 && UTF8_BOM.every((byte, index) => bytes[index] === byte);
    const body = hasBom ? bytes.subarray(3) : bytes;
    try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
        return { encoding: "utf-8", hasBom, text };
    }
    catch {
        const text = new TextDecoder("windows-1252").decode(body);
        return { encoding: "windows-1252", hasBom, text };
    }
}
function countDelimiter(line, delimiter) {
    let count = 0;
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        else if (!inQuotes && char === delimiter) {
            count += 1;
        }
    }
    return count;
}
export function detectDelimiter(text) {
    const candidates = [",", ";", "\t", "|"];
    const lines = text
        .split(/\r\n|\n|\r/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 10);
    if (lines.length === 0)
        return ",";
    let best = ",";
    let bestScore = -1;
    for (const candidate of candidates) {
        const counts = lines.map((line) => countDelimiter(line, candidate));
        const total = counts.reduce((sum, value) => sum + value, 0);
        const positive = counts.filter((value) => value > 0);
        if (positive.length === 0)
            continue;
        const max = Math.max(...counts);
        const min = Math.min(...positive);
        const consistency = min / max;
        const score = total * consistency;
        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
    }
    return best;
}
export function parseCsv(text, delimiter) {
    const source = text.replace(/^\uFEFF/, "");
    const records = [];
    let field = "";
    let record = [];
    let inQuotes = false;
    let recordNumber = 1;
    let index = 0;
    const finishRecord = () => {
        record.push(field);
        field = "";
        const isBlank = record.every((value) => value.trim() === "");
        if (!isBlank) {
            records.push({ values: record, rowNumber: recordNumber });
            recordNumber += 1;
        }
        record = [];
    };
    while (index < source.length) {
        const char = source[index];
        if (inQuotes) {
            if (char === '"') {
                if (source[index + 1] === '"') {
                    field += '"';
                    index += 2;
                    continue;
                }
                inQuotes = false;
                index += 1;
                continue;
            }
            field += char;
            index += 1;
            continue;
        }
        if (char === '"' && field === "") {
            inQuotes = true;
            index += 1;
            continue;
        }
        if (char === delimiter) {
            record.push(field);
            field = "";
            index += 1;
            continue;
        }
        if (char === "\r") {
            finishRecord();
            index += source[index + 1] === "\n" ? 2 : 1;
            continue;
        }
        if (char === "\n") {
            finishRecord();
            index += 1;
            continue;
        }
        field += char;
        index += 1;
    }
    if (field.length > 0 || record.length > 0) {
        finishRecord();
    }
    if (records.length === 0) {
        return { headers: [], rows: [] };
    }
    const headerRecord = records[0];
    const rawHeaders = headerRecord ? headerRecord.values : [];
    const seen = new Map();
    const headers = rawHeaders.map((header, columnIndex) => {
        const cleaned = header.replace(/^\uFEFF/, "").trim() || `column_${columnIndex + 1}`;
        const count = seen.get(cleaned) ?? 0;
        seen.set(cleaned, count + 1);
        return count === 0 ? cleaned : `${cleaned} (${count + 1})`;
    });
    const rows = records.slice(1).map((item, rowIndex) => ({
        rowNumber: rowIndex + 2,
        values: item.values,
        columnCountMismatch: item.values.length !== headers.length,
    }));
    return { headers, rows };
}
export function toRowObjects(parsed, row) {
    const object = {};
    parsed.headers.forEach((header, index) => {
        object[header] = row.values[index]?.trim() ?? "";
    });
    return object;
}
export function inspectCsv(input, sampleSize = 20) {
    const decoded = detectEncoding(input);
    const delimiter = detectDelimiter(decoded.text);
    const parsed = parseCsv(decoded.text, delimiter);
    return {
        detection: {
            encoding: decoded.encoding,
            hasBom: decoded.hasBom,
            delimiter,
            headers: parsed.headers,
            sampleRows: parsed.rows.slice(0, sampleSize).map((row) => row.values),
            rowCount: parsed.rows.length,
        },
        parsed,
    };
}
export function escapeCsvCell(value) {
    const stringValue = value === null || value === undefined ? "" : String(value);
    const protectedValue = /^[=+\-@\t\r]/.test(stringValue) ? `'${stringValue}` : stringValue;
    if (/[",\r\n]/.test(protectedValue)) {
        return `"${protectedValue.replace(/"/g, '""')}"`;
    }
    return protectedValue;
}
export function buildCsv(headers, rows) {
    const lines = [headers.map(escapeCsvCell).join(",")];
    for (const row of rows) {
        lines.push(row.map(escapeCsvCell).join(","));
    }
    return `${lines.join("\r\n")}\r\n`;
}
//# sourceMappingURL=index.js.map