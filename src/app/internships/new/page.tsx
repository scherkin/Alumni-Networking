import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import { canPostInternships } from "@/lib/internships";
import InternshipForm from "@/components/InternshipForm";

export default async function NewInternship() {
  const { member } = await requireMember();
  if (!canPostInternships(member)) redirect("/internships");
  return (
    <div className="narrow stack" style={{ gap: 18, maxWidth: 760 }}>
      <div><h2 className="page-title">Post an internship</h2>
        <p className="muted">Your name and role are shown on the posting so students know who shared it.</p></div>
      <InternshipForm />
    </div>
  );
}
