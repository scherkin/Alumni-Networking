"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveInternship } from "@/app/actions";
import { FIELDS, GRADE_LEVELS, type Internship } from "@/lib/constants";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

export default function InternshipForm({ item }: { item?: Internship }) {
  const [state, action] = useFormState(saveInternship, {});
  const [paid, setPaid] = useState(item ? (item.paid ? "yes" : "no") : "");
  const i = item;
  return (
    <form action={action} className="panel stack">
      {i && <input type="hidden" name="id" value={i.id} />}
      <div className="row2">
        <label className="f">Company *<input id="company" name="company" required maxLength={120} defaultValue={i?.company} /></label>
        <label className="f">Internship title *<input id="role_title" name="role_title" required maxLength={120} placeholder="Summer engineering intern" defaultValue={i?.role_title} /></label>
      </div>
      <label className="f">What the intern will do * <small>A few sentences, up to 600 characters.</small>
        <textarea id="description" name="description" required rows={4} maxLength={600} defaultValue={i?.description} /></label>
      <label className="f">Sign-up link * <small>Where students apply.</small>
        <input id="signup_url" name="signup_url" type="url" required placeholder="https://" defaultValue={i?.signup_url} /></label>
      <fieldset>
        <legend>Paid or unpaid? *</legend>
        <div className="checks">
          <label><input type="radio" name="paid" value="yes" checked={paid === "yes"} onChange={() => setPaid("yes")} /> Paid</label>
          <label><input type="radio" name="paid" value="no" checked={paid === "no"} onChange={() => setPaid("no")} /> Unpaid</label>
        </div>
      </fieldset>
      {paid === "yes" && (
        <label className="f">Pay <small>Optional, e.g. $18/hour or $2,000 stipend</small>
          <input id="pay_details" name="pay_details" maxLength={120} defaultValue={i?.pay_details ?? ""} /></label>
      )}
      <div className="row2">
        <label className="f">How many interns? <input id="spots" name="spots" type="number" min={1} max={1000} defaultValue={i?.spots ?? ""} /></label>
        <label className="f">Application deadline <input id="deadline" name="deadline" type="date" defaultValue={i?.deadline ?? ""} /></label>
      </div>
      <div className="row2">
        <label className="f">Location <small>City, or Remote</small><input id="location" name="location" maxLength={120} defaultValue={i?.location ?? ""} /></label>
        <label className="f">Field<select id="field" name="field" defaultValue={i?.field ?? ""}>
          <option value="">Choose a field</option>{FIELDS.map((f) => <option key={f}>{f}</option>)}</select></label>
      </div>
      <fieldset>
        <legend>Who can apply</legend>
        <div className="checks">
          {GRADE_LEVELS.map((g) => <label key={g}><input type="checkbox" name="grade_levels" value={g} defaultChecked={i?.grade_levels.includes(g)} /> {g}</label>)}
        </div>
      </fieldset>
      <div className="row2">
        <label className="f">Minimum GPA <small>Optional</small><input id="min_gpa" name="min_gpa" type="number" step="0.1" min={0} max={5} defaultValue={i?.min_gpa ?? ""} /></label>
        <div />
      </div>
      <label className="f">Experience or skills required <small>Optional, e.g. "Took AP Biology" or "Comfortable with Excel"</small>
        <textarea id="experience" name="experience" rows={2} maxLength={600} defaultValue={i?.experience ?? ""} /></label>
      {i && <div className="checks"><label><input type="checkbox" name="is_open" defaultChecked={i.is_open} /> Still accepting applications</label></div>}
      {state.error && <p className="err" role="alert">{state.error}</p>}
      <div className="actions"><Submit label={i ? "Save changes" : "Post internship"} /></div>
    </form>
  );
}
