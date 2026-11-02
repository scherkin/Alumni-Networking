import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { LEVELS, SCHOOL, type AlumniProfile } from "@/lib/constants";
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
          <Link href="/" className="back-link">Back to the directory</Link>
          <h2 style={{ marginTop: 10 }}>{a.name}</h2>
          <div className="role">{a.title}{a.organization ? `, ${a.organization}` : ""}</div>
        </div>
        {searchParams.claimed && <p className="notice">This profile is now linked to your account. Messages sent to it come to you on the site and by email.</p>}
        {searchParams.error && <p className="err">Couldn't start that conversation. Try again.</p>}
        {a.is_sample && <p className="notice">This is a made-up example profile. The email address and phone number are not real, and the site never emails example profiles.</p>}
        <dl className="facts-list">
          <dt>Class of</dt><dd>{a.class_year}</dd>
          <dt>Field</dt><dd>{a.field}{a.specialty ? `, ${a.specialty}` : ""}</dd>
          {a.seniority > 0 && <><dt>Career stage</dt><dd>{LEVELS[a.seniority]}</dd></>}
          {a.city && <><dt>Lives in</dt><dd>{a.city}</dd></>}
          {a.college && <><dt>Studied at</dt><dd>{a.college}</dd></>}
          {a.open_to.length > 0 && <><dt>Will help with</dt><dd>{a.open_to.join(", ")}</dd></>}
          {a.claimed_by && <><dt>On the network</dt><dd>Yes, gets messages here</dd></>}
        </dl>
        {a.bio && <div><div className="section-label">About their work</div><p className="advice">{a.bio}</p></div>}
        {canEdit && (
          <div className="actions">
            <Link className="btn ghost small" href={`/alumni/${a.id}/edit`}>Edit profile</Link>
            {member.is_staff && (
              <form action={deleteProfile.bind(null, a.id)}><button className="btn danger small" type="submit">Delete profile</button></form>
            )}
          </div>
        )}
      </div>

      <aside className="stack" style={{ paddingTop: 14 }}>
        {isMine ? (
          <p className="muted">This is your profile. Messages to it arrive in your Messages tab and at your sign-in email.</p>
        ) : (
          <>
            <form action={startConversation.bind(null, a.id)}>
              <button className="btn" type="submit">Send {first} a message</button>
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
        <div className="section-label" style={{ marginTop: 10 }}>Contact</div>
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
