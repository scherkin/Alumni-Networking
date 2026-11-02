"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FIELDS, OPEN_TO } from "@/lib/constants";

export type DirectoryRow = {
  id: string; name: string; class_year: number; field: string; specialty: string | null; title: string | null;
  organization: string | null; city: string | null; open_to: string[]; is_sample: boolean; claimed_by: string | null;
  seniority: number; total: number;
};
export type Facets = { total: number; samples: number; fields: Record<string, number>; decades: number[] };
type Params = { q: string; field: string; open: string; decade: string; sort: string };

const nf = new Intl.NumberFormat("en-US");

export default function Directory({ rows, total, page, pageSize, params, facets, top }: {
  rows: DirectoryRow[]; total: number; page: number; pageSize: number; params: Params; facets: Facets;
  /** Shown above the search box, e.g. the open internships list. */
  top?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.q);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const hrefFor = (next: Partial<Params> & { page?: number }) => {
    const merged = { ...params, ...next };
    const sp = new URLSearchParams();
    (Object.keys(merged) as (keyof Params)[]).forEach((k) => {
      const v = merged[k];
      if (v && !(k === "sort" && v === "recent")) sp.set(k, String(v));
    });
    const p = next.page ?? 1;
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const go = (next: Partial<Params> & { page?: number }) => start(() => router.replace(hrefFor(next), { scroll: false }));

  useEffect(() => setQ(params.q), [params.q]);
  const onSearch = (v: string) => {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: v.trim() }), 300);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const fieldTabs = FIELDS.filter((f) => facets.fields[f]);
  const filtered = params.q || params.field || params.open || params.decade;

  const mixed = facets.samples > 0 && facets.samples < facets.total;
  return (
    <div aria-busy={pending}>
      <p className="intro">
        Look up graduates by the work they do now, then get in touch for advice, a job shadow or an informational interview.
        <span className="counts">{nf.format(facets.total)} graduates in {fieldTabs.length} fields.</span>
      </p>
      <div className="dir-layout">
        <aside className="side" aria-label="Filter the directory">
          <div>
            <h2 className="side-h">Field</h2>
            <div className="field-list">
              <button className="ftab" type="button" aria-pressed={!params.field} onClick={() => go({ field: "" })}>
                <span>All</span><span className="n">{nf.format(facets.total)}</span>
              </button>
              {fieldTabs.map((f) => (
                <button key={f} className="ftab" type="button" aria-pressed={params.field === f} onClick={() => go({ field: f })}>
                  <span>{f}</span><span className="n">{nf.format(facets.fields[f])}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="side-f">Willing to help with
            <select value={params.open} onChange={(e) => go({ open: e.target.value })}>
              <option value="">Anything</option>{OPEN_TO.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="side-f">Graduated
            <select value={params.decade} onChange={(e) => go({ decade: e.target.value })}>
              <option value="">Any year</option>{facets.decades.map((d) => <option key={d} value={d}>{d}s</option>)}
            </select>
          </label>
        </aside>

        <div className="dir-main">
          {top}
          <div className="toolbar">
            <label className="search"><span hidden>Search</span>
              <input type="search" placeholder="Search by name, job, employer, college or city" value={q}
                onChange={(e) => onSearch(e.target.value)} aria-label="Search alumni" />
            </label>
            <label className="small muted" htmlFor="sort">Sort by</label>
            <select id="sort" value={params.sort} onChange={(e) => go({ sort: e.target.value })}>
              <option value="recent">Most recent graduates</option><option value="oldest">Earliest graduates</option>
              <option value="name">Name</option><option value="title">Job title</option>
              <option value="senior">Seniority, highest first</option><option value="junior">Seniority, lowest first</option>
            </select>
            <Link className="btn" href="/alumni/new">Add a graduate</Link>
          </div>
          <p className="result-line">
            {total ? `${nf.format(from)}–${nf.format(to)} of ${nf.format(total)} graduates` : "No graduates match"}
            {params.field ? ` in ${params.field}` : ""}
            {facets.samples === facets.total && facets.total ? ". All profiles are made-up examples." : facets.samples ? `. ${nf.format(facets.samples)} are made-up examples.` : ""}
            {pending ? " Updating…" : ""}
          </p>
          {!facets.total && (
            <div className="empty"><h2>No graduates in the directory yet</h2><p>Add the first one, with their permission to share contact details.</p>
              <Link className="btn" href="/alumni/new">Add a graduate</Link></div>
          )}
          {facets.total > 0 && !rows.length && (
            <div className="empty"><h2>No matches</h2><p>Try a different field, or clear the search and filters.</p>
              {filtered && <button className="btn ghost" type="button" onClick={() => { setQ(""); go({ q: "", field: "", open: "", decade: "" }); }}>Clear filters</button>}</div>
          )}
          {rows.length > 0 && (
            <div className="list-head" aria-hidden="true"><span>Name</span><span>Current position</span><span>Field</span><span>Class of</span></div>
          )}
          <section className="grid" aria-live="polite" style={{ opacity: pending ? 0.6 : 1 }}>
            {rows.map((a) => (
              <Link key={a.id} href={`/alumni/${a.id}`} className="card">
                <span className="c-name">
                  {a.name}
                  {mixed && a.is_sample && <span className="tag">Sample</span>}
                  {a.claimed_by && <span className="tag on">On the network</span>}
                </span>
                <span className="c-job">
                  {a.title}{a.organization ? `, ${a.organization}` : ""}
                  {a.open_to.length > 0 && <small>Will help with {a.open_to.join(", ").toLowerCase()}</small>}
                </span>
                <span className="c-field">{a.field}{a.specialty && <small>{a.specialty}</small>}</span>
                <span className="c-year">{a.class_year}{a.city && <small>{a.city}</small>}</span>
              </Link>
            ))}
          </section>
          {pages > 1 && (
            <nav className="pager" aria-label="Pages">
              {page > 1 ? <Link className="btn ghost small" href={hrefFor({ page: page - 1 })} scroll={false}>Previous</Link> : <span />}
              <span className="muted small">Page {nf.format(page)} of {nf.format(pages)}</span>
              {page < pages ? <Link className="btn ghost small" href={hrefFor({ page: page + 1 })} scroll={false}>Next</Link> : <span />}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
