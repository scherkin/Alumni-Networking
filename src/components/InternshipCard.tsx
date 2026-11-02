import Link from "next/link";
import { isClosed, type InternshipView } from "@/lib/constants";

const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const safeHref = (u: string) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : undefined; } catch { return undefined; } };

export default function InternshipCard({ item, compact = false }: { item: InternshipView; compact?: boolean }) {
  const closed = isClosed(item);
  const href = safeHref(item.signup_url);
  const reqs = [
    item.grade_levels.length ? `Open to: ${item.grade_levels.join(", ")}` : "",
    item.min_gpa !== null ? `Minimum GPA ${item.min_gpa.toFixed(1)}` : "",
  ].filter(Boolean);

  return (
    <article className={`intern ${closed ? "closed" : ""}`}>
      <header className="intern-head">
        <div style={{ minWidth: 0 }}>
          <div className="intern-company">{item.company}</div>
          <h3>{item.role_title}</h3>
        </div>
        <div className="meta" style={{ justifyContent: "flex-end" }}>
          {item.is_sample && <span className="chip sample">Sample</span>}
          {closed ? <span className="chip">Closed</span> : <span className="chip open">Open</span>}
          <span className={`chip ${item.paid ? "paid" : ""}`}>{item.paid ? `Paid${item.pay_details ? ` · ${item.pay_details}` : ""}` : "Unpaid"}</span>
        </div>
      </header>

      <p className="intern-desc">{item.description}</p>

      <dl className="facts">
        <div><dt>Spots</dt><dd>{item.spots ? `${item.spots} ${item.spots === 1 ? "intern" : "interns"}` : "Not set"}</dd></div>
        {item.location && <div><dt>Where</dt><dd>{item.location}</dd></div>}
        {item.deadline && <div><dt>Apply by</dt><dd>{fmtDate(item.deadline)}</dd></div>}
        {item.field && <div><dt>Field</dt><dd>{item.field}</dd></div>}
      </dl>

      {!compact && (reqs.length > 0 || item.experience) && (
        <div className="reqs">
          <div className="section-label">Requirements</div>
          {reqs.length > 0 && <p>{reqs.join(" · ")}</p>}
          {item.experience && <p>{item.experience}</p>}
        </div>
      )}

      <footer className="intern-foot">
        <div className="small" style={{ minWidth: 0 }}>
          Posted by{" "}
          {item.poster.profileId ? <Link href={`/alumni/${item.poster.profileId}`}>{item.poster.name}</Link> : <b>{item.poster.name}</b>}
          {item.poster.line && <span className="muted"> · {item.poster.line}</span>}
        </div>
        <div className="actions">
          {item.canEdit && !compact && <Link className="btn ghost small" href={`/internships/${item.id}/edit`}>Edit</Link>}
          {href && !closed && <a className="btn small" href={href} target="_blank" rel="noopener noreferrer">Sign up ↗</a>}
        </div>
      </footer>
    </article>
  );
}
