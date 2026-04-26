"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NdaPreview } from "@/components/nda-preview";
import { ChatPanel, type ChatFields } from "@/components/chat-panel";

const empty: ChatFields = {
  partyAName: "",
  partyACompany: "",
  partyAAddress: "",
  partyAEmail: "",
  partyBName: "",
  partyBCompany: "",
  partyBAddress: "",
  partyBEmail: "",
  purpose: "",
  effectiveDate: "",
  mndaTermYears: "",
  confidentialityYears: "",
  governingLaw: "",
  jurisdiction: "",
};

function isComplete(fields: ChatFields): boolean {
  return (
    Object.values(fields).every((v) => v.trim() !== "") &&
    Number.isInteger(Number(fields.mndaTermYears)) &&
    Number(fields.mndaTermYears) >= 1 &&
    Number.isInteger(Number(fields.confidentialityYears)) &&
    Number(fields.confidentialityYears) >= 1
  );
}

export default function Home() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [form, setForm] = useState<ChatFields>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(420);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("prelegal_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: panelWidthRef.current };

    function onMove(ev: MouseEvent) {
      if (!dragState.current) return;
      const delta = ev.clientX - dragState.current.startX;
      setPanelWidth(Math.min(700, Math.max(280, dragState.current.startWidth + delta)));
    }

    function onUp() {
      dragState.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  function handleFieldsUpdate(fields: Partial<Record<keyof ChatFields, string>>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        mndaTermYears: Number(form.mndaTermYears),
        confidentialityYears: Number(form.confidentialityYears),
      };

      const res = await fetch("/api/generate-nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = "Failed to generate PDF.";
        try {
          const body = await res.json();
          message = body.error ?? message;
        } catch { /* non-JSON error body */ }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mutual-nda-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const complete = isComplete(form);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex-none h-13 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-lg" style={{ color: "#209dd7" }}>⚖</span>
          <span className="font-semibold text-sm tracking-tight" style={{ color: "#032147" }}>
            PreLegal
          </span>
        </div>
        <span className="text-slate-300 text-sm">/</span>
        <span className="text-slate-500 text-sm">Mutual NDA Creator</span>
        <div className="ml-auto flex items-center gap-3">
          {user && <span className="text-xs text-slate-400">{user.email}</span>}
          <button
            onClick={() => {
              localStorage.removeItem("prelegal_user");
              router.replace("/login");
            }}
            className="text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat */}
        <div
          style={{ width: panelWidth }}
          className="flex-none flex flex-col bg-slate-50 overflow-hidden"
        >
          {/* Chat header */}
          <div className="flex-none px-5 py-3.5 border-b border-slate-100 bg-white">
            <h1 className="text-sm font-semibold text-slate-800">AI Assistant</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Answer the questions to populate the document.
            </p>
          </div>

          {/* Chat messages + input */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel fields={form} onFieldsUpdate={handleFieldsUpdate} />
          </div>

          {/* Generate button */}
          <div className="flex-none px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-2">
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              onClick={handleGenerate}
              disabled={!complete || loading}
              className="w-full h-10 rounded-xl text-white text-sm font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: "#753991" }}
            >
              {loading ? "Generating…" : "↓ Generate PDF"}
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Common Paper MNDA v1.0 ·{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                CC BY 4.0
              </a>
            </p>
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="w-1.5 flex-none bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 cursor-col-resize transition-colors"
          title="Drag to resize"
        />

        {/* Right: Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100 px-8 py-8">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Document Preview
            </p>
            <span className="text-[11px] text-slate-400 bg-white border border-slate-200 rounded-full px-2.5 py-0.5">
              Live
            </span>
          </div>
          <NdaPreview data={form} />
        </div>
      </div>
    </div>
  );
}
