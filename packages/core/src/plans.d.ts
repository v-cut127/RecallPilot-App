export interface PlanLimits {
    locations: number;
    contactsPerMonth: number;
    languages: number;
    channels: Array<"email" | "sms" | "whatsapp" | "voice">;
    voiceMinutesIncluded: number;
}
export interface PlanDefinition {
    id: "starter" | "growth" | "scale";
    name: string;
    monthlyPriceEur: number;
    limits: PlanLimits;
    target: string;
}
/**
 * Single source of truth for pricing and limits (plan section 05).
 * The Scale contact limit follows the business plan (6,000/month); the landing
 * page must be updated before Stripe billing goes live.
 */
export declare const PLAN_CATALOG: Record<PlanDefinition["id"], PlanDefinition>;
export declare const PERFORMANCE_FEE: {
    readonly perRecoveredAppointmentEur: 12;
    readonly freeAppointments: 10;
    readonly monthlyCapEur: 299;
};
