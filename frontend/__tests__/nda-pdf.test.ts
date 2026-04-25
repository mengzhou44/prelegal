/**
 * Tests for NdaFormData shape and generateNdaPdf integration.
 * We mock @react-pdf/renderer to avoid needing a full PDF engine in Jest.
 */

import { generateNdaPdf, NdaFormData } from "@/lib/nda-pdf";

jest.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: { children: unknown }) => children,
  Page: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  View: ({ children }: { children: unknown }) => children,
  StyleSheet: { create: (s: unknown) => s },
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from("%PDF-fake")),
}));

const validData: NdaFormData = {
  partyAName: "Alice",
  partyACompany: "Acme Corp",
  partyAAddress: "123 Main St",
  partyAEmail: "alice@acme.com",
  partyBName: "Bob",
  partyBCompany: "Widget Inc",
  partyBAddress: "456 Market St",
  partyBEmail: "bob@widget.com",
  purpose: "Exploring a partnership",
  effectiveDate: "January 1, 2025",
  mndaTermYears: 2,
  confidentialityYears: 3,
  governingLaw: "California",
  jurisdiction: "San Francisco, California",
};

describe("generateNdaPdf", () => {
  it("returns a Buffer", async () => {
    const result = await generateNdaPdf(validData);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("calls renderToBuffer exactly once per invocation", async () => {
    const { renderToBuffer } = await import("@react-pdf/renderer");
    (renderToBuffer as jest.Mock).mockClear();
    await generateNdaPdf(validData);
    expect(renderToBuffer).toHaveBeenCalledTimes(1);
  });

  it("accepts mndaTermYears = 1 without error", async () => {
    await expect(
      generateNdaPdf({ ...validData, mndaTermYears: 1 })
    ).resolves.toBeDefined();
  });

  it("accepts mndaTermYears = 10 without error", async () => {
    await expect(
      generateNdaPdf({ ...validData, mndaTermYears: 10 })
    ).resolves.toBeDefined();
  });
});
