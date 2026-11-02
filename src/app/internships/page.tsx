import Link from "next/link";
import { requireMember } from "@/lib/session";
import { canPostInternships, loadInternships } from "@/lib/internships";
import InternshipBoard from "@/components/InternshipBoard";

export default async function Internships() {
  const { supabase, member } = await requireMember();
  const items = await loadInternships(supabase, member);
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="page-head">
        <div>
          <h2>Internships</h2>
          <p>Openings shared by graduates and staff. Apply through the link on each listing.</p>
        </div>
        {canPostInternships(member) && <Link className="btn" href="/internships/new">Post an internship</Link>}
      </div>
      <InternshipBoard items={items} canPost={canPostInternships(member)} />
    </div>
  );
}
