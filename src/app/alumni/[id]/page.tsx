import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { LEVELS, SCHOOL, classOf, type AlumniProfile } from "@/lib/constants";
import CopyRow from "@/components/CopyRow";
import { deleteProfile, startConversation } from "@/app/actions";

const safeUrl = (u: string) => { try { const x = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`); return x.protocol.startsWith("http") ? x.href : undefined; } catch { return undefined; } };

export default async function ProfilePage({ params, searchParams }: { params: { id: string }; searchParams: { claimed?: string; error?: string } }) {
  const { supabase, user, member } = await requireMember();
  const { data: a } = await supabase.from("alumni_profiles").select("*").eq("id", params.id).maybeSingle<AlumniProfile>();
  if (!a) notFound();
  const { data: myClaim } = await supabase.from("alumni_profiles").select("id").eq("claimed_by", user.id).maybeSingle();
  const first = a.name.split(" ")[0];
  const isMine = a.claimed_by === user.id;
  const canEdit = isMine || (!a.claimed_by && a.created_by === user.id) || member.is_staff;
  const mailto = a.email
    ? `mailto:${a.email}?subject=${encodeURIComponent(`${SCHOOL} student reaching out`)}&body=${encodeURIComponent(`Hi ${first},\n\nMy name is ${member.full_name}. I found your profile in the ${SCHOOL} alumni network and would love to ask you a few questions about your work as ${a.title ?? "a professional in your field"}.\n\nThank you,\n${member.full_name}`)}`
    : null;

  return (
    <div className="profile">
      <div className="stack" style={{ gap: 18 }}>
        <div>
          <Link href="/" className="small">← Directory</Link>
          <div className="eyebrow" style={{ marginTop: 10 }}>{classOf(a.class_year)}</div>
          <h2>{a.name}</h2>
          <div className="role">{a.title}{a.organization ? ` · ${a.organization}` : ""}</div>
          {a.seniority > 0 && <div className="level" style={{ marginTop: 6 }}>{LEVELS[a.seniority]}</div>}
        </div>
        {searchParams.claimed && <p className="notice">This profile is now linked to your account. Messages sent to it come to you on the site and by email.</p>}
        {searchParams.error && <p className="err">Couldn't start that conversation. Try again.</p>}
        {a.is_sample && <p className="notice">This is a made-up sample profile for demonstrating the directory. The person, email and phone number are fictional, and the site never emails sample profiles.</p>}
        <div className="meta">
          {a.claimed_by && <span className="chip joined">On the network</span>}
          <span className="chip field">{a.field}</span>
          {a.specialty && <span className="chip">{a.specialty}</span>}
          {a.city && <span className="chip">{a.city}</span>}
          {a.college && <span className="chip">{a.college}</span>}
        </div>
        {a.open_to.length > 0 && (
          <div><div className="section-label">Happy to help with</div>
            <div className="meta">{a.open_to.map((o) => <span key={o} className="chip open">{o}</span>)}</div></div>
        )}
        {a.bio && <div><div className="section-label">Path & advice for students</div><div className="advice">{a.bio}</div></div>}
        {canEdit && (
          <div className="actions">
            <Link className="btn ghost small" href={`/alumni/${a.id}/edit`}>Edit profile</Link>
            {member.is_staff && (
              <form action={deleteProfile.bind(null, a.id)}><button className="btn danger small" type="submit">Delete profile</button></form>
            )}
          </div>
        )}
      </div>

      <aside className="panel stack">
        {isMine ? (
          <p className="muted">This is your profile. Messages to it arrive in your Messages tab and at your sign-in email.</p>
        ) : (
          <>
            <form action={startConversation.bind(null, a.id)}>
              <button className="btn" type="submit" style={{ width: "100%" }}>Message {first}</button>
            </form>
            <p className="small muted">
              {a.is_sample
                ? "Sample profile: messages are saved but nobody receives them."
                : a.claimed_by
                  ? `${first} is on the network. Your message goes to their inbox here and to their email.`
                  : a.email && a.consent
                    ? `${first} hasn't joined yet. We'll email your message to them with a link to reply here.`
                    : `${first} hasn't joined yet and has no email listed, so they'll see your message once they join.`}
            </p>
          </>
        )}
        <div className="section-label" style={{ marginTop: 6 }}>Contact</div>
        {a.email && <CopyRow label="Email" value={a.email} />}
        {a.phone && <CopyRow label="Phone" value={a.phone} />}
        {a.linkedin_url && <CopyRow label="LinkedIn" value={a.linkedin_url} href={safeUrl(a.linkedin_url)} />}
        {a.preferred_contact && <CopyRow label="Preferred way to reach" value={a.preferred_contact} />}
        {!a.email && !a.phone && !a.linkedin_url && <p className="muted small">No contact details listed.</p>}
        {mailto && !isMine && <a className="btn ghost small" href={mailto}>Write an email from my own account</a>}
        {!a.claimed_by && !myClaim && !a.is_sample && member.role !== "student" && (
          <div className="stack" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <p className="small"><b>Is this you?</b> Claim this profile to get messages and keep it up to date.</p>
            <Link className="btn ghost small" href={`/alumni/${a.id}/claim`}>Claim this profile</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
