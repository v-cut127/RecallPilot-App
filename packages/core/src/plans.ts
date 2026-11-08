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
export const PLAN_CATALOG: Record<PlanDefinition["id"], PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPriceEur: 199,
    limits: {
      locations: 1,
      contactsPerMonth: 500,
      languages: 1,
      channels: ["email", "sms"],
      voiceMinutesIncluded: 0,
    },
    target: "Solo practice, 1,000–2,500 active patients",
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthlyPriceEur: 349,
    limits: {
      locations: 3,
      contactsPerMonth: 2_000,
      languages: 2,
      channels: ["email", "sms", "whatsapp"],
      voiceMinutesIncluded: 300,
    },
    target: "1–3 location practice with an active recall problem",
  },
  scale: {
    id: "scale",
    name: "Scale",
    monthlyPriceEur: 599,
    limits: {
      locations: 3,
      contactsPerMonth: 6_000,
      languages: 99,
      channels: ["email", "sms", "whatsapp", "voice"],
      voiceMinutesIncluded: 300,
    },
    target: "Multi-location group or dental service organisation",
  },
};

export const PERFORMANCE_FEE = {
  perRecoveredAppointmentEur: 12,
  freeAppointments: 10,
  monthlyCapEur: 299,
} as const;
