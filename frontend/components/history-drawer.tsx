"use client";

import { useEffect, useState } from "react";

interface DocRecord {
  id: number;
  documentType: string;
  fields: Record<string, string>;
  createdAt: string;
}

interface HistoryDrawerProps {
  email: string;
  open: boolean;
  onClose: () => void;
}

export function HistoryDrawer({ email, open, onClose }: HistoryDrawerProps) {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [redownloading, setRedownloading] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/documents?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => setDocs(data.documents ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [open, email]);

  async function handleRedownload(doc: DocRecord) {
    setRedownloading(doc.id);
    try {
      const MNDA = "Mutual Non-Disclosure Agreement";
      let res: Response;

      if (doc.documentType === MNDA) {
        const payload = {
          ...doc.fields,
          mndaTermYears: Number(doc.fields.mndaTermYears ?? "0"),
          confidentialityYears: Number(doc.fields.confidentialityYears ?? "0"),
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
          body: JSON.stringify({ documentType: doc.documentType, fields: doc.fields }),
        });
      }

      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = doc.documentType.toLowerCase().replace(/\s+/g, "-");
      a.download = `${safeName}-${doc.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setRedownloading(null);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-800">My Documents</h2>
            <p className="text-xs text-slate-500">Previously generated documents</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              Loading…
            </div>
          )}

          {!loading && docs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="text-3xl mb-3" style={{ color: "#209dd7" }}>⚖</div>
              <p className="text-slate-500 text-sm font-medium">No documents yet</p>
              <p className="text-slate-400 text-xs mt-1">
                Generate your first document to see it here.
              </p>
            </div>
          )}

          {!loading && docs.length > 0 && (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {doc.documentType}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(doc.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleRedownload(doc)}
                    disabled={redownloading === doc.id}
                    className="flex-none px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-700 hover:bg-purple-800 text-white disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {redownloading === doc.id ? "…" : "↓ Download"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
