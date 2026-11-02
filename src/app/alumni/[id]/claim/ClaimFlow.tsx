"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestClaimCode, verifyClaimCode } from "@/app/actions";

export default function ClaimFlow({ alumniId }: { alumniId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});

  const request = () => start(async () => {
    const r = await requestClaimCode(alumniId);
    setMsg(r);
    if (r.claimed) { router.push(`/alumni/${alumniId}?claimed=1`); router.refresh(); }
    else if (r.ok) setSent(true);
  });
  const verify = (e: React.FormEvent) => { e.preventDefault(); start(async () => { const r = await verifyClaimCode(alumniId, code); if (r?.error) setMsg(r); }); };

  return (
    <div className="panel stack">
      {!sent ? (
        <button className="btn" type="button" onClick={request} disabled={pending}>{pending ? "Sending…" : "Email me a code"}</button>
      ) : (
        <form className="stack" onSubmit={verify}>
          <label className="f">6-digit code
            <input className="code-input" id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <div className="actions">
            <button className="btn" type="submit" disabled={pending}>{pending ? "Checking…" : "Verify and claim"}</button>
            <button className="btn ghost small" type="button" onClick={request} disabled={pending}>Send a new code</button>
          </div>
        </form>
      )}
      {msg.ok && <p className="ok">{msg.ok}</p>}
      {msg.error && <p className="err" role="alert">{msg.error}</p>}
    </div>
  );
}
