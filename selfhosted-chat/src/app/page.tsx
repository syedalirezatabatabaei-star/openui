"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Thread = {
  id: string;
  title: string;
  updated_at: string;
  last_message?: string | null;
  message_count?: number;
};
type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default function Home() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshThreads = useCallback(async () => {
    const response = await fetch("/api/threads", { cache: "no-store" });
    if (!response.ok) throw new Error("گرفتن فهرست گفتگوها ناموفق بود.");
    const data = await response.json();
    setThreads(data.threads || []);
    return (data.threads || []) as Thread[];
  }, []);

  const loadThread = useCallback(async (id: string) => {
    setActiveId(id);
    setError("");
    const response = await fetch(`/api/threads/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) {
      setMessages([]);
      setError("بارگذاری گفتگو ناموفق بود.");
      return;
    }
    const data = await response.json();
    setMessages(data.messages || []);
  }, []);

  useEffect(() => {
    refreshThreads().then((items) => {
      const saved = window.localStorage.getItem("openui-active-thread");
      const target = items.find((item) => item.id === saved)?.id || items[0]?.id;
      if (target) void loadThread(target);
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : "خطای بارگذاری"));
  }, [refreshThreads, loadThread]);

  useEffect(() => {
    if (activeId) window.localStorage.setItem("openui-active-thread", activeId);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, messages, busy]);

  async function newThread() {
    setError("");
    const response = await fetch("/api/threads", { method: "POST" });
    if (!response.ok) {
      setError("ساخت گفتگوی جدید ناموفق بود.");
      return;
    }
    const thread = await response.json() as Thread;
    setThreads((current) => [thread, ...current]);
    setActiveId(thread.id);
    setMessages([]);
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    let threadId = activeId;
    if (!threadId) {
      const created = await fetch("/api/threads", { method: "POST" });
      if (!created.ok) {
        setError("ساخت گفتگو ناموفق بود.");
        return;
      }
      const thread = await created.json() as Thread;
      threadId = thread.id;
      setActiveId(threadId);
    }
    setInput("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ارسال پیام ناموفق بود.");
      await loadThread(threadId);
      await refreshThreads();
    } catch (e) {
      // The user message is written to SQLite before the model call, so refresh to show it even if the provider fails.
      await loadThread(threadId);
      setError(e instanceof Error ? e.message : "خطای نامشخص");
      await refreshThreads().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">O</span><div><strong>OpenUI</strong><small>چت خودمیزبان</small></div></div>
        <button className="new-thread" onClick={() => void newThread()}>＋ گفتگوی جدید</button>
        <div className="thread-heading">گفتگوهای ذخیره‌شده روی سرور</div>
        <nav className="thread-list">
          {threads.map((thread) => (
            <button key={thread.id} className={thread.id === activeId ? "thread active" : "thread"} onClick={() => void loadThread(thread.id)}>
              <span>{thread.title || "گفتگوی جدید"}</span>
              <small>{thread.message_count ?? 0} پیام</small>
            </button>
          ))}
          {threads.length === 0 && <p className="empty-list">هنوز گفتگویی ثبت نشده است.</p>}
        </nav>
        <div className="storage-note"><span className="status-dot" /> تاریخچه روی سرور ذخیره می‌شود</div>
      </aside>

      <section className="chat">
        <header className="chat-header">
          <div><strong>{threads.find((t) => t.id === activeId)?.title || "دستیار هوشمند"}</strong><small>مدل: {process.env.NEXT_PUBLIC_MODEL_LABEL || "gpt-5-mini"}</small></div>
          <span className="server-pill">ذخیره‌سازی SQLite</span>
        </header>
        <div className="messages">
          {messages.length === 0 && !busy && (
            <div className="welcome">
              <div className="welcome-icon">✳</div>
              <h1>از کجا شروع کنیم؟</h1>
              <p>پیامت را بنویس. گفتگوها در پایگاه دادهٔ سرور ذخیره می‌شوند و بعداً هم قابل‌بازیابی‌اند.</p>
              <div className="suggestions">
                {["یک ایده را مرحله‌به‌مرحله بررسی کن", "برای پروژه‌ام برنامه‌ریزی کن", "یک کد را تحلیل و اصلاح کن"].map((suggestion) =>
                  <button key={suggestion} onClick={() => setInput(suggestion)}>{suggestion} <span>←</span></button>
                )}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <article key={message.id} className={message.role === "user" ? "message user-message" : "message assistant-message"}>
              <div className="avatar">{message.role === "user" ? "ش" : "O"}</div>
              <div className="message-body"><div className="message-role">{message.role === "user" ? "شما" : "OpenUI"}</div><div className="message-content">{message.content}</div></div>
            </article>
          ))}
          {busy && <article className="message assistant-message"><div className="avatar">O</div><div className="message-body"><div className="message-role">OpenUI</div><div className="typing"><i /><i /><i /></div></div></article>}
          <div ref={bottomRef} />
        </div>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <form className="composer" onSubmit={sendMessage}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="پیامت را اینجا بنویس..." rows={2} disabled={busy} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          <div className="composer-footer"><span>Enter برای ارسال · Shift+Enter برای خط جدید</span><button type="submit" disabled={busy || !input.trim()}>{busy ? "در حال پاسخ..." : "ارسال ↑"}</button></div>
        </form>
        <footer className="privacy">کلید API در سمت سرور می‌ماند و به مرورگر ارسال نمی‌شود.</footer>
      </section>
    </main>
  );
}
