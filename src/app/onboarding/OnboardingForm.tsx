"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveMember } from "../actions";
import { FIELDS, type StudentProfile } from "@/lib/constants";
import ListInput from "@/components/ListInput";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : label}</button>;
}
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function OnboardingForm(props: {
  defaults: { full_name: string; role: string; grad_year: number | null; linkedin_url: string };
  student: StudentProfile | null;
  isNew: boolean; next: string; match: { id: string; label: string } | null; memberId: string;
}) {
  const [state, action] = useFormState(saveMember, {});
  const [role, setRole] = useState(props.defaults.role);
  const [removeTranscript, setRemoveTranscript] = useState(false);
  const roles = [["student", "Current student"], ["alum", "Graduate (alum)"], ["teacher", "Teacher or staff"]];
  const st = props.student;

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
      <label className="f">LinkedIn profile URL <small>Optional</small>
        <input id="linkedin_url" name="linkedin_url" type="url" placeholder="https://www.linkedin.com/in/your-name" defaultValue={props.defaults.linkedin_url} />
      </label>

      {role === "student" && (
        <>
          <h3 style={{ fontSize: 19, marginTop: 6 }}>About you</h3>
          <p className="muted small" style={{ margin: "-6px 0 0" }}>
            Graduates you message can see your activities and interests, so they know who's writing. All of this is optional.
          </p>
          <ListInput name="academic" label="Academic activities" initial={st?.academic_activities ?? []}
            hint="Advanced classes, honor societies, academic teams, competitions or awards."
            placeholder="e.g. AP Biology, National Honor Society" />
          <ListInput name="extracurricular" label="Extracurricular activities" initial={st?.extracurriculars ?? []}
            hint="Sports, clubs, arts, jobs, volunteering or anything else you do outside class."
            placeholder="e.g. Varsity soccer, school newspaper" />
          <fieldset>
            <legend>Careers you're interested in</legend>
            <div className="checks">
              {FIELDS.filter((f) => f !== "Other").map((f) => (
                <label key={f}><input type="checkbox" name="interests" value={f} defaultChecked={st?.interests.includes(f)} /> {f}</label>
              ))}
            </div>
          </fieldset>
          <label className="f">Anything more specific? <small>Optional, e.g. "sports medicine" or "designing video games"</small>
            <textarea id="interest_notes" name="interest_notes" rows={2} maxLength={500} defaultValue={st?.interest_notes ?? ""} />
          </label>
          <fieldset>
            <legend>Transcript</legend>
            <p className="muted small" style={{ margin: "0 0 8px" }}>
              Optional. A PDF up to 10 MB. Only you and school staff can open it. Graduates can't see it.
            </p>
            {st?.transcript_path && !removeTranscript && (
              <p className="small" style={{ margin: "0 0 8px" }}>
                Current file: <a href={`/transcript/${props.memberId}`} target="_blank" rel="noopener noreferrer">{st.transcript_name || "transcript.pdf"}</a>
                {st.transcript_uploaded_at && <span className="muted">, uploaded {fmt(st.transcript_uploaded_at)}</span>}.
                Choose a new file to replace it.
              </p>
            )}
            {!removeTranscript && <input id="transcript" name="transcript" type="file" accept="application/pdf,.pdf" />}
            {st?.transcript_path && (
              <label className="checks" style={{ marginTop: 8 }}>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" name="remove_transcript" checked={removeTranscript} onChange={(e) => setRemoveTranscript(e.target.checked)} />
                  Remove my transcript
                </span>
              </label>
            )}
          </fieldset>
        </>
      )}

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
