"use server";

import { createHash, randomInt, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDeliverable, sendClaimCodeEmail, sendMessageEmail } from "@/lib/email";
import { FIELDS, GRADE_LEVELS, OPEN_TO, ROLE_LABEL, SCHOOL, classOf, type Member } from "@/lib/constants";

type Result = { error?: string; ok?: string };

async function current() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: member } = await supabase.from("members").select("*").eq("id", user.id).maybeSingle<Member>();
  return { supabase, user, member };
}
async function currentMember() {
  const ctx = await current();
  if (!ctx.member) redirect("/onboarding");
  return { ...ctx, member: ctx.member! };
}
const str = (v: FormDataEntryValue | null, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const staffEmails = () =>
  (process.env.STAFF_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/* ------------------------------------------------------------------ joining */

const MAX_TRANSCRIPT_BYTES = 10 * 1024 * 1024;

/** Activity lists arrive as repeated form fields; keep up to 20 non-empty, distinct entries. */
function listFrom(form: FormData, name: string) {
  const items = form.getAll(name).map((v) => (typeof v === "string" ? v.trim().slice(0, 120) : "")).filter(Boolean);
  return [...new Set(items)].slice(0, 20);
}

/** Check an uploaded transcript before anything is saved. Returns nothing when no file was chosen. */
async function readTranscript(form: FormData): Promise<{ error?: string; bytes?: Uint8Array; name?: string }> {
  const file = form.get("transcript");
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > MAX_TRANSCRIPT_BYTES) return { error: "Transcripts can be up to 10 MB. Try saving a smaller PDF." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // "%PDF"
  if (!isPdf) return { error: "That file isn't a PDF. Save your transcript as a PDF and upload it again." };
  return { bytes, name: file.name.slice(0, 200) };
}

export async function saveMember(_: Result, form: FormData): Promise<Result> {
  const { supabase, user, member } = await current();
  const role = str(form.get("role")) as Member["role"];
  if (!["student", "alum", "teacher"].includes(role)) return { error: "Choose how you're connected to the school." };
  const full_name = str(form.get("full_name"), 120);
  if (!full_name) return { error: "Add your name so people know who's writing." };
  const gradRaw = parseInt(str(form.get("grad_year")), 10);
  const grad_year = role === "teacher" || Number.isNaN(gradRaw) ? null : gradRaw;
  const linkedin_url = str(form.get("linkedin_url"), 300) || null;
  if (linkedin_url && !/^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(linkedin_url))
    return { error: "LinkedIn links start with https://www.linkedin.com/" };
  const transcript = role === "student" ? await readTranscript(form) : {};
  if (transcript.error) return { error: transcript.error };
  const avatar_url = member?.avatar_url ?? (user.user_metadata?.picture as string | undefined) ?? null;
  const row = { full_name, role, grad_year, linkedin_url, avatar_url, updated_at: new Date().toISOString() };

  const { error } = member
    ? await supabase.from("members").update(row).eq("id", user.id)
    : await supabase.from("members").insert({ id: user.id, ...row });
  if (error) return { error: "Couldn't save your details. Try again." };

  const admin = createAdminClient();
  if (user.email && staffEmails().includes(user.email.toLowerCase()))
    await admin.from("members").update({ is_staff: true }).eq("id", user.id);

  // A verified sign-in email that matches an unclaimed profile is proof enough to claim it.
  const matchId = str(form.get("claim_match"));
  if (matchId && user.email_confirmed_at && user.email) {
    const { data: p } = await admin.from("alumni_profiles").select("id, email, claimed_by").eq("id", matchId).maybeSingle();
    const { data: already } = await admin.from("alumni_profiles").select("id").eq("claimed_by", user.id).maybeSingle();
    if (p && !p.claimed_by && !already && p.email?.toLowerCase() === user.email.toLowerCase()) {
      await admin.from("alumni_profiles").update({ claimed_by: user.id }).eq("id", p.id).is("claimed_by", null);
      await admin.from("members").update({ role: "alum" }).eq("id", user.id);
    }
  }
  if (role === "student") {
    const now = new Date().toISOString();
    const details: Record<string, unknown> = {
      member_id: user.id,
      academic_activities: listFrom(form, "academic"),
      extracurriculars: listFrom(form, "extracurricular"),
      interests: FIELDS.filter((f) => form.getAll("interests").includes(f)),
      interest_notes: str(form.get("interest_notes"), 500) || null,
      updated_at: now,
    };
    // Each student has one transcript file, replaced on each upload.
    const path = `${user.id}/transcript.pdf`;
    if (form.get("remove_transcript") === "on") {
      await supabase.storage.from("transcripts").remove([path]);
      Object.assign(details, { transcript_path: null, transcript_name: null, transcript_uploaded_at: null });
    } else if (transcript.bytes) {
      const { error: upErr } = await supabase.storage.from("transcripts")
        .upload(path, transcript.bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) return { error: "Your details were saved, but the transcript didn't upload. Try again." };
      Object.assign(details, { transcript_path: path, transcript_name: transcript.name, transcript_uploaded_at: now });
    }
    const { error: spErr } = await supabase.from("student_profiles").upsert(details);
    if (spErr) return { error: "Your account was saved, but your activities and interests weren't. Try again." };
  }

  revalidatePath("/", "layout");
  redirect(str(form.get("next")) || "/");
}

/* ------------------------------------------------------------------ claiming */

const hashCode = (alumniId: string, memberId: string, code: string) =>
  createHash("sha256").update(`${process.env.CLAIM_CODE_SECRET}:${alumniId}:${memberId}:${code}`).digest("hex");
const maskEmail = (e: string) => e.replace(/^(.)(.*)(.@.*)$/, (_, a, mid: string, b) => a + "•".repeat(Math.min(mid.length, 6)) + b);

export async function requestClaimCode(alumniId: string): Promise<Result & { claimed?: boolean }> {
  const { user, member } = await currentMember();
  const admin = createAdminClient();
  const { data: p } = await admin.from("alumni_profiles").select("id, name, email, is_sample, claimed_by").eq("id", alumniId).maybeSingle();
  if (!p) return { error: "That profile no longer exists." };
  if (p.claimed_by) return { error: p.claimed_by === user.id ? "You've already claimed this profile." : "Someone has already claimed this profile. If it's yours, contact school staff." };
  const { data: mine } = await admin.from("alumni_profiles").select("id").eq("claimed_by", user.id).maybeSingle();
  if (mine) return { error: "You've already claimed a profile. Each account can claim one." };

  // Signed in with the same verified email that's on the profile: claim right away.
  if (user.email_confirmed_at && user.email && p.email?.toLowerCase() === user.email.toLowerCase() && !p.is_sample) {
    await admin.from("alumni_profiles").update({ claimed_by: user.id }).eq("id", p.id).is("claimed_by", null);
    await admin.from("members").update({ role: "alum" }).eq("id", user.id);
    revalidatePath(`/alumni/${p.id}`);
    return { claimed: true, ok: "Your sign-in email matches this profile, so it's now yours." };
  }
  if (!isDeliverable(p.email, p.is_sample))
    return { error: p.is_sample ? "This is a made-up sample profile, so it can't be claimed." : "This profile has no email address to verify with. Ask school staff to link it for you." };

  const { data: existing } = await admin.from("claim_codes").select("sent_at").eq("alumni_id", p.id).maybeSingle();
  if (existing && Date.now() - new Date(existing.sent_at).getTime() < 60_000)
    return { error: "A code was sent less than a minute ago. Wait a moment, then try again." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await admin.from("claim_codes").upsert({
    alumni_id: p.id, member_id: user.id, code_hash: hashCode(p.id, user.id, code), attempts: 0,
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), sent_at: new Date().toISOString(),
  });
  const sent = await sendClaimCodeEmail({ to: p.email!, profileName: p.name, requesterName: member.full_name || "Someone", code });
  if (!sent) return { error: "The code email couldn't be sent. Try again in a few minutes." };
  return { ok: `We emailed a 6-digit code to ${maskEmail(p.email!)}, the address on this profile.` };
}

export async function verifyClaimCode(alumniId: string, code: string): Promise<Result> {
  const { user } = await currentMember();
  const admin = createAdminClient();
  const { data: row } = await admin.from("claim_codes").select("*").eq("alumni_id", alumniId).maybeSingle();
  if (!row || row.member_id !== user.id) return { error: "Request a code first." };
  if (new Date(row.expires_at).getTime() < Date.now()) return { error: "That code has expired. Request a new one." };
  if (row.attempts >= 5) return { error: "Too many wrong tries. Request a new code." };

  const given = Buffer.from(hashCode(alumniId, user.id, code.replace(/\D/g, "")));
  const want = Buffer.from(row.code_hash);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    await admin.from("claim_codes").update({ attempts: row.attempts + 1 }).eq("alumni_id", alumniId);
    return { error: `That code doesn't match. ${4 - row.attempts} tries left.` };
  }
  const { data: claimed } = await admin.from("alumni_profiles").update({ claimed_by: user.id })
    .eq("id", alumniId).is("claimed_by", null).select("id");
  await admin.from("claim_codes").delete().eq("alumni_id", alumniId);
  if (!claimed?.length) return { error: "Someone else claimed this profile first. Contact school staff." };
  await admin.from("members").update({ role: "alum" }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect(`/alumni/${alumniId}?claimed=1`);
}

export async function releaseClaim(alumniId: string) {
  const { member } = await currentMember();
  if (!member.is_staff) return;
  await createAdminClient().from("alumni_profiles").update({ claimed_by: null }).eq("id", alumniId);
  revalidatePath("/staff");
}

/* ------------------------------------------------------------------ profiles */

export async function saveProfile(_: Result, form: FormData): Promise<Result> {
  const { supabase, user, member } = await currentMember();
  const id = str(form.get("id"));
  const classYear = parseInt(str(form.get("class_year")), 10);
  const row = {
    name: str(form.get("name"), 120),
    class_year: classYear,
    field: str(form.get("field")),
    specialty: str(form.get("specialty")) || null,
    title: str(form.get("title")) || null,
    organization: str(form.get("organization")) || null,
    city: str(form.get("city")) || null,
    college: str(form.get("college")) || null,
    open_to: OPEN_TO.filter((o) => form.getAll("open_to").includes(o)),
    email: str(form.get("email")) || null,
    phone: str(form.get("phone"), 40) || null,
    linkedin_url: str(form.get("linkedin_url")) || null,
    preferred_contact: str(form.get("preferred_contact")) || null,
    bio: str(form.get("bio"), 4000) || null,
    consent: form.get("consent") === "on",
    updated_at: new Date().toISOString(),
  };
  if (!row.name || Number.isNaN(classYear) || !FIELDS.includes(row.field))
    return { error: "Add a name, graduation year and field." };
  if ((row.email || row.phone || row.linkedin_url) && !row.consent)
    return { error: "Tick the consent box to confirm this graduate agreed to share their contact details, or remove them." };

  if (id) {
    const { data, error } = await supabase.from("alumni_profiles").update(row).eq("id", id).select("id");
    if (error || !data?.length) return { error: "You can only edit your own profile, or ones you added that nobody has claimed." };
    revalidatePath(`/alumni/${id}`);
    redirect(`/alumni/${id}`);
  }
  const { data, error } = await supabase.from("alumni_profiles").insert({ ...row, created_by: user.id }).select("id").single();
  if (error || !data) return { error: "Couldn't add the profile. Try again." };
  if (form.get("is_me") === "on" && member.role === "alum") {
    const admin = createAdminClient();
    const { data: mine } = await admin.from("alumni_profiles").select("id").eq("claimed_by", user.id).maybeSingle();
    if (!mine) await admin.from("alumni_profiles").update({ claimed_by: user.id }).eq("id", data.id).is("claimed_by", null);
  }
  revalidatePath("/");
  redirect(`/alumni/${data.id}`);
}

export async function deleteProfile(id: string) {
  const { supabase, member } = await currentMember();
  if (!member.is_staff) return;
  await supabase.from("alumni_profiles").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}

/* ------------------------------------------------------------------ messaging */

export async function startConversation(alumniId: string) {
  const { supabase, user } = await currentMember();
  const { data: existing } = await supabase.from("conversations").select("id")
    .eq("starter_id", user.id).eq("alumni_id", alumniId).maybeSingle();
  if (existing) redirect(`/messages/${existing.id}`);
  const { data, error } = await supabase.from("conversations").insert({ starter_id: user.id, alumni_id: alumniId }).select("id").single();
  if (error || !data) redirect(`/alumni/${alumniId}?error=message`);
  redirect(`/messages/${data.id}`);
}

export async function sendMessage(conversationId: string, raw: string): Promise<Result & { id?: string; emailed?: boolean }> {
  const { supabase, user, member } = await currentMember();
  const body = raw.trim();
  if (!body) return { error: "Write a message first." };
  if (body.length > 4000) return { error: "Messages can be up to 4,000 characters." };

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true })
    .eq("sender_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 40) return { error: "You've sent a lot of messages in the last hour. Try again later." };

  const { data: conv } = await supabase.from("conversations")
    .select("id, starter_id, alumni_id, alumni_profiles(name, email, consent, is_sample, claimed_by)")
    .eq("id", conversationId).maybeSingle();
  if (!conv) return { error: "Conversation not found." };
  const alum = (Array.isArray(conv.alumni_profiles) ? conv.alumni_profiles[0] : conv.alumni_profiles) as
    { name: string; email: string | null; consent: boolean; is_sample: boolean; claimed_by: string | null } | null;

  const { data: msg, error } = await supabase.from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body }).select("id").single();
  if (error || !msg) return { error: "Only the people in this conversation can send messages here." };
  await supabase.from("conversation_reads").upsert({ conversation_id: conversationId, member_id: user.id, last_read_at: new Date().toISOString() });

  // Email a copy to the other side.
  const admin = createAdminClient();
  let to: string | null | undefined = null;
  let joinNeeded = false;
  if (alum && !alum.is_sample) {
    if (user.id === conv.starter_id) {
      if (alum.claimed_by) to = (await admin.auth.admin.getUserById(alum.claimed_by)).data.user?.email;
      else if (alum.consent) { to = alum.email; joinNeeded = true; }
    } else {
      to = (await admin.auth.admin.getUserById(conv.starter_id)).data.user?.email;
    }
  }
  let emailed = false;
  if (isDeliverable(to)) {
    const senderLine = [member.is_staff ? "Staff" : ROLE_LABEL[member.role], classOf(member.grad_year), SCHOOL].filter(Boolean).join(" · ");
    emailed = await sendMessageEmail({ to: to!, senderName: member.full_name || "A network member", senderLine, body, conversationId, joinNeeded });
    if (emailed) await admin.from("messages").update({ emailed_at: new Date().toISOString() }).eq("id", msg.id);
  }
  revalidatePath("/messages", "layout");
  return { id: msg.id, emailed };
}

export async function markRead(conversationId: string) {
  const { supabase, user } = await currentMember();
  await supabase.from("conversation_reads").upsert({ conversation_id: conversationId, member_id: user.id, last_read_at: new Date().toISOString() });
}

/* ------------------------------------------------------------------ internships */

export async function saveInternship(_: Result, form: FormData): Promise<Result> {
  const { supabase, user, member } = await currentMember();
  if (!(member.role === "alum" || member.role === "teacher" || member.is_staff))
    return { error: "Only graduates and staff can post internships." };
  const id = str(form.get("id"));
  const spots = parseInt(str(form.get("spots")), 10);
  const gpa = parseFloat(str(form.get("min_gpa")));
  const paid = str(form.get("paid"));
  const signup_url = str(form.get("signup_url"), 500);
  const row = {
    company: str(form.get("company"), 120),
    role_title: str(form.get("role_title"), 120),
    description: str(form.get("description"), 600),
    signup_url,
    spots: Number.isNaN(spots) ? null : spots,
    grade_levels: GRADE_LEVELS.filter((g) => form.getAll("grade_levels").includes(g)),
    min_gpa: Number.isNaN(gpa) ? null : gpa,
    experience: str(form.get("experience"), 600) || null,
    paid: paid === "yes",
    pay_details: paid === "yes" ? str(form.get("pay_details"), 120) || null : null,
    location: str(form.get("location"), 120) || null,
    field: FIELDS.includes(str(form.get("field"))) ? str(form.get("field")) : null,
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(str(form.get("deadline"))) ? str(form.get("deadline")) : null,
    is_open: id ? form.get("is_open") === "on" : true,
    updated_at: new Date().toISOString(),
  };
  if (!row.company || !row.role_title || !row.description) return { error: "Add the company, the internship title and a short description." };
  if (!/^https?:\/\/\S+$/i.test(signup_url)) return { error: "Add the sign-up link, starting with https://" };
  if (paid !== "yes" && paid !== "no") return { error: "Say whether the internship is paid or unpaid." };
  if (row.spots !== null && (row.spots < 1 || row.spots > 1000)) return { error: "Spots must be between 1 and 1,000." };
  if (row.min_gpa !== null && (row.min_gpa < 0 || row.min_gpa > 5)) return { error: "Minimum GPA must be between 0 and 5." };

  if (id) {
    const { data, error } = await supabase.from("internships").update(row).eq("id", id).select("id");
    if (error || !data?.length) return { error: "You can only edit internships you posted." };
  } else {
    const { error } = await supabase.from("internships").insert({ ...row, posted_by: user.id });
    if (error) return { error: "Couldn't post the internship. Try again." };
  }
  revalidatePath("/internships");
  revalidatePath("/");
  redirect("/internships");
}

export async function deleteInternship(id: string) {
  const { supabase } = await currentMember();
  await supabase.from("internships").delete().eq("id", id);
  revalidatePath("/internships");
  revalidatePath("/");
  redirect("/internships");
}
