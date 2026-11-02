export const SCHOOL = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Our High School";

export const FIELDS = [
  "Healthcare & Medicine", "Engineering", "Business", "Finance", "Law", "Journalism", "Media & Communications",
  "Architecture", "Performing Arts", "Hospitality", "Politics & Government", "Technology & Computing", "Education",
  "Science & Research", "Arts & Design", "Military", "Skilled Trades", "Nonprofit & Social Impact", "Sports & Recreation", "Other",
];
export const OPEN_TO = ["Mentoring", "Informational interviews", "Job shadowing", "Internships", "Résumé review", "College advice"];
export const ROLE_LABEL: Record<string, string> = { student: "Student", alum: "Alum", teacher: "Teacher / staff" };

export const classOf = (y?: number | null) => (y ? `Class of '${String(y).slice(-2)}` : "");

/** Labels for the seniority level the database computes from each job title (see title_seniority in SQL). */
export const LEVELS = ["", "Student", "Early career", "Professional", "Senior specialist", "Manager", "Executive / owner"];

export type AlumniProfile = {
  id: string; name: string; class_year: number; field: string; specialty: string | null; title: string | null;
  organization: string | null; city: string | null; college: string | null; open_to: string[];
  email: string | null; phone: string | null; linkedin_url: string | null; preferred_contact: string | null;
  bio: string | null; consent: boolean; is_sample: boolean; claimed_by: string | null; created_by: string | null;
  seniority: number;
};
export type Member = {
  id: string; full_name: string; avatar_url: string | null; role: "student" | "alum" | "teacher";
  grad_year: number | null; linkedin_url: string | null; is_staff: boolean;
};

export const GRADE_LEVELS = ["9th grade", "10th grade", "11th grade", "12th grade", "Recent graduates"];

export type Internship = {
  id: string; posted_by: string | null; is_sample: boolean; sample_poster_id: string | null; company: string; role_title: string; description: string; signup_url: string;
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
