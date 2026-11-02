import { requireMember } from "@/lib/session";
import Directory from "@/components/Directory";

export default async function Home() {
  const { supabase } = await requireMember();
  const { data } = await supabase
    .from("alumni_profiles")
    .select("id, name, class_year, field, specialty, title, organization, city, college, open_to, is_sample, claimed_by")
    .order("name")
    .limit(5000);
  return <Directory alumni={data ?? []} />;
}
