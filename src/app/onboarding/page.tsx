import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SCHOOL, classOf, type Member } from "@/lib/constants";
import OnboardingForm from "./OnboardingForm";

export default async function Onboarding({ searchParams }: { searchParams: { next?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: member } = await supabase.from("members").select("*").eq("id", user.id).maybeSingle<Member>();

  // Look for an unclaimed profile carrying this person's verified sign-in email.
  let match: { id: string; name: string; class_year: number; title: string | null } | null = null;
  if (user.email && user.email_confirmed_at) {
    const { data: already } = await createAdminClient().from("alumni_profiles").select("id").eq("claimed_by", user.id).maybeSingle();
    if (!already) {
      const { data } = await createAdminClient().from("alumni_profiles")
        .select("id, name, class_year, title").ilike("email", user.email.replace(/[%_\\]/g, "\\$&")).is("claimed_by", null).eq("is_sample", false).limit(1);
      match = data?.[0] ?? null;
    }
  }
  const meta = user.user_metadata ?? {};
  const defaults = {
    full_name: member?.full_name || (meta.full_name as string) || (meta.name as string) || "",
    role: member?.role ?? (match ? "alum" : "student"),
    grad_year: member?.grad_year ?? match?.class_year ?? null,
    linkedin_url: member?.linkedin_url ?? "",
  };

  return (
    <div className="narrow stack" style={{ gap: 18 }}>
      <div>
        <h2 className="page-title">{member ? "Your network details" : `Join the ${SCHOOL} network`}</h2>
        <p className="muted">Signed in as {user.email}. This tells people who's reaching out.</p>
      </div>
      <OnboardingForm
        defaults={defaults}
        isNew={!member}
        next={searchParams.next ?? "/"}
        match={match ? { id: match.id, label: `${match.name}, ${classOf(match.class_year)}${match.title ? ` · ${match.title}` : ""}` } : null}
      />
    </div>
  );
}
