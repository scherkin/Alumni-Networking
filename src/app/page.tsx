import Link from "next/link";
import { requireMember } from "@/lib/session";
import { canPostInternships, loadInternships } from "@/lib/internships";
import { FIELDS, OPEN_TO, isClosed } from "@/lib/constants";
import Directory, { type DirectoryRow, type Facets } from "@/components/Directory";
import InternshipCard from "@/components/InternshipCard";

const PAGE_SIZE = 48;
const SORTS = ["recent", "oldest", "name", "title", "senior", "junior"];
type SP = { q?: string; field?: string; open?: string; decade?: string; sort?: string; page?: string };

export default async function Home({ searchParams }: { searchParams: SP }) {
  const { supabase, member } = await requireMember();
  const params = {
    q: (searchParams.q ?? "").slice(0, 100),
    field: FIELDS.includes(searchParams.field ?? "") ? searchParams.field! : "",
    open: OPEN_TO.includes(searchParams.open ?? "") ? searchParams.open! : "",
    decade: /^\d{4}$/.test(searchParams.decade ?? "") ? searchParams.decade! : "",
    sort: SORTS.includes(searchParams.sort ?? "") ? searchParams.sort! : "recent",
  };
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const [{ data: rows }, { data: facets }, internships] = await Promise.all([
    supabase.rpc("search_alumni", {
      p_q: params.q, p_field: params.field || null, p_open: params.open || null,
      p_decade: params.decade ? Number(params.decade) : null, p_sort: params.sort,
      p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE,
    }),
    supabase.rpc("directory_facets"),
    loadInternships(supabase, member, { openOnly: true, limit: 12 }),
  ]);
  const list = (rows ?? []) as DirectoryRow[];
  const open = internships.filter((i) => !isClosed(i));

  return (
    <>
      <section className="newsbox" aria-labelledby="news-h">
        <div className="newsbox-head">
          <div><div className="eyebrow">News</div><h2 id="news-h">Open internships</h2></div>
          <div className="actions">
            {canPostInternships(member) && <Link className="btn ghost small" href="/internships/new">+ Post one</Link>}
            <Link className="btn small" href="/internships">See all</Link>
          </div>
        </div>
        {open.length ? (
          <div className="intern-grid">{open.slice(0, 3).map((i) => <InternshipCard key={i.id} item={i} compact />)}</div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No open internships right now.{" "}
            {canPostInternships(member) ? "Know of one? Post it so students can apply." : "Check back soon. Graduates and staff post openings here."}
          </p>
        )}
      </section>
      <Directory
        rows={list}
        total={list[0]?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        params={params}
        facets={(facets as Facets) ?? { total: 0, samples: 0, fields: {}, decades: [] }}
      />
    </>
  );
}
