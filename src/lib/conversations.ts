import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROLE_LABEL, classOf } from "./constants";

export type ConvSummary = {
  id: string; name: string; sub: string; lastText: string; lastFromMe: boolean; lastAt: string; unread: boolean;
  starterId: string; alumniId: string;
};

type Raw = {
  id: string; starter_id: string; alumni_id: string; last_message_at: string;
  alumni_profiles: { name: string; title: string | null; organization: string | null; claimed_by: string | null } | null;
  starter: { full_name: string; role: string; grad_year: number | null } | null;
};
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

/** Conversations the user is part of (or, for staff review, all of them), newest first. */
export async function loadConversations(supabase: SupabaseClient, uid: string, opts: { all?: boolean } = {}) {
  const { data: myProfile } = await supabase.from("alumni_profiles").select("id").eq("claimed_by", uid).maybeSingle();
  let query = supabase.from("conversations")
    .select("id, starter_id, alumni_id, last_message_at, alumni_profiles(name, title, organization, claimed_by), starter:members!conversations_starter_id_fkey(full_name, role, grad_year)")
    .order("last_message_at", { ascending: false }).limit(200);
  if (!opts.all) query = query.or(myProfile ? `starter_id.eq.${uid},alumni_id.eq.${myProfile.id}` : `starter_id.eq.${uid}`);
  const { data } = await query;
  const rows = ((data ?? []) as unknown as Raw[]).map((r) => ({ ...r, alumni_profiles: one(r.alumni_profiles), starter: one(r.starter) }));
  const ids = rows.map((r) => r.id);
  if (!ids.length) return [] as ConvSummary[];

  const [{ data: msgs }, { data: reads }] = await Promise.all([
    supabase.from("messages").select("conversation_id, sender_id, body, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(1000),
    supabase.from("conversation_reads").select("conversation_id, last_read_at").eq("member_id", uid),
  ]);
  const last = new Map<string, { sender_id: string; body: string; created_at: string }>();
  (msgs ?? []).forEach((m) => { if (!last.has(m.conversation_id)) last.set(m.conversation_id, m); });
  const readAt = new Map((reads ?? []).map((r) => [r.conversation_id, r.last_read_at as string]));

  return rows.map((r): ConvSummary => {
    const iAmStarter = r.starter_id === uid;
    const iAmAlum = r.alumni_profiles?.claimed_by === uid;
    const alumName = r.alumni_profiles?.name ?? "Removed profile";
    const starterName = r.starter?.full_name || "A network member";
    const m = last.get(r.id);
    const name = iAmStarter ? alumName : iAmAlum ? starterName : `${starterName} → ${alumName}`;
    const sub = iAmStarter
      ? [r.alumni_profiles?.title, r.alumni_profiles?.organization].filter(Boolean).join(" · ")
      : iAmAlum ? [ROLE_LABEL[r.starter?.role ?? ""], classOf(r.starter?.grad_year)].filter(Boolean).join(" · ") : "Staff review";
    return {
      id: r.id, name, sub, starterId: r.starter_id, alumniId: r.alumni_id,
      lastText: m?.body ?? "", lastFromMe: m?.sender_id === uid, lastAt: m?.created_at ?? r.last_message_at,
      unread: !!m && m.sender_id !== uid && (iAmStarter || iAmAlum) && !(readAt.get(r.id) && readAt.get(r.id)! >= m.created_at),
    };
  });
}
