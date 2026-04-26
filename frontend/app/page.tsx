"use client";

import { useEffect, useState } from "react";
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
  const pageTitle = documentType ? `${documentType} Creator` : "Legal Document Creator";
  const pageSubtitle = documentType
    ? `Create a professional ${documentType} with AI assistance`
    : "Create professional legal documents with AI assistance";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl" style={{ color: "#209dd7" }}>⚖</span>
              <span className="text-xl font-bold" style={{ color: "#032147" }}>PreLegal</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-semibold text-slate-900">{pageTitle}</h1>
              <p className="text-xs text-slate-500">{pageSubtitle}</p>
            </div>
            {documentType && (
              <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {documentType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {complete && documentType && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Generating…" : "↓ Download PDF"}
              </button>
            )}
            {documentType && (
              <button
                onClick={handleStartOver}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
              >
                New Document
              </button>
            )}
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:block">{user.email}</span>
                <button
                  onClick={() => {
                    localStorage.removeItem("prelegal_user");
                    router.replace("/login");
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1800px] mx-auto p-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Chat */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800">AI Assistant</h2>
              <p className="text-sm text-slate-500">
                {documentType
                  ? "Answer the questions to populate the document."
                  : "Tell me what legal document you need."}
              </p>
            </div>
            <div className="p-4 h-[calc(100vh-280px)]">
              <ChatPanel
                documentType={documentType}
                fields={form}
                onFieldsUpdate={handleFieldsUpdate}
                onDocumentTypeChange={handleDocumentTypeChange}
                onRequiredFieldsUpdate={handleRequiredFieldsUpdate}
              />
            </div>
          </div>

          {/* Right: Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Document Preview</h2>
                <p className="text-sm text-slate-500">Live preview updates as you chat</p>
              </div>
              {complete && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Ready to download
                </span>
              )}
            </div>
            <div className="p-6 h-[calc(100vh-280px)] overflow-y-auto">
              {!documentType && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-4xl mb-4" style={{ color: "#209dd7" }}>⚖</div>
                  <p className="text-slate-500 text-sm font-medium">Tell the AI what document you need</p>
                  <p className="text-slate-400 text-xs mt-1">Your document preview will appear here</p>
                </div>
              )}
              {documentType === MNDA && (
                <NdaPreview data={form as unknown as ChatFields} />
              )}
              {documentType && documentType !== MNDA && (
                <KeyTermsPreview
                  documentType={documentType}
                  form={form}
                  requiredFields={requiredFields}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-6">
        <div className="max-w-[1800px] mx-auto px-6 py-4 text-center text-sm text-slate-500">
          Based on{" "}
          <a href="https://commonpaper.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Common Paper
          </a>{" "}
          Standard Terms, licensed under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            CC BY 4.0
          </a>
        </div>
      </footer>
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-800">{documentType}</h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {collected.length} / {requiredFields.length} fields
        </span>
      </div>
      <div className="space-y-2">
        {requiredFields.map((field) => {
          const value = (form[field] ?? "").trim();
          return (
            <div key={field} className="flex gap-3 items-baseline py-2 border-b border-slate-100 last:border-0">
              <span className={`text-xs w-4 ${value ? "text-green-600" : "text-slate-300"}`}>
                {value ? "✓" : "○"}
              </span>
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
  );
}
