import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Opens a student's transcript. Storage rules decide access: the student and staff get a link that
 * works for one minute; anyone else is refused.
 */
export async function GET(request: NextRequest, { params }: { params: { memberId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { data, error } = await supabase.storage.from("transcripts").createSignedUrl(`${params.memberId}/transcript.pdf`, 60);
  if (error || !data?.signedUrl)
    return new NextResponse("This transcript isn't available to you, or it has been removed.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
