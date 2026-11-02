import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { SCHOOL, ROLE_LABEL, classOf, type Member } from "@/lib/constants";
import NavTabs from "@/components/NavTabs";

export const metadata: Metadata = {
  title: `${SCHOOL} Alumni Network`,
  description: `Find ${SCHOOL} graduates by career field and reach out for advice.`,
};
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let member: Member | null = null;
  let unread = 0;
  if (user) {
    const { data } = await supabase.from("members").select("*").eq("id", user.id).maybeSingle<Member>();
    member = data;
    if (member) {
      const { data: n } = await supabase.rpc("unread_count");
      unread = typeof n === "number" ? n : 0;
    }
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap"
        />
      </head>
      <body>
        <header className="band">
          <div className="wrap">
            <Link href="/" className="brand">
              <div className="eyebrow">Alumni career network</div>
              <h1>{SCHOOL}</h1>
            </Link>
            {user && (
              <div className="acct">
                {member ? (
                  <>
                    <div className="acct-id">
                      <span className="who">{member.full_name || user.email}</span>
                      <span className="role-tag">
                        {member.is_staff ? "Staff" : ROLE_LABEL[member.role]}
                        {member.grad_year ? ` · ${classOf(member.grad_year)}` : ""}
                      </span>
                    </div>
                    {member.avatar_url && <img className="avatar-img" src={member.avatar_url} alt="" />}
                    <Link href="/onboarding" className="linkbtn">Edit</Link>
                  </>
                ) : (
                  <Link href="/onboarding" className="btn small gold">Finish joining</Link>
                )}
                <form action="/auth/signout" method="post">
                  <button className="linkbtn" type="submit">Sign out</button>
                </form>
              </div>
            )}
          </div>
        </header>
        {member && <NavTabs unread={unread} isStaff={member.is_staff} />}
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
