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
  partyName: string;
  partyCompany: string;
  partyAddress: string;
  partyEmail: string;
  purpose: string;
  effectiveDate: string;
  mndaTerm: string;
  termOfConfidentiality: string;
  governingLaw: string;
  jurisdiction: string;
}

const empty: FormData = {
  partyName: "",
  partyCompany: "",
  partyAddress: "",
  partyEmail: "",
  purpose: "",
  effectiveDate: "",
  mndaTerm: "",
  termOfConfidentiality: "",
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
}: {
  id: keyof FormData;
  label: string;
  placeholder: string;
  value: string;
  onChange: (id: keyof FormData, val: string) => void;
  type?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
      />
    </div>
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
      const res = await fetch("/api/generate-nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

        <Card>
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
            <CardDescription>Information about your party.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field
              id="partyName"
              label="Full Name"
              placeholder="Jane Smith"
              value={form.partyName}
              onChange={handleChange}
            />
            <Field
              id="partyCompany"
              label="Company"
              placeholder="Acme Corp"
              value={form.partyCompany}
              onChange={handleChange}
            />
            <Field
              id="partyAddress"
              label="Address"
              placeholder="123 Main St, San Francisco, CA 94105"
              value={form.partyAddress}
              onChange={handleChange}
            />
            <Field
              id="partyEmail"
              label="Email"
              placeholder="jane@acme.com"
              value={form.partyEmail}
              onChange={handleChange}
              type="email"
            />
          </CardContent>
        </Card>

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
              id="mndaTerm"
              label="MNDA Term"
              placeholder="1 year from the Effective Date"
              value={form.mndaTerm}
              onChange={handleChange}
            />
            <Field
              id="termOfConfidentiality"
              label="Term of Confidentiality"
              placeholder="2 years after termination"
              value={form.termOfConfidentiality}
              onChange={handleChange}
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
