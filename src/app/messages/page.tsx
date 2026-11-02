import { requireMember } from "@/lib/session";
import { loadConversations } from "@/lib/conversations";
import ConversationList from "@/components/ConversationList";

export default async function Messages() {
  const { supabase, user } = await requireMember();
  const items = await loadConversations(supabase, user.id);
  return (
    <div className="msgs">
      <div className="tlist"><ConversationList items={items} /></div>
      <div className="convo"><p className="sysnote">Choose a conversation. Messages you send also go to the other person's email.</p></div>
    </div>
  );
}
