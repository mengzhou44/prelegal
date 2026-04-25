"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          min={type === "number" ? 1 : undefined}
          onChange={(e) => onChange(id, e.target.value)}
          className={suffix ? "w-32" : ""}
        />
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function PartyFields({
  prefix,
  label,
  form,
  onChange,
}: {
  prefix: "partyA" | "partyB";
  label: string;
  form: FormData;
  onChange: (id: keyof FormData, val: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
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
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormData>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const body = await res.json();
        setError(body.error ?? "Failed to generate PDF.");
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
    <main className="min-h-screen bg-muted/40 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Mutual NDA Creator
          </h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details below to generate a Mutual Non-Disclosure
            Agreement PDF.
          </p>
        </div>

        <PartyFields prefix="partyA" label="Party A" form={form} onChange={handleChange} />
        <PartyFields prefix="partyB" label="Party B" form={form} onChange={handleChange} />

        <Card>
          <CardHeader>
            <CardTitle>Agreement Terms</CardTitle>
            <CardDescription>
              Define the scope and duration of the NDA.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
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
              suffix="year(s) from the Effective Date"
            />
            <Field
              id="confidentialityYears"
              label="Term of Confidentiality"
              placeholder="2"
              value={form.confidentialityYears}
              onChange={handleChange}
              type="number"
              suffix="year(s) from the Effective Date"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal Jurisdiction</CardTitle>
            <CardDescription>
              Specify the governing law and courts.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
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
          </CardContent>
        </Card>

        <Separator />

        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating PDF…" : "Generate PDF"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Based on the{" "}
          <a
            href="https://commonpaper.com/standards/mutual-nda/1.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Common Paper Mutual NDA v1.0
          </a>{" "}
          · Licensed under CC BY 4.0
        </p>
      </div>
    </main>
  );
}
