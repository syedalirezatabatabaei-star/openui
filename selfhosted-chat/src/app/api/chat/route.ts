import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  error?: { message?: string };
};

export async function POST(request: Request) {
  let body: { threadId?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست JSON معتبر نیست." }, { status: 400 });
  }

  const threadId = typeof body.threadId === "string" ? body.threadId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!threadId || !message) {
    return NextResponse.json({ error: "شناسه گفتگو و متن پیام الزامی است." }, { status: 400 });
  }
  if (message.length > 20000) {
    return NextResponse.json({ error: "پیام بیش از حد طولانی است." }, { status: 413 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "متغیر OPENAI_API_KEY روی سرور تنظیم نشده است." }, { status: 500 });
  }

  const db = getDb();
  const thread = db.prepare("SELECT id FROM threads WHERE id = ?").get(threadId);
  if (!thread) return NextResponse.json({ error: "گفتگو پیدا نشد؛ صفحه را تازه‌سازی کنید." }, { status: 404 });

  const now = new Date().toISOString();
  const insertMessage = db.prepare(
    "INSERT INTO messages (thread_id, role, content, created_at) VALUES (?, ?, ?, ?)"
  );
  insertMessage.run(threadId, "user", message, now);
  db.prepare(
    "UPDATE threads SET title = CASE WHEN title = 'گفتگوی جدید' THEN ? ELSE title END, updated_at = ? WHERE id = ?"
  ).run(message.slice(0, 70), now, threadId);

  const history = db.prepare(
    "SELECT role, content FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT 40"
  ).all(threadId).reverse() as Array<{ role: "user" | "assistant"; content: string }>;

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.gapgpt.app/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: history, stream: false }),
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    return NextResponse.json({ error: "اتصال به سرویس مدل برقرار نشد؛ تنظیمات شبکه و آدرس API را بررسی کنید." }, { status: 502 });
  }

  const result = await upstream.json().catch(() => ({})) as ChatCompletionResponse;
  if (!upstream.ok) {
    console.error("LLM upstream returned HTTP", upstream.status, result.error?.message || "unknown error");
    return NextResponse.json({
      error: `سرویس مدل خطا داد (HTTP ${upstream.status}). نام مدل و اعتبار API را بررسی کنید.`,
    }, { status: 502 });
  }

  const rawContent = result.choices?.[0]?.message?.content;
  const answer = typeof rawContent === "string"
    ? rawContent
    : Array.isArray(rawContent)
      ? rawContent.map((part) => part.text || "").join("\n")
      : "";
  if (!answer.trim()) {
    return NextResponse.json({ error: "پاسخ قابل‌خواندن از مدل دریافت نشد." }, { status: 502 });
  }

  const assistantTime = new Date().toISOString();
  insertMessage.run(threadId, "assistant", answer, assistantTime);
  db.prepare("UPDATE threads SET updated_at = ? WHERE id = ?").run(assistantTime, threadId);

  return NextResponse.json({ answer, model });
}
