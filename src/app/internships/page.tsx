import Link from "next/link";
import { requireMember } from "@/lib/session";
import { canPostInternships, loadInternships } from "@/lib/internships";
import InternshipBoard from "@/components/InternshipBoard";

export default async function Internships() {
  const { supabase, member } = await requireMember();
  const items = await loadInternships(supabase, member);
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="newsbox-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">Opportunities</div>
          <h2 style={{ fontSize: 30, marginTop: 6 }}>Internships</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>Openings shared by graduates and staff. Apply through each posting's sign-up link.</p>
        </div>
        {canPostInternships(member) && <Link className="btn" href="/internships/new">+ Post an internship</Link>}
      </div>
      <InternshipBoard items={items} canPost={canPostInternships(member)} />
    </div>
  );
}
