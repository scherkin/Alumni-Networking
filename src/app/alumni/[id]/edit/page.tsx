import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import ProfileForm from "@/components/ProfileForm";
import type { AlumniProfile } from "@/lib/constants";

export default async function EditProfile({ params }: { params: { id: string } }) {
  const { supabase, user, member } = await requireMember();
  const { data: p } = await supabase.from("alumni_profiles").select("*").eq("id", params.id).maybeSingle<AlumniProfile>();
  if (!p) notFound();
  const canEdit = p.claimed_by === user.id || (!p.claimed_by && p.created_by === user.id) || member.is_staff;
  if (!canEdit) redirect(`/alumni/${p.id}`);
  return (
    <div className="narrow stack" style={{ gap: 18, maxWidth: 760 }}>
      <div><div className="eyebrow">Edit profile</div><h2 style={{ fontSize: 30, marginTop: 6 }}>{p.name}</h2></div>
      <ProfileForm profile={p} />
    </div>
  );
}
