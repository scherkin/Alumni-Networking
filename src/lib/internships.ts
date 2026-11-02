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
  const posterIds = [...new Set(rows.map((r) => r.posted_by))];
  if (!posterIds.length) return [];

  const [{ data: members }, { data: profiles }] = await Promise.all([
    supabase.from("members").select("id, full_name, role, grad_year, is_staff").in("id", posterIds),
    supabase.from("alumni_profiles").select("id, claimed_by, title, organization").in("claimed_by", posterIds),
  ]);
  const byId = new Map((members ?? []).map((m) => [m.id, m]));
  const profileOf = new Map((profiles ?? []).map((p) => [p.claimed_by, p]));

  return rows.map((r) => {
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
