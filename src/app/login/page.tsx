import { SCHOOL } from "@/lib/constants";
import LoginForm from "./LoginForm";

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div className="narrow stack" style={{ gap: 18, paddingTop: 24 }}>
      <div>
        <h2 className="page-title">Sign in or create your account</h2>
        <p className="muted">
          Graduates can sign in with LinkedIn, which fills in your name and photo and, if your LinkedIn email matches
          your alumni profile, links it to you automatically. Students and staff can use an email sign-in link. New here? Either option creates your account.
        </p>
      </div>
      {searchParams.next?.startsWith("/messages") && (
        <p className="signin-reason">Messaging is for members only. Sign in, or create a free account in one step, to message graduates.</p>
      )}
      {searchParams.error && <p className="notice">Sign-in didn't finish. Try again, or use the email link instead.</p>}
      <LoginForm next={searchParams.next ?? "/"} />
    </div>
  );
}
