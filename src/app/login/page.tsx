import { SCHOOL } from "@/lib/constants";
import LoginForm from "./LoginForm";

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div className="narrow stack" style={{ gap: 18, paddingTop: 24 }}>
      <div>
        <div className="eyebrow">Members only</div>
        <h2 style={{ fontSize: 30, marginTop: 6 }}>Sign in to the {SCHOOL} alumni network</h2>
        <p className="muted">
          Graduates can sign in with LinkedIn, which fills in your name and photo and, if your LinkedIn email matches
          your alumni profile, links it to you automatically. Students and staff can use an email sign-in link.
        </p>
      </div>
      {searchParams.error && <p className="notice">Sign-in didn't finish. Try again, or use the email link instead.</p>}
      <LoginForm next={searchParams.next ?? "/"} />
    </div>
  );
}
