"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import SimpleMarkdown from "./SimpleMarkdown";

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
}

interface Analysis {
  content: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  "Kenapa pengeluaran naik?",
  "Berapa pengeluaran makan bulan ini?",
  "Saran hemat bulan depan",
];

export default function AiSection({ month }: { month: string }) {
  const [tab, setTab] = useState<"analisis" | "chat">("analisis");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    try {
      const [settingsRes, msgRes] = await Promise.all([
        fetch("/api/ai/settings"),
        fetch(`/api/ai/messages?month=${month}`),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setConfigured(!!s.configured);
      } else {
        setConfigured(false);
      }

      if (msgRes.ok) {
        const d = await msgRes.json();
        setMessages(Array.isArray(d.messages) ? d.messages : []);
        setAnalysis(d.analysis || null);
      }
    } catch (e) {
      console.error(e);
    }
  }, [month]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (tab === "chat") {
      bottomRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [messages, tab]);

  async function handleAnalyze(refresh = false) {
    setError("");
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysis({
          content: data.text,
          createdAt: new Date().toISOString(),
        });
        if (refresh) {
          /* hasil sudah diganti di server */
        }
      } else {
        setError(data.error || "Gagal menganalisis laporan");
      }
    } catch {
      setError("Koneksi gagal");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setError("");
    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: message },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: data.id, role: "assistant", content: data.reply },
        ]);
      } else {
        setError(data.error || "Gagal membalas pesan");
      }
    } catch {
      setError("Koneksi gagal");
    } finally {
      setSending(false);
    }
  }

  if (configured === null) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-white mb-1">✨ AI Gemini</h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          Analisis otomatis dan tanya-jawab soal keuangan bulan ini. Atur API
          key Gemini dulu untuk mengaktifkan.
        </p>
        <Link
          href="/pengaturan"
          className="inline-block px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-950/50"
        >
          Atur API key di Pengaturan →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">✨ AI Gemini</h2>
        <div className="flex p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
          {(["analisis", "chat"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[11px] rounded-lg font-semibold transition ${
                tab === t
                  ? "bg-blue-600 text-white shadow-md shadow-blue-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t === "analisis" ? "📊 Analisis" : "💬 Chat"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-400 mb-2 bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {tab === "analisis" ? (
        <div className="space-y-3">
          {analysis ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <SimpleMarkdown text={analysis.content} />
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800">
                <span className="text-[10px] text-slate-500">
                  {new Date(analysis.createdAt).toLocaleString("id-ID")}
                </span>
                <button
                  type="button"
                  onClick={() => handleAnalyze(true)}
                  disabled={analyzing}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold disabled:opacity-50"
                >
                  {analyzing ? "Menganalisis ulang..." : "↻ Perbarui"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">
              Belum ada analisis untuk bulan ini.
            </p>
          )}

          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={analyzing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-950/50 cursor-pointer"
          >
            {analyzing
              ? "Menganalisis laporan..."
              : analysis
              ? "✨ Analisis Ulang"
              : "✨ Analisis Bulan Ini"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {messages.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-3">
                Belum ada percakapan. Tanya apa saja soal keuangan bulan ini.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={m.id ?? i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-slate-800 text-slate-200 rounded-bl-md"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 px-3 py-2 rounded-2xl rounded-bl-md text-xs animate-pulse">
                  mengetik...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={sending}
                  className="px-2.5 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-full transition disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya soal keuangan bulan ini..."
              maxLength={1000}
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {sending ? "..." : "Kirim"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
