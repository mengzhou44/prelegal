import { NextRequest, NextResponse } from "next/server";
import { generateNdaPdf, NdaFormData } from "@/lib/nda-pdf";

export async function POST(req: NextRequest) {
  const data: NdaFormData = await req.json();

  const requiredStrings: (keyof NdaFormData)[] = [
    "partyAName", "partyACompany", "partyAAddress", "partyAEmail",
    "partyBName", "partyBCompany", "partyBAddress", "partyBEmail",
    "purpose", "effectiveDate", "governingLaw", "jurisdiction",
  ];

  for (const field of requiredStrings) {
    if (!(data[field] as string)?.trim()) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  if (!Number.isFinite(data.mndaTermYears) || data.mndaTermYears < 1) {
    return NextResponse.json(
      { error: "MNDA term must be at least 1 year." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(data.confidentialityYears) || data.confidentialityYears < 1) {
    return NextResponse.json(
      { error: "Term of confidentiality must be at least 1 year." },
      { status: 400 }
    );
  }

  const buffer = await generateNdaPdf(data);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mutual-nda-${Date.now()}.pdf"`,
    },
  });
}
