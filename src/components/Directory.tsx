"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FIELDS, LEVELS, OPEN_TO, classOf } from "@/lib/constants";

export type DirectoryRow = {
  id: string; name: string; class_year: number; field: string; specialty: string | null; title: string | null;
  organization: string | null; city: string | null; open_to: string[]; is_sample: boolean; claimed_by: string | null;
  seniority: number; total: number;
};
export type Facets = { total: number; samples: number; fields: Record<string, number>; decades: number[] };
type Params = { q: string; field: string; open: string; decade: string; sort: string };

const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const nf = new Intl.NumberFormat("en-US");

export default function Directory({ rows, total, page, pageSize, params, facets }: {
  rows: DirectoryRow[]; total: number; page: number; pageSize: number; params: Params; facets: Facets;
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

  return (
    <div aria-busy={pending}>
      <div className="fields" role="group" aria-label="Filter by field">
        <button className="ftab" type="button" aria-pressed={!params.field} onClick={() => go({ field: "" })}>
          All fields <span className="n">{nf.format(facets.total)}</span>
        </button>
        {fieldTabs.map((f) => (
          <button key={f} className="ftab" type="button" aria-pressed={params.field === f} onClick={() => go({ field: f })}>
            {f} <span className="n">{nf.format(facets.fields[f])}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label className="search"><span hidden>Search</span>
          <input type="search" placeholder="Search name, job title, employer, college, city…" value={q}
            onChange={(e) => onSearch(e.target.value)} aria-label="Search alumni" />
        </label>
        <select aria-label="Open to" value={params.open} onChange={(e) => go({ open: e.target.value })}>
          <option value="">Open to anything</option>{OPEN_TO.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select aria-label="Graduation decade" value={params.decade} onChange={(e) => go({ decade: e.target.value })}>
          <option value="">Any class year</option>{facets.decades.map((d) => <option key={d} value={d}>{d}s graduates</option>)}
        </select>
        <select aria-label="Sort" value={params.sort} onChange={(e) => go({ sort: e.target.value })}>
          <option value="recent">Newest grads first</option><option value="oldest">Oldest grads first</option>
          <option value="name">Name A–Z</option><option value="title">Job title A–Z</option>
          <option value="senior">Most senior first</option><option value="junior">Early career first</option>
        </select>
        <Link className="btn" href="/alumni/new">+ Add a profile</Link>
      </div>
      <p className="result-line">
        {total ? `Showing ${nf.format(from)}–${nf.format(to)} of ${nf.format(total)} alumni` : "No alumni match"}
        {params.field ? ` in ${params.field}` : ""}
        {facets.samples ? ` · ${nf.format(facets.samples)} in the directory are made-up sample profiles` : ""}
        {pending ? " · Updating…" : ""}
      </p>
      <section className="grid" aria-live="polite" style={{ opacity: pending ? 0.6 : 1 }}>
        {!facets.total && (
          <div className="empty"><h2>No alumni in the directory yet</h2><p>Add the first graduate, with their permission to share contact details.</p>
            <Link className="btn" href="/alumni/new">+ Add a profile</Link></div>
        )}
        {facets.total > 0 && !rows.length && (
          <div className="empty"><h2>No matches</h2><p>Try a different field, or clear the search and filters.</p>
            {filtered && <button className="btn ghost" type="button" onClick={() => { setQ(""); go({ q: "", field: "", open: "", decade: "" }); }}>Clear filters</button>}</div>
        )}
        {rows.map((a) => (
          <Link key={a.id} href={`/alumni/${a.id}`} className="card">
            <div className="card-top">
              <div className="avatar" aria-hidden="true">{initials(a.name)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3>{a.name}</h3>
                <div className="role">{a.title}{a.organization ? ` · ${a.organization}` : ""}</div>
              </div>
              <span className="year">{classOf(a.class_year)}</span>
            </div>
            {a.seniority > 0 && <div className="level">{LEVELS[a.seniority]}</div>}
            <div className="meta">
              {a.is_sample && <span className="chip sample">Sample</span>}
              {a.claimed_by && <span className="chip joined">On the network</span>}
              <span className="chip field">{a.field}</span>
              {a.specialty && <span className="chip">{a.specialty}</span>}
            </div>
            {a.open_to.length > 0 && <div className="meta">{a.open_to.slice(0, 3).map((o) => <span key={o} className="chip open">{o}</span>)}</div>}
            {a.city && <div className="role small">{a.city}</div>}
          </Link>
        ))}
      </section>
      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn ghost small" href={hrefFor({ page: page - 1 })} scroll={false}>← Previous</Link> : <span />}
          <span className="muted small">Page {nf.format(page)} of {nf.format(pages)}</span>
          {page < pages ? <Link className="btn ghost small" href={hrefFor({ page: page + 1 })} scroll={false}>Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
