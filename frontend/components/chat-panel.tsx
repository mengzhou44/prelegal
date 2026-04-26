"use client";

import { useEffect, useRef, useState } from "react";

// Kept for NdaPreview compatibility
export interface ChatFields {
  partyAName: string;
  partyACompany: string;
  partyAAddress: string;
  partyAEmail: string;
  partyBName: string;
  partyBCompany: string;
  partyBAddress: string;
  partyBEmail: string;
  purpose: string;
  effectiveDate: string;
  mndaTermYears: string;
  confidentialityYears: string;
  governingLaw: string;
  jurisdiction: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  documentType: string | null;
  fields: Record<string, string>;
  onFieldsUpdate: (fields: Record<string, string>) => void;
  onDocumentTypeChange: (type: string, requiredFields: string[], intFields: string[]) => void;
  onRequiredFieldsUpdate: (requiredFields: string[], intFields: string[]) => void;
}

export function ChatPanel({
  documentType,
  fields,
  onFieldsUpdate,
  onDocumentTypeChange,
  onRequiredFieldsUpdate,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const documentTypeRef = useRef(documentType);
  documentTypeRef.current = documentType;
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    callAI([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function callAI(msgs: Message[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs,
          fields: fieldsRef.current,
          documentType: documentTypeRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Something went wrong. Please try again." },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

      if (data.documentType && data.documentType !== documentTypeRef.current) {
        onDocumentTypeChange(
          data.documentType,
          data.requiredFields ?? [],
          data.intFields ?? [],
        );
      } else if (data.documentType && data.requiredFields?.length) {
        // Keep required fields in sync on every response in case they were missed initially
        onRequiredFieldsUpdate(data.requiredFields, data.intFields ?? []);
      }

      if (data.fields && Object.keys(data.fields).length > 0) {
        const normalized: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.fields)) {
          normalized[k] = String(v);
        }
        onFieldsUpdate(normalized);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    await callAI(next);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white shadow-sm ring-1 ring-slate-200 text-slate-800 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-none px-4 pb-4 pt-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your answer…"
            disabled={loading}
            className="flex-1 h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="h-10 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
