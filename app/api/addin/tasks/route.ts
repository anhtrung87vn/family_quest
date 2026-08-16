import { NextResponse } from "next/server";

// This route exists only to return a clean 404 for browser add-ins
// (e.g. Office Add-in, browser extensions) that probe /api/addin/tasks.
// Without this file, Next.js would log unhandled 404 errors to the console.
export function GET() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}
