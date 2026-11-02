import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLE_LABEL, classOf, type Internship, type InternshipView, type Member } from "./constants";

/** Load internships and attach who posted each one (name, role, linked alumni profile). */
export async function loadInternships(
  supabase: SupabaseClient, me: Member, opts: { limit?: number; openOnly?: boolean; id?: string } = {}
): Promise<InternshipView[]> {
  let q = supabase.from("internships").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 300);
  if (opts.openOnly) q = q.eq("is_open", true);
  if (opts.id) q = q.eq("id", opts.id);
  const { data } = await q;
  const rows = (data ?? []) as Internship[];
  if (!rows.length) return [];
  const posterIds = [...new Set(rows.map((r) => r.posted_by).filter(Boolean))] as string[];
  const sampleIds = [...new Set(rows.map((r) => r.sample_poster_id).filter(Boolean))] as string[];

  const [{ data: members }, { data: profiles }, { data: samplePosters }] = await Promise.all([
    posterIds.length ? supabase.from("members").select("id, full_name, role, grad_year, is_staff").in("id", posterIds) : Promise.resolve({ data: [] as any[] }),
    posterIds.length ? supabase.from("alumni_profiles").select("id, claimed_by, title, organization").in("claimed_by", posterIds) : Promise.resolve({ data: [] as any[] }),
    sampleIds.length ? supabase.from("alumni_profiles").select("id, name, class_year, title, organization").in("id", sampleIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const byId = new Map((members ?? []).map((m) => [m.id, m]));
  const profileOf = new Map((profiles ?? []).map((p) => [p.claimed_by, p]));
  const sampleOf = new Map((samplePosters ?? []).map((p) => [p.id, p]));

  return rows.map((r) => {
    if (!r.posted_by) {
      // Made-up posting credited to a made-up alumni profile.
      const sp = r.sample_poster_id ? sampleOf.get(r.sample_poster_id) : null;
      const line = [classOf(sp?.class_year), sp?.title && sp?.organization ? `${sp.title} at ${sp.organization}` : sp?.title].filter(Boolean).join(" · ");
      return {
        ...r, min_gpa: r.min_gpa === null ? null : Number(r.min_gpa),
        poster: { name: sp?.name ?? "Sample poster", line, profileId: sp?.id ?? null },
        canEdit: me.is_staff,
      };
    }
    const m = byId.get(r.posted_by);
    const p = profileOf.get(r.posted_by);
    const line = [
      m?.is_staff ? "Staff" : ROLE_LABEL[m?.role ?? ""],
      classOf(m?.grad_year),
      p?.title && p?.organization ? `${p.title} at ${p.organization}` : p?.title,
    ].filter(Boolean).join(" · ");
    return {
      ...r,
      min_gpa: r.min_gpa === null ? null : Number(r.min_gpa),
      poster: { name: m?.full_name || "A network member", line, profileId: p?.id ?? null },
      canEdit: r.posted_by === me.id || me.is_staff,
    };
  });
}

export const canPostInternships = (m: Member) => m.role === "alum" || m.role === "teacher" || m.is_staff;
