"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NdaPreview } from "@/components/nda-preview";
import { ChatPanel, type ChatFields } from "@/components/chat-panel";

const MNDA = "Mutual Non-Disclosure Agreement";

function isComplete(
  form: Record<string, string>,
  requiredFields: string[],
  intFields: string[],
): boolean {
  if (requiredFields.length === 0) return false;
  return (
    requiredFields.every((f) => (form[f] ?? "").trim() !== "") &&
    intFields.every((f) => {
      const n = Number(form[f]);
      return Number.isInteger(n) && n >= 1;
    })
  );
}

export default function Home() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [intFields, setIntFields] = useState<string[]>([]);
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

  function handleDocumentTypeChange(type: string, reqFields: string[], iFields: string[]) {
    setDocumentType(type);
    setForm({});
    setRequiredFields(reqFields);
    setIntFields(iFields);
    setError(null);
  }

  function handleRequiredFieldsUpdate(reqFields: string[], iFields: string[]) {
    if (reqFields.length > 0) {
      setRequiredFields(reqFields);
      setIntFields(iFields);
    }
  }

  function handleFieldsUpdate(fields: Record<string, string>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function handleStartOver() {
    setDocumentType(null);
    setForm({});
    setRequiredFields([]);
    setIntFields([]);
    setError(null);
    // Reload to re-initialize the chat
    window.location.reload();
  }

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      let res: Response;

      if (documentType === MNDA) {
        const payload = {
          ...form,
          mndaTermYears: Number(form.mndaTermYears ?? "0"),
          confidentialityYears: Number(form.confidentialityYears ?? "0"),
        };
        res = await fetch("/api/generate-nda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/generate-doc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentType, fields: form }),
        });
      }

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
      const safeName = (documentType ?? "document").toLowerCase().replace(/\s+/g, "-");
      a.download = `${safeName}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const complete = isComplete(form, requiredFields, intFields);
  const pageTitle = documentType ?? "Legal Document Creator";

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
        <span className="text-slate-500 text-sm">{pageTitle}</span>
        <div className="ml-auto flex items-center gap-3">
          {documentType && (
            <button
              onClick={handleStartOver}
              className="text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 transition-colors cursor-pointer"
            >
              Start over
            </button>
          )}
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
              {documentType
                ? "Answer the questions to populate the document."
                : "Tell me what legal document you need."}
            </p>
          </div>

          {/* Chat messages + input */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              documentType={documentType}
              fields={form}
              onFieldsUpdate={handleFieldsUpdate}
              onDocumentTypeChange={handleDocumentTypeChange}
              onRequiredFieldsUpdate={handleRequiredFieldsUpdate}
            />
          </div>

          {/* Generate button */}
          {documentType && (
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
                Common Paper ·{" "}
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
          )}
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
            {documentType && (
              <span className="text-[11px] text-slate-400 bg-white border border-slate-200 rounded-full px-2.5 py-0.5">
                Live
              </span>
            )}
          </div>

          {!documentType && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-slate-400 text-sm">Tell the AI assistant what document you need</p>
              <p className="text-slate-300 text-xs mt-1">Your document preview will appear here</p>
            </div>
          )}

          {documentType === MNDA && (
            <NdaPreview data={form as unknown as ChatFields} />
          )}

          {documentType && documentType !== MNDA && (
            <KeyTermsPreview documentType={documentType} form={form} requiredFields={requiredFields} />
          )}
        </div>
      </div>
    </div>
  );
}

function KeyTermsPreview({
  documentType,
  form,
  requiredFields,
}: {
  documentType: string;
  form: Record<string, string>;
  requiredFields: string[];
}) {
  const collected = requiredFields.filter((f) => (form[f] ?? "").trim() !== "");

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden max-w-2xl mx-auto">
      <div className="px-8 py-6 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-center" style={{ color: "#032147" }}>
          {documentType}
        </h2>
        <p className="text-xs text-center text-slate-400 mt-1">
          {collected.length} / {requiredFields.length} fields collected
        </p>
      </div>
      <div className="px-8 py-6">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Key Terms
        </p>
        <div className="space-y-3">
          {requiredFields.map((field) => {
            const value = (form[field] ?? "").trim();
            return (
              <div key={field} className="flex gap-3 items-baseline">
                <span className="text-xs text-slate-400 w-4">{value ? "✓" : "○"}</span>
                <span className="text-xs text-slate-500 w-48 flex-none capitalize">
                  {field.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <span className="text-xs text-slate-800 flex-1">
                  {value || <span className="text-slate-300 italic">not yet collected</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
