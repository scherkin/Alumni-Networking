"use client";
import { useState } from "react";

/** A short list the person builds one line at a time. Each entry is submitted as a repeated form field. */
export default function ListInput({ name, label, hint, initial, placeholder }: {
  name: string; label: string; hint?: string; initial: string[]; placeholder: string;
}) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);
  const set = (i: number, v: string) => setItems((cur) => cur.map((x, k) => (k === i ? v : x)));
  return (
    <fieldset>
      <legend>{label}</legend>
      {hint && <p className="muted small" style={{ margin: "0 0 8px" }}>{hint}</p>}
      <div className="stack">
        {items.map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <input aria-label={`${label} ${i + 1}`} name={name} value={v} maxLength={120} placeholder={i === 0 ? placeholder : ""}
              onChange={(e) => set(i, e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: "7px 10px", border: "1px solid var(--line-strong)", borderRadius: 4, background: "var(--bg)" }} />
            {items.length > 1 && (
              <button type="button" className="btn ghost small" onClick={() => setItems((cur) => cur.filter((_, k) => k !== i))}
                aria-label={`Remove ${v || "this line"}`}>Remove</button>
            )}
          </div>
        ))}
      </div>
      {items.length < 20 && (
        <button type="button" className="linkbtn small" style={{ marginTop: 8 }} onClick={() => setItems((cur) => [...cur, ""])}>
          Add another
        </button>
      )}
    </fieldset>
  );
}
