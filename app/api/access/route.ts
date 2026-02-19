import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sid = searchParams.get("sid")
  const secret = searchParams.get("secret")

  if (!sid?.trim() || !secret?.trim()) {
    return NextResponse.json({ authorized: false }, { status: 400 })
  }

  const { data } = await supabase
    .from("conversations")
    .select("status, success_secret")
    .eq("session_id", sid)
    .single()

  const authorized =
    data?.status === "passed" && data?.success_secret === secret

  return NextResponse.json({ authorized })
}
