import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import { loadConversations } from "@/lib/conversations";
import { ROLE_LABEL, classOf } from "@/lib/constants";
import { releaseClaim } from "@/app/actions";

export default async function Staff() {
  const { supabase, user, member } = await requireMember();
  if (!member.is_staff) redirect("/");
  const [convs, { data: claimed }, { data: members }] = await Promise.all([
    loadConversations(supabase, user.id, { all: true }),
    supabase.from("alumni_profiles").select("id, name, class_year, claimed_by").not("claimed_by", "is", null).order("name"),
    supabase.from("members").select("id, full_name, role, grad_year, is_staff, created_at").order("created_at", { ascending: false }).limit(500),
  ]);
  const memberName = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  return (
    <div className="stack" style={{ gap: 28 }}>
      <section className="stack">
        <h2 style={{ fontSize: 24 }}>Conversations</h2>
        <p className="muted small">Every conversation on the network, newest first. Open one to read it. Staff can't reply in other people's conversations.</p>
        <div className="panel" style={{ padding: 0 }}>
          {convs.length ? convs.map((c) => (
            <Link key={c.id} href={`/messages/${c.id}`} className="titem">
              <span className="t"><span className="tname">{c.name}</span><span className="snip">{c.lastText || "No messages yet"}</span></span>
              <span className="when">{new Date(c.lastAt).toLocaleDateString("en-US")}</span>
            </Link>
          )) : <p className="muted small" style={{ padding: 16 }}>No conversations yet.</p>}
        </div>
      </section>

      <section className="stack">
        <h2 style={{ fontSize: 24 }}>Claimed profiles</h2>
        <p className="muted small">Release a claim if someone linked a profile that isn't theirs.</p>
        <div className="table-wrap"><table className="list"><thead><tr><th>Profile</th><th>Linked account</th><th></th></tr></thead><tbody>
          {(claimed ?? []).map((p) => (
            <tr key={p.id}>
              <td><Link href={`/alumni/${p.id}`}>{p.name}</Link> · {classOf(p.class_year)}</td>
              <td>{memberName.get(p.claimed_by!) || "Unknown"}</td>
              <td><form action={releaseClaim.bind(null, p.id)}><button className="btn danger small" type="submit">Release</button></form></td>
            </tr>
          ))}
          {!claimed?.length && <tr><td colSpan={3} className="muted">No profiles claimed yet.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="stack">
        <h2 style={{ fontSize: 24 }}>Members</h2>
        <div className="table-wrap"><table className="list"><thead><tr><th>Name</th><th>Role</th><th>Joined</th></tr></thead><tbody>
          {(members ?? []).map((m) => (
            <tr key={m.id}><td>{m.full_name}</td><td>{m.is_staff ? "Staff" : ROLE_LABEL[m.role]}{m.grad_year ? ` · ${classOf(m.grad_year)}` : ""}</td>
              <td>{new Date(m.created_at).toLocaleDateString("en-US")}</td></tr>
          ))}
        </tbody></table></div>
      </section>
    </div>
  );
}
