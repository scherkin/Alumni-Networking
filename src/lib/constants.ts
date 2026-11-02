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

export const GRADE_LEVELS = ["9th grade", "10th grade", "11th grade", "12th grade", "Recent graduates"];

export type Internship = {
  id: string; posted_by: string; company: string; role_title: string; description: string; signup_url: string;
  spots: number | null; grade_levels: string[]; min_gpa: number | null; experience: string | null; paid: boolean;
  pay_details: string | null; location: string | null; field: string | null; deadline: string | null; is_open: boolean;
  created_at: string;
};
/** An internship with the poster's details attached, ready to display. */
export type InternshipView = Internship & {
  poster: { name: string; line: string; profileId: string | null };
  canEdit: boolean;
};

/** Closed by the poster, or past its deadline (end of that day). */
export const isClosed = (i: Pick<Internship, "is_open" | "deadline">) =>
  !i.is_open || (!!i.deadline && new Date(`${i.deadline}T23:59:59`) < new Date());
