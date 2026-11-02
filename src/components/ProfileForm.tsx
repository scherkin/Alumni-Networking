"use client";
import { useFormState, useFormStatus } from "react-dom";
import { saveProfile } from "@/app/actions";
import { FIELDS, OPEN_TO, type AlumniProfile } from "@/lib/constants";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

export default function ProfileForm({ profile, canClaimAsMe }: { profile?: Partial<AlumniProfile>; canClaimAsMe?: boolean }) {
  const [state, action] = useFormState(saveProfile, {});
  const p = profile ?? {};
  return (
    <form action={action} className="panel stack">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="row2">
        <label className="f">Full name *<input id="name" name="name" required defaultValue={p.name ?? ""} /></label>
        <label className="f">Graduation year *<input id="class_year" name="class_year" type="number" min={1900} max={2100} required defaultValue={p.class_year ?? ""} /></label>
      </div>
      <div className="row2">
        <label className="f">Field *<select id="field" name="field" required defaultValue={p.field ?? ""}>
          <option value="">Choose a field</option>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select></label>
        <label className="f">Specialty <small>e.g. Pediatric nursing</small><input id="specialty" name="specialty" defaultValue={p.specialty ?? ""} /></label>
      </div>
      <div className="row2">
        <label className="f">Job title<input id="title" name="title" defaultValue={p.title ?? ""} /></label>
        <label className="f">Employer<input id="organization" name="organization" defaultValue={p.organization ?? ""} /></label>
      </div>
      <div className="row2">
        <label className="f">City / region<input id="city" name="city" defaultValue={p.city ?? ""} /></label>
        <label className="f">College / training<input id="college" name="college" defaultValue={p.college ?? ""} /></label>
      </div>
      <fieldset><legend>Open to helping students with</legend><div className="checks">
        {OPEN_TO.map((o) => <label key={o}><input type="checkbox" name="open_to" value={o} defaultChecked={p.open_to?.includes(o)} /> {o}</label>)}
      </div></fieldset>
      <div className="row2">
        <label className="f">Email<input id="email" name="email" type="email" defaultValue={p.email ?? ""} /></label>
        <label className="f">Phone<input id="phone" name="phone" type="tel" defaultValue={p.phone ?? ""} /></label>
      </div>
      <div className="row2">
        <label className="f">LinkedIn URL<input id="linkedin_url" name="linkedin_url" type="url" placeholder="https://www.linkedin.com/in/…" defaultValue={p.linkedin_url ?? ""} /></label>
        <label className="f">Preferred way to reach<input id="preferred_contact" name="preferred_contact" defaultValue={p.preferred_contact ?? ""} /></label>
      </div>
      <label className="f">Career path & advice for students<textarea id="bio" name="bio" rows={4} defaultValue={p.bio ?? ""} /></label>
      <label className="consent"><input type="checkbox" name="consent" defaultChecked={p.consent} />
        <span>This graduate agreed to share these contact details with current students in the network.</span></label>
      {canClaimAsMe && <label className="consent"><input type="checkbox" name="is_me" /> <span>This is my own profile. Link it to my account.</span></label>}
      {state.error && <p className="err" role="alert">{state.error}</p>}
      <div className="actions"><Submit label={p.id ? "Save changes" : "Add to directory"} /></div>
    </form>
  );
}
