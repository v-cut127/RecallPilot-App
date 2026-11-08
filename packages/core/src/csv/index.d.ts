import type { ImportDetection, ParsedCsv, ParsedCsvRow } from "../types";
export interface DecodedCsv {
    encoding: "utf-8" | "windows-1252";
    hasBom: boolean;
    text: string;
}
export declare function detectEncoding(input: Uint8Array | ArrayBuffer): DecodedCsv;
export declare function detectDelimiter(text: string): ImportDetection["delimiter"];
export declare function parseCsv(text: string, delimiter: string): ParsedCsv;
export declare function toRowObjects(parsed: ParsedCsv, row: ParsedCsvRow): Record<string, string>;
export declare function inspectCsv(input: Uint8Array | ArrayBuffer, sampleSize?: number): {
    detection: ImportDetection;
    parsed: ParsedCsv;
};
export declare function escapeCsvCell(value: unknown): string;
export declare function buildCsv(headers: string[], rows: Array<Array<unknown>>): string;
