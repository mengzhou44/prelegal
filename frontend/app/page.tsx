"use client";

import { useState, useRef, useCallback } from "react";
import { NdaPreview } from "@/components/nda-preview";

interface FormData {
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

const empty: FormData = {
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

function FormSection({
  badge,
  title,
  children,
}: {
  badge?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        {badge && (
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0">
            {badge}
          </span>
        )}
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  suffix,
}: {
  id: keyof FormData;
  label: string;
  placeholder: string;
  value: string;
  onChange: (id: keyof FormData, val: string) => void;
  type?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5"
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          min={type === "number" ? 1 : undefined}
          step={type === "number" ? 1 : undefined}
          onChange={(e) => onChange(id, e.target.value)}
          className={`${suffix ? "w-24" : "w-full"} h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 focus:bg-white transition-all`}
        />
        {suffix && (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function PartySection({
  prefix,
  label,
  badge,
  form,
  onChange,
}: {
  prefix: "partyA" | "partyB";
  label: string;
  badge: string;
  form: FormData;
  onChange: (id: keyof FormData, val: string) => void;
}) {
  return (
    <FormSection badge={badge} title={label}>
      <Field
        id={`${prefix}Name` as keyof FormData}
        label="Full Name"
        placeholder="Jane Smith"
        value={form[`${prefix}Name` as keyof FormData]}
        onChange={onChange}
      />
      <Field
        id={`${prefix}Company` as keyof FormData}
        label="Company"
        placeholder="Acme Corp"
        value={form[`${prefix}Company` as keyof FormData]}
        onChange={onChange}
      />
      <Field
        id={`${prefix}Address` as keyof FormData}
        label="Address"
        placeholder="123 Main St, San Francisco, CA 94105"
        value={form[`${prefix}Address` as keyof FormData]}
        onChange={onChange}
      />
      <Field
        id={`${prefix}Email` as keyof FormData}
        label="Email"
        placeholder="jane@acme.com"
        value={form[`${prefix}Email` as keyof FormData]}
        onChange={onChange}
        type="email"
      />
    </FormSection>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormData>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formWidth, setFormWidth] = useState(420);
  const formWidthRef = useRef(formWidth);
  formWidthRef.current = formWidth;
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: formWidthRef.current };

    function onMove(ev: MouseEvent) {
      if (!dragState.current) return;
      const delta = ev.clientX - dragState.current.startX;
      setFormWidth(Math.min(700, Math.max(280, dragState.current.startWidth + delta)));
    }

    function onUp() {
      dragState.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  function handleChange(id: keyof FormData, val: string) {
    setForm((prev) => ({ ...prev, [id]: val }));
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
        } catch { /* non-JSON error body, keep default */ }
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

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex-none h-13 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-indigo-500 text-lg">⚖</span>
          <span className="text-slate-800 font-semibold text-sm tracking-tight">
            PreLegal
          </span>
        </div>
        <span className="text-slate-300 text-sm">/</span>
        <span className="text-slate-500 text-sm">Mutual NDA Creator</span>
        <div className="ml-auto">
          <span className="text-[11px] bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2.5 py-0.5 font-medium tracking-wide">
            PROTOTYPE
          </span>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Form */}
        <div style={{ width: formWidth }} className="flex-none overflow-y-auto bg-slate-50 p-5 space-y-4">
          <div className="pt-1 pb-2">
            <h1 className="text-base font-semibold text-slate-800">
              Fill in the details
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              The document preview updates as you type.
            </p>
          </div>

          <PartySection prefix="partyA" label="Party A" badge="A" form={form} onChange={handleChange} />
          <PartySection prefix="partyB" label="Party B" badge="B" form={form} onChange={handleChange} />

          <FormSection title="Agreement Terms">
            <Field
              id="purpose"
              label="Purpose"
              placeholder="Evaluating a potential business partnership"
              value={form.purpose}
              onChange={handleChange}
            />
            <Field
              id="effectiveDate"
              label="Effective Date"
              placeholder="January 1, 2025"
              value={form.effectiveDate}
              onChange={handleChange}
            />
            <Field
              id="mndaTermYears"
              label="MNDA Term"
              placeholder="1"
              value={form.mndaTermYears}
              onChange={handleChange}
              type="number"
              suffix="year(s) from effective date"
            />
            <Field
              id="confidentialityYears"
              label="Term of Confidentiality"
              placeholder="2"
              value={form.confidentialityYears}
              onChange={handleChange}
              type="number"
              suffix="year(s) from effective date"
            />
          </FormSection>

          <FormSection title="Legal Jurisdiction">
            <Field
              id="governingLaw"
              label="Governing Law (State)"
              placeholder="California"
              value={form.governingLaw}
              onChange={handleChange}
            />
            <Field
              id="jurisdiction"
              label="Jurisdiction (Courts)"
              placeholder="San Francisco, California"
              value={form.jurisdiction}
              onChange={handleChange}
            />
          </FormSection>

          <div className="pb-4 space-y-3">
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold tracking-wide transition-colors shadow-sm cursor-pointer"
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
