import { NextRequest, NextResponse } from "next/server";
import { generateNdaPdf, NdaFormData } from "@/lib/nda-pdf";

const MAX_LENGTHS: Partial<Record<keyof NdaFormData, number>> = {
  partyAName: 200, partyBName: 200,
  partyACompany: 200, partyBCompany: 200,
  partyAAddress: 500, partyBAddress: 500,
  partyAEmail: 254, partyBEmail: 254,
  purpose: 1000,
  effectiveDate: 100,
  governingLaw: 100,
  jurisdiction: 200,
};

export async function POST(req: NextRequest) {
  let data: NdaFormData;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const requiredStrings: (keyof NdaFormData)[] = [
    "partyAName", "partyACompany", "partyAAddress", "partyAEmail",
    "partyBName", "partyBCompany", "partyBAddress", "partyBEmail",
    "purpose", "effectiveDate", "governingLaw", "jurisdiction",
  ];

  for (const field of requiredStrings) {
    const val = data[field] as string;
    if (!val?.trim()) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
    const max = MAX_LENGTHS[field];
    if (max && val.length > max) {
      return NextResponse.json(
        { error: `Field ${field} exceeds maximum length of ${max}.` },
        { status: 400 }
      );
    }
  }

  if (!Number.isInteger(data.mndaTermYears) || data.mndaTermYears < 1) {
    return NextResponse.json(
      { error: "MNDA term must be at least 1 year." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(data.confidentialityYears) || data.confidentialityYears < 1) {
    return NextResponse.json(
      { error: "Term of confidentiality must be at least 1 year." },
      { status: 400 }
    );
  }

  let buffer: Buffer;
  try {
    buffer = await generateNdaPdf(data);
  } catch (err) {
    console.error("PDF render failed:", err);
    return NextResponse.json({ error: "Failed to render PDF." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mutual-nda-${Date.now()}.pdf"`,
    },
  });
}
