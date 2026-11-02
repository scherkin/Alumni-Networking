import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import { classOf } from "@/lib/constants";
import ClaimFlow from "./ClaimFlow";

export default async function ClaimPage({ params }: { params: { id: string } }) {
  const { supabase, user } = await requireMember();
  const { data: a } = await supabase.from("alumni_profiles").select("id, name, class_year, title, claimed_by, is_sample").eq("id", params.id).maybeSingle();
  if (!a) notFound();
  if (a.claimed_by === user.id) redirect(`/alumni/${a.id}`);
  return (
    <div className="narrow stack" style={{ gap: 18 }}>
      <div>
        <Link href={`/alumni/${a.id}`} className="small">← Back to profile</Link>
        <div className="eyebrow" style={{ marginTop: 10 }}>Claim a profile</div>
        <h2 style={{ fontSize: 30, marginTop: 6 }}>{a.name}, {classOf(a.class_year)}</h2>
        <p className="muted">
          To prove it's you, we email a 6-digit code to the address already on this profile. Enter it here to link the
          profile to your account. If you signed in with that same email, it links right away.
        </p>
      </div>
      {a.claimed_by ? (
        <p className="notice">Someone has already claimed this profile. If it's yours, contact school staff.</p>
      ) : (
        <ClaimFlow alumniId={a.id} />
      )}
    </div>
  );
}
