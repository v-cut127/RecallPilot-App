export interface ShareTokenRecord {
    expiresAt: string | Date;
    revokedAt: string | Date | null;
}
export declare function generateShareToken(): string;
export declare function isShareLinkActive(record: ShareTokenRecord, now?: Date): boolean;
export declare function shareTokenPrefix(token: string): string;
export declare function safeTokenEquals(a: string, b: string): boolean;
