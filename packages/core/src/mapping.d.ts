import type { CanonicalField, ImportMapping } from "./types";
export interface CanonicalFieldDefinition {
    field: CanonicalField;
    label: string;
    description: string;
    required?: boolean;
}
export declare const CANONICAL_FIELD_DEFINITIONS: CanonicalFieldDefinition[];
export declare const REQUIRED_MAPPING_FIELDS: CanonicalField[];
export declare function suggestMapping(headers: string[]): ImportMapping;
export declare function validateMapping(mapping: ImportMapping, headers: string[]): string[];
export declare function mappedValue(row: Record<string, string>, mapping: ImportMapping, field: CanonicalField): string;
export declare function mappingColumnCount(mapping: ImportMapping): number;
