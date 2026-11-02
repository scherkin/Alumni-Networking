import { requireMember } from "@/lib/session";
import ProfileForm from "@/components/ProfileForm";

export default async function NewProfile() {
  const { supabase, user, member } = await requireMember();
  const { data: mine } = await supabase.from("alumni_profiles").select("id").eq("claimed_by", user.id).maybeSingle();
  return (
    <div className="narrow stack" style={{ gap: 18, maxWidth: 760 }}>
      <div><div className="eyebrow">Directory</div><h2 style={{ fontSize: 30, marginTop: 6 }}>Add an alumni profile</h2>
        <p className="muted">Only add someone else's contact details if they've agreed to share them with students.</p></div>
      <ProfileForm canClaimAsMe={member.role === "alum" && !mine} />
    </div>
  );
}
