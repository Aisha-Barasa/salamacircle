export const CATEGORIES = [
  { value: "sudden_isolation", label: "Sudden isolation", desc: "Withdrawing from family, friends or community" },
  { value: "harmful_online_influence", label: "Harmful online influence", desc: "Concerning accounts, groups or content" },
  { value: "school_dropout_risk", label: "School dropout risk", desc: "Skipping school or losing interest in learning" },
  { value: "emotional_distress", label: "Emotional distress", desc: "Visible sadness, anger or hopelessness" },
  { value: "violent_rhetoric", label: "Violent or extreme rhetoric", desc: "Speech promoting harm or hatred" },
  { value: "recruitment_concerns", label: "Recruitment concerns", desc: "Approached by groups recruiting youth" },
  { value: "substance_abuse", label: "Substance abuse", desc: "Concerning use of drugs or alcohol" },
  { value: "family_community_conflict", label: "Family or community conflict", desc: "Ongoing disputes affecting wellbeing" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const URGENCY = [
  { value: "low", label: "Low", desc: "Early warning, no immediate harm" },
  { value: "moderate", label: "Moderate", desc: "Needs support within days" },
  { value: "urgent", label: "Urgent", desc: "Needs help now" },
  { value: "critical", label: "Critical / Emergency", desc: "Imminent danger — escalate to local authorities now" },
] as const;

export type UrgencyValue = (typeof URGENCY)[number]["value"];

/** Police stations across Kilifi County that critical cases can be routed to. */
export const POLICE_STATIONS: string[] = [
  "Kilifi Police Station",
  "Malindi Police Station",
  "Watamu Police Station",
  "Mtwapa Police Station",
  "Mariakani Police Station",
  "Kaloleni Police Station",
  "Rabai Police Station",
  "Bamba Police Station",
  "Ganze Police Station",
  "Gede Police Station",
  "Magarini Police Station",
  "Marafa Police Station",
];

export const CONSTITUENCIES: Record<string, string[]> = {
  "Kilifi North": ["Tezo", "Sokoni", "Kibarani", "Dabaso", "Matsangoni", "Watamu", "Mnarani"],
  "Kilifi South": ["Junju", "Mwarakaya", "Shimo La Tewa", "Chasimba", "Mtepeni"],
  Kaloleni: ["Mariakani", "Kayafungo", "Kaloleni", "Mwanamwinga"],
  Rabai: ["Rabai/Kisurutini", "Ruruma", "Mwawesa", "Kambe/Ribe"],
  Ganze: ["Ganze", "Bamba", "Jaribuni", "Sokoke"],
  Malindi: ["Jilore", "Kakuyuni", "Ganda", "Malindi Town", "Shella"],
  Magarini: ["Marafa", "Magarini", "Gongoni", "Adu", "Garashi", "Sabaki"],
};

export const STATUS_FLOW = [
  { value: "submitted", label: "Submitted", desc: "Received and queued for review" },
  { value: "under_review", label: "Under review", desc: "Our coordinators are reading the report" },
  { value: "verified", label: "Verified by liaison", desc: "Discreetly verified by a community liaison" },
  { value: "intervention_assigned", label: "Intervention assigned", desc: "Matched to mentorship, counseling, training or jobs" },
  { value: "active_support", label: "Active support", desc: "Support is being delivered" },
  { value: "monitoring", label: "Monitoring", desc: "Quietly tracking progress and wellbeing" },
  { value: "resolved", label: "Resolved", desc: "Case closed with positive outcome" },
] as const;

export type StatusValue = (typeof STATUS_FLOW)[number]["value"];

export function statusLabel(v: string) {
  return STATUS_FLOW.find((s) => s.value === v)?.label ?? v;
}
export function categoryLabel(v: string) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}