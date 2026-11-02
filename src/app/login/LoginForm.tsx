"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ next }: { next: string }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ sent?: boolean; error?: string; busy?: boolean }>({});
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function linkedin() {
    setState({ busy: true });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: redirectTo(), scopes: "openid profile email" },
    });
    if (error) setState({ error: "LinkedIn sign-in isn't available right now. Use the email link instead." });
  }

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setState(error ? { error: "Couldn't send the sign-in link. Check the address and try again." } : { sent: true });
  }

  return (
    <div className="panel stack" style={{ gap: 16 }}>
      <button className="btn linkedin" type="button" onClick={linkedin} disabled={state.busy}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>
        Continue with LinkedIn
      </button>
      <div className="muted small" style={{ textAlign: "center" }}>or</div>
      {state.sent ? (
        <p className="ok">Check {email} for a sign-in link. It works once and expires in an hour.</p>
      ) : (
        <form className="stack" onSubmit={magic}>
          <label className="f">Email address
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn ghost" type="submit" disabled={state.busy}>Email me a sign-in link</button>
        </form>
      )}
      {state.error && <p className="err" role="alert">{state.error}</p>}
    </div>
  );
}
