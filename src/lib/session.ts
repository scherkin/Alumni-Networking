import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Member } from "./constants";

/** The signed-in user and their member row. Sends people without a member row to onboarding. */
export async function requireMember() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: member } = await supabase.from("members").select("*").eq("id", user.id).maybeSingle<Member>();
  if (!member) redirect("/onboarding");
  return { supabase, user, member };
}
