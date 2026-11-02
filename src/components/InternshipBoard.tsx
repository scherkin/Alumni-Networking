"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import InternshipCard from "./InternshipCard";
import { GRADE_LEVELS, isClosed, type InternshipView } from "@/lib/constants";

export default function InternshipBoard({ items, canPost }: { items: InternshipView[]; canPost: boolean }) {
  const [pay, setPay] = useState("");
  const [grade, setGrade] = useState("");
  const [field, setField] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const fields = useMemo(() => [...new Set(items.map((i) => i.field).filter(Boolean))] as string[], [items]);
  const list = items.filter((i) =>
    (showClosed || !isClosed(i)) &&
    (!pay || (pay === "paid") === i.paid) &&
    (!grade || i.grade_levels.length === 0 || i.grade_levels.includes(grade)) &&
    (!field || i.field === field));

  if (!items.length)
    return (
      <div className="empty">
        <h2>No internships posted yet</h2>
        <p>Graduates and staff can post openings here with a sign-up link, the number of spots, requirements and pay.</p>
        {canPost && <Link className="btn" href="/internships/new">+ Post the first internship</Link>}
      </div>
    );
  return (
    <>
      <div className="toolbar">
        <select aria-label="Pay" value={pay} onChange={(e) => setPay(e.target.value)}>
          <option value="">Paid and unpaid</option><option value="paid">Paid only</option><option value="unpaid">Unpaid only</option>
        </select>
        <select aria-label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">Any grade</option>{GRADE_LEVELS.map((g) => <option key={g}>{g}</option>)}
        </select>
        {fields.length > 1 && (
          <select aria-label="Field" value={field} onChange={(e) => setField(e.target.value)}>
            <option value="">All fields</option>{fields.map((f) => <option key={f}>{f}</option>)}
          </select>
        )}
        <div className="checks"><label><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show closed</label></div>
      </div>
      <p className="result-line">{list.length} {list.length === 1 ? "internship" : "internships"}</p>
      <div className="intern-grid">
        {list.map((i) => <InternshipCard key={i.id} item={i} />)}
        {!list.length && <div className="empty"><h2>No matches</h2><p>Try different filters.</p></div>}
      </div>
    </>
  );
}
