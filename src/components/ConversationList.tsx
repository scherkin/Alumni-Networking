import Link from "next/link";
import type { ConvSummary } from "@/lib/conversations";

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ConversationList({ items, activeId, base = "/messages" }: { items: ConvSummary[]; activeId?: string; base?: string }) {
  if (!items.length)
    return <p className="muted small" style={{ padding: 16 }}>No conversations yet. Open someone's profile in the Directory and choose <b>Message</b>.</p>;
  return (
    <>
      {items.map((c) => (
        <Link key={c.id} href={`${base}/${c.id}`} className="titem" aria-current={c.id === activeId ? "page" : undefined}>
          <span className={`dot ${c.unread ? "" : "off"}`} aria-label={c.unread ? "Unread" : undefined} />
          <span className="t">
            <span className="tname">{c.name}</span>
            <span className="snip">{c.lastFromMe ? "You: " : ""}{c.lastText || "No messages yet"}</span>
          </span>
          <span className="when">{fmt(c.lastAt)}</span>
        </Link>
      ))}
    </>
  );
}
