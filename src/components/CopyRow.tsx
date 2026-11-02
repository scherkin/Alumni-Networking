"use client";
import { useState } from "react";

export default function CopyRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const [msg, setMsg] = useState("Copy");
  async function copy() {
    try { await navigator.clipboard.writeText(value); setMsg("Copied"); } catch { setMsg("Select it"); }
    setTimeout(() => setMsg("Copy"), 1500);
  }
  return (
    <div className="contact-row">
      <div><div className="k">{label}</div>
        <div className="val">{href ? <a href={href} target="_blank" rel="noopener noreferrer">{value}</a> : value}</div></div>
      <button className="copy" type="button" onClick={copy}>{msg}</button>
    </div>
  );
}
