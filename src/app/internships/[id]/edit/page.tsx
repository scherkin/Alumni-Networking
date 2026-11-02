import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import InternshipForm from "@/components/InternshipForm";
import { deleteInternship } from "@/app/actions";
import type { Internship } from "@/lib/constants";

export default async function EditInternship({ params }: { params: { id: string } }) {
  const { supabase, member } = await requireMember();
  const { data } = await supabase.from("internships").select("*").eq("id", params.id).maybeSingle<Internship>();
  if (!data) notFound();
  if (data.posted_by !== member.id && !member.is_staff) redirect("/internships");
  const item = { ...data, min_gpa: data.min_gpa === null ? null : Number(data.min_gpa) };
  return (
    <div className="narrow stack" style={{ gap: 18, maxWidth: 760 }}>
      <div><div className="eyebrow">Edit internship</div><h2 style={{ fontSize: 30, marginTop: 6 }}>{item.role_title}</h2></div>
      <InternshipForm item={item} />
      <form action={deleteInternship.bind(null, item.id)}>
        <button className="btn danger small" type="submit">Delete this posting</button>
      </form>
    </div>
  );
}
