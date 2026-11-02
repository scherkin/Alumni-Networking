export const SCHOOL = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Our High School";

export const FIELDS = [
  "Healthcare & Medicine", "Engineering", "Technology & Computing", "Business & Finance", "Law & Justice",
  "Education", "Science & Research", "Arts, Design & Media", "Government & Public Service", "Military",
  "Skilled Trades", "Nonprofit & Social Impact", "Sports & Recreation", "Hospitality & Culinary", "Other",
];
export const OPEN_TO = ["Mentoring", "Informational interviews", "Job shadowing", "Internships", "Résumé review", "College advice"];
export const ROLE_LABEL: Record<string, string> = { student: "Student", alum: "Alum", teacher: "Teacher / staff" };

export const classOf = (y?: number | null) => (y ? `Class of '${String(y).slice(-2)}` : "");

/** Seniority from job-title keywords, highest match wins. */
export const LEVELS = ["", "Student", "Early career", "Professional", "Senior specialist", "Manager", "Executive / owner"];
const RANKS: [number, RegExp][] = [
  [1, /\b(student|trainee|apprentice)\b/i],
  [6, /\b(chief|ceo|cfo|cto|coo|president|vice president|vp|owner|founder|partner)\b/i],
  [5, /\b(manager|director|administrator|head of|supervisor|principal)\b/i],
  [4, /\b(senior|sr\.?|lead|physician|surgeon|cardiologist|dentist|cpa|actuary|professional engineer|attorney)\b/i],
  [2, /\b(resident|intern|associate|junior|jr\.?|assistant|co-op|investment banking analyst|staff accountant)\b/i],
];
export function seniority(title?: string | null) {
  const t = title ?? "";
  if (/physician assistant/i.test(t)) return 4;
  for (const [n, re] of RANKS) if (re.test(t)) return n;
  return t ? 3 : 0;
}

export type AlumniProfile = {
  id: string; name: string; class_year: number; field: string; specialty: string | null; title: string | null;
  organization: string | null; city: string | null; college: string | null; open_to: string[];
  email: string | null; phone: string | null; linkedin_url: string | null; preferred_contact: string | null;
  bio: string | null; consent: boolean; is_sample: boolean; claimed_by: string | null; created_by: string | null;
};
export type Member = {
  id: string; full_name: string; avatar_url: string | null; role: "student" | "alum" | "teacher";
  grad_year: number | null; linkedin_url: string | null; is_staff: boolean;
};
