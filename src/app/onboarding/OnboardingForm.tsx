"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveMember } from "../actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

export default function OnboardingForm(props: {
  defaults: { full_name: string; role: string; grad_year: number | null; linkedin_url: string };
  isNew: boolean; next: string; match: { id: string; label: string } | null;
}) {
  const [state, action] = useFormState(saveMember, {});
  const [role, setRole] = useState(props.defaults.role);
  const roles = [["student", "Current student"], ["alum", "Graduate (alum)"], ["teacher", "Teacher or staff"]];

  return (
    <form action={action} className="panel stack">
      <input type="hidden" name="next" value={props.next} />
      <label className="f">Your name<input id="full_name" name="full_name" required defaultValue={props.defaults.full_name} /></label>
      <fieldset>
        <legend>I am a…</legend>
        <div className="checks">
          {roles.map(([v, l]) => (
            <label key={v}><input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} /> {l}</label>
          ))}
        </div>
      </fieldset>
      {role !== "teacher" && (
        <label className="f">Graduation year <small>Students: the year you'll graduate</small>
          <input id="grad_year" name="grad_year" type="number" min={1900} max={2100} defaultValue={props.defaults.grad_year ?? ""} />
        </label>
      )}
      <label className="f">LinkedIn profile URL <small>Optional. Shown on your account so people can look you up.</small>
        <input id="linkedin_url" name="linkedin_url" type="url" placeholder="https://www.linkedin.com/in/your-name" defaultValue={props.defaults.linkedin_url} />
      </label>
      {props.match && role === "alum" && (
        <label className="consent">
          <input type="checkbox" name="claim_match" value={props.match.id} defaultChecked />
          <span>We found an alumni profile with your email address: <b>{props.match.label}</b>. Link it to your account so messages to it reach you.</span>
        </label>
      )}
      {state.error && <p className="err" role="alert">{state.error}</p>}
      <div className="actions"><Submit label={props.isNew ? "Join the network" : "Save"} /></div>
    </form>
  );
}
