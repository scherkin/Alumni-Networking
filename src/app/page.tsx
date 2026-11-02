import Link from "next/link";
import { requireMember } from "@/lib/session";
import { canPostInternships, loadInternships } from "@/lib/internships";
import { isClosed } from "@/lib/constants";
import Directory from "@/components/Directory";
import InternshipCard from "@/components/InternshipCard";

export default async function Home() {
  const { supabase, member } = await requireMember();
  const [{ data }, internships] = await Promise.all([
    supabase.from("alumni_profiles")
      .select("id, name, class_year, field, specialty, title, organization, city, college, open_to, is_sample, claimed_by")
      .order("name").limit(5000),
    loadInternships(supabase, member, { openOnly: true, limit: 12 }),
  ]);
  const open = internships.filter((i) => !isClosed(i));
  const latest = open.slice(0, 3);

  return (
    <>
      <section className="newsbox" aria-labelledby="news-h">
        <div className="newsbox-head">
          <div>
            <div className="eyebrow">News</div>
            <h2 id="news-h">Open internships</h2>
          </div>
          <div className="actions">
            {canPostInternships(member) && <Link className="btn ghost small" href="/internships/new">+ Post one</Link>}
            <Link className="btn small" href="/internships">See all{open.length ? ` (${open.length})` : ""}</Link>
          </div>
        </div>
        {latest.length ? (
          <div className="intern-grid">{latest.map((i) => <InternshipCard key={i.id} item={i} compact />)}</div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No open internships right now.{" "}
            {canPostInternships(member) ? "Know of one? Post it so students can apply." : "Check back soon. Graduates and staff post openings here."}
          </p>
        )}
      </section>
      <Directory alumni={data ?? []} />
    </>
  );
}
