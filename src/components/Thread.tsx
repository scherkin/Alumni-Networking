"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markRead, sendMessage } from "@/app/actions";

type Msg = { id: string; sender_id: string; body: string; created_at: string; emailed_at: string | null };
const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function Thread(props: {
  conversationId: string; me: string; names: Record<string, string>; initial: Msg[]; canReply: boolean; recipientNote: string;
}) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>(props.initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => { setMsgs(props.initial); }, [props.initial]);

  // Live delivery: new messages in this conversation appear without reloading.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conv-${props.conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${props.conversationId}` },
        (payload) => {
          const m = payload.new as Msg;
          if (!m?.id) return;
          setMsgs((cur) => cur.some((x) => x.id === m.id) ? cur.map((x) => (x.id === m.id ? m : x)) : [...cur, m]);
          if (m.sender_id !== props.me && props.canReply) markRead(props.conversationId);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [props.conversationId, props.me, props.canReply]);

  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [msgs.length]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    setError("");
    start(async () => {
      const r = await sendMessage(props.conversationId, text);
      if (r.error) { setError(r.error); return; }
      setText("");
      router.refresh();
    });
  }

  const nameOf = (id: string) => (id === props.me ? "You" : props.names[id] ?? "A network member");
  return (
    <>
      <div className="cbody" ref={body}>
        {!msgs.length && <p className="sysnote">No messages yet. Introduce yourself and ask one specific question.</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === props.me;
          return (
            <div key={m.id} className={`bubble ${mine ? "mine" : ""}`}>
              {(!mine || !props.canReply) && <span className="from">{nameOf(m.sender_id)}</span>}
              {m.body}
              <span className="ts">{fmt(m.created_at)}{m.emailed_at ? " · emailed" : ""}</span>
            </div>
          );
        })}
      </div>
      {props.canReply ? (
        <>
          <form className="composer" onSubmit={submit}>
            <label htmlFor="msg" hidden>Message</label>
            <textarea id="msg" rows={2} maxLength={4000} placeholder="Write a message… (Ctrl+Enter to send)" value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }} />
            <button className="btn" type="submit" disabled={pending}>{pending ? "Sending…" : "Send"}</button>
          </form>
          <p className="composer-note">{error ? <span className="err">{error}</span> : props.recipientNote}</p>
        </>
      ) : (
        <p className="composer-note" style={{ paddingTop: 10 }}>Staff review: you can read this conversation but not reply in it.</p>
      )}
    </>
  );
}
