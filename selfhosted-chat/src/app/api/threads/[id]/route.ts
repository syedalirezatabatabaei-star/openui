import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();
  const thread = db.prepare("SELECT id, title, created_at, updated_at FROM threads WHERE id = ?").get(id);
  if (!thread) return NextResponse.json({ error: "گفتگو پیدا نشد." }, { status: 404 });
  const messages = db.prepare(
    "SELECT id, thread_id, role, content, created_at FROM messages WHERE thread_id = ? ORDER BY id ASC"
  ).all(id);
  return NextResponse.json({ thread, messages });
}
