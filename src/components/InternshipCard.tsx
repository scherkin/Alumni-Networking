import Link from "next/link";
import { isClosed, type InternshipView } from "@/lib/constants";

export const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const safeHref = (u: string) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : undefined; } catch { return undefined; } };

export default function InternshipCard({ item }: { item: InternshipView }) {
  const closed = isClosed(item);
  const href = safeHref(item.signup_url);
  return (
    <article className={`intern ${closed ? "closed" : ""}`}>
      <div className="i-top">
        <h3>{item.role_title}{closed && <span className="i-status">(closed)</span>}</h3>
        <span className="i-pay">{item.paid ? `Paid${item.pay_details ? `, ${item.pay_details}` : ""}` : "Unpaid"}</span>
      </div>
      <p className="i-co">{item.company}{item.location ? `, ${item.location}` : ""}</p>
      <p className="i-desc">{item.description}</p>
      <dl className="i-facts">
        <dt>Openings</dt><dd>{item.spots ? `${item.spots} ${item.spots === 1 ? "intern" : "interns"}` : "Not specified"}</dd>
        <dt>Who can apply</dt><dd>{item.grade_levels.length ? item.grade_levels.join(", ") : "Any student"}</dd>
        {item.min_gpa !== null && <><dt>Minimum GPA</dt><dd>{item.min_gpa.toFixed(1)}</dd></>}
        {item.experience && <><dt>Experience</dt><dd>{item.experience}</dd></>}
        {item.deadline && <><dt>Apply by</dt><dd>{fmtDate(item.deadline)}</dd></>}
        {item.field && <><dt>Field</dt><dd>{item.field}</dd></>}
      </dl>
      <div className="i-foot">
        <span>
          Posted by{" "}
          {item.poster.profileId ? <Link href={`/alumni/${item.poster.profileId}`}>{item.poster.name}</Link> : item.poster.name}
          {item.poster.line && <span className="muted">, {item.poster.line}</span>}
          {item.is_sample && <> <span className="tag">Example</span></>}
        </span>
        <span className="actions">
          {item.canEdit && <Link className="btn ghost small" href={`/internships/${item.id}/edit`}>Edit</Link>}
          {href && !closed && <a className="btn small" href={href} target="_blank" rel="noopener noreferrer">Apply</a>}
        </span>
      </div>
    </article>
  );
}
