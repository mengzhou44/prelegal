/** @jest-environment node */

import { POST } from "@/app/api/generate-nda/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/nda-pdf", () => ({
  generateNdaPdf: jest.fn().mockResolvedValue(Buffer.from("fake-pdf")),
}));

const validBody = {
  partyAName: "Alice",
  partyACompany: "Acme",
  partyAAddress: "123 Main St",
  partyAEmail: "alice@acme.com",
  partyBName: "Bob",
  partyBCompany: "Widget",
  partyBAddress: "456 Market St",
  partyBEmail: "bob@widget.com",
  purpose: "Exploring partnership",
  effectiveDate: "January 1, 2025",
  mndaTermYears: 2,
  confidentialityYears: 3,
  governingLaw: "California",
  jurisdiction: "San Francisco, California",
};

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/generate-nda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate-nda", () => {
  describe("valid request", () => {
    it("returns 200 with application/pdf content type", async () => {
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
    });

    it("includes Content-Disposition attachment header", async () => {
      const res = await POST(makeRequest(validBody));
      expect(res.headers.get("Content-Disposition")).toMatch(
        /attachment; filename="mutual-nda-/
      );
    });
  });

  describe("missing required string fields", () => {
    const requiredFields = [
      "partyAName",
      "partyACompany",
      "partyAAddress",
      "partyAEmail",
      "partyBName",
      "partyBCompany",
      "partyBAddress",
      "partyBEmail",
      "purpose",
      "effectiveDate",
      "governingLaw",
      "jurisdiction",
    ];

    it.each(requiredFields)("returns 400 when %s is missing", async (field) => {
      const body = { ...validBody, [field]: "" };
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain(field);
    });

    it("returns 400 when a field is whitespace-only", async () => {
      const body = { ...validBody, partyAName: "   " };
      const res = await POST(makeRequest(body));
      expect(res.status).toBe(400);
    });
  });

  describe("numeric year validation", () => {
    it("returns 400 when mndaTermYears is 0", async () => {
      const res = await POST(makeRequest({ ...validBody, mndaTermYears: 0 }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/mnda term/i);
    });

    it("returns 400 when mndaTermYears is negative", async () => {
      const res = await POST(makeRequest({ ...validBody, mndaTermYears: -1 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when mndaTermYears is not a number", async () => {
      const res = await POST(makeRequest({ ...validBody, mndaTermYears: "two" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when confidentialityYears is 0", async () => {
      const res = await POST(
        makeRequest({ ...validBody, confidentialityYears: 0 })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/confidentiality/i);
    });

    it("returns 400 when confidentialityYears is negative", async () => {
      const res = await POST(
        makeRequest({ ...validBody, confidentialityYears: -5 })
      );
      expect(res.status).toBe(400);
    });

    it("accepts mndaTermYears of 1 (minimum valid)", async () => {
      const res = await POST(makeRequest({ ...validBody, mndaTermYears: 1 }));
      expect(res.status).toBe(200);
    });

    it("returns 400 when mndaTermYears is a float (e.g. 1.5)", async () => {
      const res = await POST(makeRequest({ ...validBody, mndaTermYears: 1.5 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when confidentialityYears is a float", async () => {
      const res = await POST(makeRequest({ ...validBody, confidentialityYears: 2.7 }));
      expect(res.status).toBe(400);
    });
  });

  describe("max-length validation", () => {
    it("returns 400 when partyAName exceeds 200 chars", async () => {
      const res = await POST(makeRequest({ ...validBody, partyAName: "A".repeat(201) }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when purpose exceeds 1000 chars", async () => {
      const res = await POST(makeRequest({ ...validBody, purpose: "x".repeat(1001) }));
      expect(res.status).toBe(400);
    });

    it("accepts purpose at exactly 1000 chars", async () => {
      const res = await POST(makeRequest({ ...validBody, purpose: "x".repeat(1000) }));
      expect(res.status).toBe(200);
    });
  });
});
