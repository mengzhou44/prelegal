import { NextRequest, NextResponse } from "next/server";
import { generateNdaPdf, NdaFormData } from "@/lib/nda-pdf";

export async function POST(req: NextRequest) {
  const data: NdaFormData = await req.json();

  const required: (keyof NdaFormData)[] = [
    "partyName",
    "partyCompany",
    "partyAddress",
    "partyEmail",
    "purpose",
    "effectiveDate",
    "mndaTerm",
    "termOfConfidentiality",
    "governingLaw",
    "jurisdiction",
  ];

  for (const field of required) {
    if (!data[field]?.trim()) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
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
