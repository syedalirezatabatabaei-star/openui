import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const threads = db.prepare(`
    SELECT t.id, t.title, t.created_at, t.updated_at,
      (SELECT content FROM messages m WHERE m.thread_id=t.id ORDER BY m.id DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*) FROM messages m WHERE m.thread_id=t.id) AS message_count
    FROM threads t
    ORDER BY t.updated_at DESC
  `).all();
  return NextResponse.json({ threads });
}

export async function POST() {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO threads (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(id, "گفتگوی جدید", now, now);
  return NextResponse.json({ id, title: "گفتگوی جدید", created_at: now, updated_at: now }, { status: 201 });
}
