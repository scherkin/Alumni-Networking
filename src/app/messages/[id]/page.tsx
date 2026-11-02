import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { loadConversations } from "@/lib/conversations";
import ConversationList from "@/components/ConversationList";
import Thread from "@/components/Thread";

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const { supabase, user, member } = await requireMember();
  const { data: conv } = await supabase.from("conversations")
    .select("id, starter_id, alumni_id, alumni_profiles(id, name, title, organization, claimed_by, email, consent, is_sample), starter:members!conversations_starter_id_fkey(id, full_name)")
    .eq("id", params.id).maybeSingle();
  if (!conv) notFound();
  const alum = (Array.isArray(conv.alumni_profiles) ? conv.alumni_profiles[0] : conv.alumni_profiles) as
    { id: string; name: string; title: string | null; organization: string | null; claimed_by: string | null; email: string | null; consent: boolean; is_sample: boolean } | null;
  const starter = (Array.isArray(conv.starter) ? conv.starter[0] : conv.starter) as { id: string; full_name: string } | null;
  const participant = conv.starter_id === user.id || alum?.claimed_by === user.id;

  const [items, { data: messages }] = await Promise.all([
    loadConversations(supabase, user.id, { all: !participant && member.is_staff }),
    supabase.from("messages").select("id, sender_id, body, created_at, emailed_at").eq("conversation_id", conv.id).order("created_at").limit(500),
  ]);
  if (participant)
    await supabase.from("conversation_reads").upsert({ conversation_id: conv.id, member_id: user.id, last_read_at: new Date().toISOString() });

  const summary = items.find((i) => i.id === conv.id);
  const names: Record<string, string> = {};
  if (starter) names[starter.id] = starter.full_name || "A network member";
  if (alum?.claimed_by) names[alum.claimed_by] = alum.name;

  const recipientNote = !participant ? "" : conv.starter_id === user.id
    ? alum?.is_sample ? "Sample profile: messages are saved, but nobody receives them."
      : alum?.claimed_by ? `Also emailed to ${alum.name.split(" ")[0]}.`
      : alum?.email && alum.consent ? `${alum.name.split(" ")[0]} hasn't joined yet. Each message is emailed to them with a link to reply here.`
      : `${alum?.name.split(" ")[0] ?? "They"} hasn't joined yet and has no email listed. They'll see this when they join.`
    : `Also emailed to ${starter?.full_name.split(" ")[0] || "them"}.`;

  return (
    <div className="msgs open">
      <div className="tlist"><ConversationList items={items} activeId={conv.id} base={!participant && member.is_staff ? "/messages" : "/messages"} /></div>
      <div className="convo">
        <div className="chead">
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <Link className="btn ghost small back" href="/messages">Back</Link>
            <div style={{ minWidth: 0 }}>
              <span className="tname">{summary?.name ?? alum?.name}</span>
              <span className="role small">{summary?.sub}</span>
            </div>
          </div>
          {alum && <Link className="btn ghost small" href={`/alumni/${alum.id}`}>Profile</Link>}
        </div>
        <Thread
          conversationId={conv.id}
          me={user.id}
          names={names}
          initial={messages ?? []}
          canReply={participant}
          recipientNote={recipientNote}
        />
      </div>
    </div>
  );
}
