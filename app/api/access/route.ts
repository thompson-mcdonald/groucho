import { NextRequest, NextResponse } from "next/server"
import { getDefaultProjectId } from "@/lib/project-resolution"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sid = searchParams.get("sid")
  const secret = searchParams.get("secret")

  if (!sid?.trim() || !secret?.trim()) {
    return NextResponse.json({ authorized: false }, { status: 400 })
  }

  const project = await getDefaultProjectId()
  if (!project.ok) {
    return NextResponse.json({ authorized: false }, { status: 503 })
  }

  const { data } = await supabase
    .from("sessions")
    .select("status, success_secret")
    .eq("session_id", sid)
    .eq("project_id", project.projectId)
    .maybeSingle()

  const authorized =
    data?.status === "passed" && data?.success_secret === secret

  return NextResponse.json({ authorized })
}
