"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FIELDS, LEVELS, OPEN_TO, classOf, seniority } from "@/lib/constants";

type Row = {
  id: string; name: string; class_year: number; field: string; specialty: string | null; title: string | null;
  organization: string | null; city: string | null; college: string | null; open_to: string[]; is_sample: boolean; claimed_by: string | null;
};
const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function Directory({ alumni }: { alumni: Row[] }) {
  const [field, setField] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState("");
  const [decade, setDecade] = useState("");
  const [sort, setSort] = useState("recent");
  useEffect(() => { try { const s = localStorage.getItem("sort"); if (s) setSort(s); } catch {} }, []);

  const counts = useMemo(() => { const c: Record<string, number> = {}; alumni.forEach((a) => (c[a.field] = (c[a.field] ?? 0) + 1)); return c; }, [alumni]);
  const decades = useMemo(() => [...new Set(alumni.map((a) => Math.floor(a.class_year / 10) * 10))].sort((a, b) => b - a), [alumni]);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = alumni.filter((a) => {
      if (field && a.field !== field) return false;
      if (open && !a.open_to.includes(open)) return false;
      if (decade && String(Math.floor(a.class_year / 10) * 10) !== decade) return false;
      if (words.length) {
        const hay = [a.name, a.title, a.organization, a.college, a.city, a.field, a.specialty].join(" ").toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const byYear = (x: Row, y: Row) => x.class_year - y.class_year;
    return out.sort((x, y) =>
      sort === "name" ? x.name.localeCompare(y.name)
      : sort === "title" ? (x.title ?? "~").localeCompare(y.title ?? "~") || x.name.localeCompare(y.name)
      : sort === "senior" ? seniority(y.title) - seniority(x.title) || byYear(x, y)
      : sort === "junior" ? seniority(x.title) - seniority(y.title) || byYear(y, x)
      : sort === "oldest" ? byYear(x, y) : byYear(y, x));
  }, [alumni, field, q, open, decade, sort]);

  const nSample = alumni.filter((a) => a.is_sample).length;
  return (
    <>
      <div className="fields" role="group" aria-label="Filter by field">
        {[["", "All fields", alumni.length] as const, ...FIELDS.filter((f) => counts[f]).map((f) => [f, f, counts[f]] as const)].map(([v, l, n]) => (
          <button key={l} className="ftab" type="button" aria-pressed={field === v} onClick={() => setField(v)}>
            {l} <span className="n">{n}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label className="search"><span hidden>Search</span>
          <input type="search" placeholder="Search name, job title, employer, college, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search alumni" />
        </label>
        <select aria-label="Open to" value={open} onChange={(e) => setOpen(e.target.value)}>
          <option value="">Open to anything</option>{OPEN_TO.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select aria-label="Graduation decade" value={decade} onChange={(e) => setDecade(e.target.value)}>
          <option value="">Any class year</option>{decades.map((d) => <option key={d} value={d}>{d}s graduates</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); try { localStorage.setItem("sort", e.target.value); } catch {} }}>
          <option value="recent">Newest grads first</option><option value="oldest">Oldest grads first</option>
          <option value="name">Name A–Z</option><option value="title">Job title A–Z</option>
          <option value="senior">Most senior first</option><option value="junior">Early career first</option>
        </select>
        <Link className="btn" href="/alumni/new">+ Add a profile</Link>
      </div>
      <p className="result-line">
        Showing {list.length} of {alumni.length} alumni{field ? ` in ${field}` : ""}{nSample ? ` · ${nSample} are made-up sample profiles` : ""}
      </p>
      <section className="grid" aria-live="polite">
        {!alumni.length && (
          <div className="empty"><h2>No alumni in the directory yet</h2><p>Add the first graduate, with their permission to share contact details.</p>
            <Link className="btn" href="/alumni/new">+ Add a profile</Link></div>
        )}
        {alumni.length > 0 && !list.length && (
          <div className="empty"><h2>No matches</h2><p>Try a different field, or clear the search and filters.</p>
            <button className="btn ghost" type="button" onClick={() => { setField(""); setQ(""); setOpen(""); setDecade(""); }}>Clear filters</button></div>
        )}
        {list.map((a) => (
          <Link key={a.id} href={`/alumni/${a.id}`} className="card">
            <div className="card-top">
              <div className="avatar" aria-hidden="true">{initials(a.name)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3>{a.name}</h3>
                <div className="role">{a.title}{a.organization ? ` · ${a.organization}` : ""}</div>
              </div>
              <span className="year">{classOf(a.class_year)}</span>
            </div>
            {seniority(a.title) > 0 && <div className="level">{LEVELS[seniority(a.title)]}</div>}
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
    </>
  );
}
