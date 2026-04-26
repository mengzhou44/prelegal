import json
import os
import pathlib
import re
import time
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import init_db
from pdf_generator import NdaData, generate_generic_pdf, generate_nda_pdf

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="PreLegal API", lifespan=lifespan)

_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/auth/login")
async def login(body: LoginRequest):
    return {"success": True, "user": {"email": body.email}}


# ── Catalog ────────────────────────────────────────────────────────────────────

_CATALOG_PATH = pathlib.Path(__file__).parent / "catalog.json"
with _CATALOG_PATH.open() as _f:
    _CATALOG = json.load(_f)

_SUPPORTED_TYPE_DESCRIPTIONS = "\n".join(
    f"- {t['name']}: {t['description']}"
    for t in _CATALOG["templates"]
)

# Per-document-type field definitions — used for prompting and validation
_DOC_CONFIGS: dict[str, dict] = {
    "AI Addendum": {
        "template": "templates/AI-Addendum.md",
        "int_fields": [],
        "fields": {
            "partyAName": "Party A's representative name",
            "partyACompany": "Party A's company name",
            "partyAEmail": "Party A's email address",
            "partyBName": "Party B's representative name",
            "partyBCompany": "Party B's company name",
            "partyBEmail": "Party B's email address",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "primaryAgreementName": "name of the primary agreement this addendum amends",
            "aiServicesDescription": "description of the AI/ML services covered",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Business Associate Agreement": {
        "template": "templates/BAA.md",
        "int_fields": [],
        "fields": {
            "coveredEntityName": "Covered Entity's representative name",
            "coveredEntityCompany": "Covered Entity's company name",
            "coveredEntityEmail": "Covered Entity's email address",
            "businessAssociateName": "Business Associate's representative name",
            "businessAssociateCompany": "Business Associate's company name",
            "businessAssociateEmail": "Business Associate's email address",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "permittedPurposes": "permitted uses/purposes for PHI",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Cloud Service Agreement": {
        "template": "templates/CSA.md",
        "int_fields": [],
        "fields": {
            "providerName": "Provider's representative name",
            "providerCompany": "Provider's company name",
            "providerEmail": "Provider's email address",
            "customerName": "Customer's representative name",
            "customerCompany": "Customer's company name",
            "customerEmail": "Customer's email address",
            "serviceName": "name of the cloud service",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "subscriptionTerm": "subscription term (e.g. 1 year, monthly)",
            "fees": "subscription fees (e.g. $500/month)",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Design Partner Agreement": {
        "template": "templates/design-partner-agreement.md",
        "int_fields": [],
        "fields": {
            "providerName": "Provider's representative name",
            "providerCompany": "Provider's company name",
            "providerEmail": "Provider's email address",
            "customerName": "Customer's representative name",
            "customerCompany": "Customer's company name",
            "customerEmail": "Customer's email address",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "pilotTerm": "pilot program duration (e.g. 6 months)",
            "feedbackScope": "scope of feedback/evaluation expected from customer",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Data Processing Agreement": {
        "template": "templates/DPA.md",
        "int_fields": [],
        "fields": {
            "controllerName": "Data Controller's representative name",
            "controllerCompany": "Data Controller's company name",
            "controllerEmail": "Data Controller's email address",
            "processorName": "Data Processor's representative name",
            "processorCompany": "Data Processor's company name",
            "processorEmail": "Data Processor's email address",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "processingPurposes": "purposes for which personal data will be processed",
            "dataCategories": "categories of personal data involved",
            "governingLaw": "governing law — state/country (e.g. California, or EU)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Mutual Non-Disclosure Agreement": {
        "template": "templates/Mutual-NDA.md",
        "int_fields": ["mndaTermYears", "confidentialityYears"],
        "fields": {
            "partyAName": "Party A's full name",
            "partyACompany": "Party A's company name",
            "partyAAddress": "Party A's address",
            "partyAEmail": "Party A's email address",
            "partyBName": "Party B's full name",
            "partyBCompany": "Party B's company name",
            "partyBAddress": "Party B's address",
            "partyBEmail": "Party B's email address",
            "purpose": "purpose of the NDA",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "mndaTermYears": "MNDA term in years (whole number ≥ 1)",
            "confidentialityYears": "term of confidentiality in years (whole number ≥ 1)",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Partnership Agreement": {
        "template": "templates/Partnership-Agreement.md",
        "int_fields": [],
        "fields": {
            "partnerAName": "Partner A's representative name",
            "partnerACompany": "Partner A's company name",
            "partnerAEmail": "Partner A's email address",
            "partnerBName": "Partner B's representative name",
            "partnerBCompany": "Partner B's company name",
            "partnerBEmail": "Partner B's email address",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "partnershipScope": "scope/purpose of the partnership",
            "term": "partnership term (e.g. 2 years, or ongoing)",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Pilot Agreement": {
        "template": "templates/Pilot-Agreement.md",
        "int_fields": [],
        "fields": {
            "providerName": "Provider's representative name",
            "providerCompany": "Provider's company name",
            "providerEmail": "Provider's email address",
            "customerName": "Customer's representative name",
            "customerCompany": "Customer's company name",
            "customerEmail": "Customer's email address",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "pilotDuration": "pilot duration (e.g. 90 days, 3 months)",
            "pilotScope": "scope of the pilot evaluation",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Professional Services Agreement": {
        "template": "templates/psa.md",
        "int_fields": [],
        "fields": {
            "providerName": "Service Provider's representative name",
            "providerCompany": "Service Provider's company name",
            "providerEmail": "Service Provider's email address",
            "customerName": "Customer's representative name",
            "customerCompany": "Customer's company name",
            "customerEmail": "Customer's email address",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "servicesDescription": "description of professional services to be provided",
            "paymentTerms": "payment terms (e.g. $5,000/month, net 30)",
            "projectTerm": "project term (e.g. 6 months)",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Service Level Agreement": {
        "template": "templates/sla.md",
        "int_fields": [],
        "fields": {
            "providerName": "Provider's representative name",
            "providerCompany": "Provider's company name",
            "providerEmail": "Provider's email address",
            "customerName": "Customer's representative name",
            "customerCompany": "Customer's company name",
            "customerEmail": "Customer's email address",
            "serviceName": "name of the service covered by this SLA",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "uptimeTarget": "uptime target (e.g. 99.9%)",
            "responseTime": "incident response time target (e.g. 4 hours for critical issues)",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
    "Software License Agreement": {
        "template": "templates/Software-License-Agreement.md",
        "int_fields": [],
        "fields": {
            "licensorName": "Licensor's representative name",
            "licensorCompany": "Licensor's company name",
            "licensorEmail": "Licensor's email address",
            "licenseeName": "Licensee's representative name",
            "licenseeCompany": "Licensee's company name",
            "licenseeEmail": "Licensee's email address",
            "softwareName": "name of the software being licensed",
            "effectiveDate": "effective date (e.g. April 26, 2026)",
            "licenseType": "license type (e.g. perpetual, annual subscription)",
            "licenseFee": "license fee (e.g. $10,000 one-time, $1,000/year)",
            "governingLaw": "governing law — state name (e.g. California)",
            "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
        },
    },
}

# ── System prompts ─────────────────────────────────────────────────────────────

_DOC_SELECTION_PROMPT = """\
You are a friendly legal document assistant. Help the user identify which legal document they need.

Supported document types:
{supported_types}

ALWAYS respond with valid JSON — no text outside the JSON object:
{{"message": "your message", "documentType": null, "fields": {{}}}}

Set "documentType" to the EXACT type name from the list when the user clearly requests that type.
Use JSON null (not the string "null") when no type is confirmed yet.

EXAMPLES:

User says "I need an NDA":
{{"message": "I can help with a Mutual Non-Disclosure Agreement. Let me ask you a few questions to fill in the details.", "documentType": "Mutual Non-Disclosure Agreement", "fields": {{}}}}

User says "I need a partnership contract":
{{"message": "A Partnership Agreement would cover that. Let me collect the details.", "documentType": "Partnership Agreement", "fields": {{}}}}

User says "I need an employment agreement":
{{"message": "We don’t currently support Employment Agreements. The closest document I can help with is a Professional Services Agreement, which covers consulting or contractor relationships. Would you like to create that instead?", "documentType": null, "fields": {{}}}}

User says "hello" or hasn’t described what they need:
{{"message": "Hi! I can help you create legal documents. What type of document do you need? I support NDAs, cloud service agreements, pilot agreements, data processing agreements, and more.", "documentType": null, "fields": {{}}}}
""".format(supported_types=_SUPPORTED_TYPE_DESCRIPTIONS)

_FIELD_COLLECTION_PROMPT = """\
You are a friendly legal assistant collecting information for a {doc_type}.

Current field status:
{fields_status}

ALWAYS respond with valid JSON — no text outside the JSON object:
{{"message": "your message", "documentType": "{doc_type}", "fields": {{"fieldName": "value"}}}}

CRITICAL RULE — THE "fields" OBJECT MUST ALWAYS CONTAIN EVERY VALUE YOU CONFIRM OR SET.
If you mention a value anywhere in "message", it MUST also appear in "fields". Never describe a value without extracting it.

EXAMPLES:

Single answer — user provides one value:
Assistant asks: "What is the Provider’s company name?"
User answers: "Acme Corp"
You output: {{"message": "Got it! What is the Provider’s email address?", "documentType": "{doc_type}", "fields": {{"providerCompany": "Acme Corp"}}}}

User updates an already-collected field (e.g. "actually change the company name to Beta Inc"):
You output: {{"message": "Updated! Anything else to change?", "documentType": "{doc_type}", "fields": {{"providerCompany": "Beta Inc"}}}}

User asks for placeholder/example values ("use placeholder names", "fill with examples", "just use dummy data"):
You MUST fill ALL uncollected fields with realistic placeholder values AND include every single one in "fields":
{{"message": "Done! I’ve filled in placeholder values for all fields. ...", "documentType": "{doc_type}", "fields": {{"fieldA": "value", "fieldB": "value", ...ALL uncollected fields here...}}}}

User confirms proposed values ("looks good", "that’s fine", "go ahead"):
Re-emit every previously proposed value that has not yet been extracted into "fields":
{{"message": "Great! ...", "documentType": "{doc_type}", "fields": {{"fieldA": "value", ...any still-unconfirmed fields...}}}}

RULES:
1. Every value mentioned or confirmed in "message" MUST appear in "fields". No exceptions.
2. "same", "same as above" → copy the corresponding already-collected value and include it in "fields".
3. Integer fields {int_fields_hint} must be JSON integers (2, not "2 years").
4. When the user provides multiple values at once, extract ALL of them into "fields" in one response.
5. When all fields are collected, congratulate the user and say the document is ready to generate.\
"""


# ── Helpers ────────────────────────────────────────────────────────────────────

def _bad(msg: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"error": msg}, status_code=status)


def _extract_json(text: str) -> dict:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        return json.loads(text[start : end + 1])
    raise json.JSONDecodeError("No JSON object found", text, 0)


# ── Legacy MNDA validation constants (kept for /api/generate-nda) ──────────────

_MAX_LENGTHS: dict[str, int] = {
    "partyAName": 200, "partyBName": 200,
    "partyACompany": 200, "partyBCompany": 200,
    "partyAAddress": 500, "partyBAddress": 500,
    "partyAEmail": 254, "partyBEmail": 254,
    "purpose": 1000,
    "effectiveDate": 100,
    "governingLaw": 100,
    "jurisdiction": 200,
}

_STRING_FIELDS = [
    "partyAName", "partyACompany", "partyAAddress", "partyAEmail",
    "partyBName", "partyBCompany", "partyBAddress", "partyBEmail",
    "purpose", "effectiveDate", "governingLaw", "jurisdiction",
]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.post("/api/generate-nda")
async def generate_nda(request: Request):
    try:
        body = await request.json()
    except Exception:
        return _bad("Invalid request body.")

    if not isinstance(body, dict):
        return _bad("Invalid request body.")

    for field in _STRING_FIELDS:
        val = body.get(field)
        if not isinstance(val, str) or not val.strip():
            return _bad(f"Missing required field: {field}")
        max_len = _MAX_LENGTHS.get(field)
        if max_len and len(val) > max_len:
            return _bad(f"Field {field} exceeds maximum length of {max_len}.")

    mnda_years = body.get("mndaTermYears")
    if not isinstance(mnda_years, int) or isinstance(mnda_years, bool) or mnda_years < 1:
        return _bad("MNDA term must be at least 1 year.")

    conf_years = body.get("confidentialityYears")
    if not isinstance(conf_years, int) or isinstance(conf_years, bool) or conf_years < 1:
        return _bad("Term of confidentiality must be at least 1 year.")

    data = NdaData(
        partyAName=body["partyAName"],
        partyACompany=body["partyACompany"],
        partyAAddress=body["partyAAddress"],
        partyAEmail=body["partyAEmail"],
        partyBName=body["partyBName"],
        partyBCompany=body["partyBCompany"],
        partyBAddress=body["partyBAddress"],
        partyBEmail=body["partyBEmail"],
        purpose=body["purpose"],
        effectiveDate=body["effectiveDate"],
        mndaTermYears=mnda_years,
        confidentialityYears=conf_years,
        governingLaw=body["governingLaw"],
        jurisdiction=body["jurisdiction"],
    )

    try:
        pdf_bytes = generate_nda_pdf(data)
    except Exception as exc:
        print(f"PDF generation failed: {exc}")
        return _bad("Failed to render PDF.", status=500)

    filename = f"mutual-nda-{int(time.time())}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/generate-doc")
async def generate_doc(request: Request):
    try:
        body = await request.json()
    except Exception:
        return _bad("Invalid request body.")

    if not isinstance(body, dict):
        return _bad("Invalid request body.")

    doc_type = body.get("documentType")
    if not doc_type or doc_type not in _DOC_CONFIGS:
        return _bad("Unknown or missing documentType.")

    fields = body.get("fields")
    if not isinstance(fields, dict):
        return _bad("Invalid fields.")

    config = _DOC_CONFIGS[doc_type]
    field_labels = config["fields"]
    int_field_names = config["int_fields"]

    # Validate all required fields are present and non-empty
    for field in field_labels:
        val = fields.get(field)
        if val is None or str(val).strip() == "":
            return _bad(f"Missing required field: {field_labels[field]}")

    if doc_type == "Mutual Non-Disclosure Agreement":
        # Delegate to the validated MNDA generator
        mnda_years = fields.get("mndaTermYears")
        try:
            mnda_years = int(mnda_years)
        except (TypeError, ValueError):
            return _bad("MNDA term must be a whole number.")
        if mnda_years < 1:
            return _bad("MNDA term must be at least 1 year.")

        conf_years = fields.get("confidentialityYears")
        try:
            conf_years = int(conf_years)
        except (TypeError, ValueError):
            return _bad("Term of confidentiality must be a whole number.")
        if conf_years < 1:
            return _bad("Term of confidentiality must be at least 1 year.")

        data = NdaData(
            partyAName=str(fields["partyAName"]),
            partyACompany=str(fields["partyACompany"]),
            partyAAddress=str(fields["partyAAddress"]),
            partyAEmail=str(fields["partyAEmail"]),
            partyBName=str(fields["partyBName"]),
            partyBCompany=str(fields["partyBCompany"]),
            partyBAddress=str(fields["partyBAddress"]),
            partyBEmail=str(fields["partyBEmail"]),
            purpose=str(fields["purpose"]),
            effectiveDate=str(fields["effectiveDate"]),
            mndaTermYears=mnda_years,
            confidentialityYears=conf_years,
            governingLaw=str(fields["governingLaw"]),
            jurisdiction=str(fields["jurisdiction"]),
        )
        try:
            pdf_bytes = generate_nda_pdf(data)
        except Exception as exc:
            print(f"PDF generation failed: {exc}")
            return _bad("Failed to render PDF.", status=500)
    else:
        template_path = pathlib.Path(__file__).parent / config["template"]
        try:
            template_content = template_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            return _bad("Document template not found.", status=500)

        str_fields = {k: str(v) for k, v in fields.items()}
        try:
            pdf_bytes = generate_generic_pdf(doc_type, str_fields, field_labels, template_content)
        except Exception as exc:
            print(f"PDF generation failed: {exc}")
            return _bad("Failed to render PDF.", status=500)

    safe_name = re.sub(r"[^a-z0-9]+", "-", doc_type.lower()).strip("-")
    filename = f"{safe_name}-{int(time.time())}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: dict
    documentType: str | None = None


@app.post("/api/chat")
async def chat(body: ChatRequest):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return _bad("OPENROUTER_API_KEY not configured.", 500)

    model = os.environ.get("CLAUDE_MODEL", "anthropic/claude-3.5-sonnet")

    # Phase 0: document type not yet selected
    if not body.documentType or body.documentType not in _DOC_CONFIGS:
        system = _DOC_SELECTION_PROMPT
        allowed_fields: set[str] = set()
        int_fields: set[str] = set()
        config = None
    else:
        # Phase 1: collect fields for the confirmed document type
        config = _DOC_CONFIGS[body.documentType]
        field_labels = config["fields"]
        int_fields = set(config["int_fields"])
        allowed_fields = set(field_labels.keys())

        collected = {k: v for k, v in body.fields.items() if v}
        status_lines = [
            f"✓ {label}: {collected[field]}"
            if field in collected
            else f"○ {label}: (not yet collected)"
            for field, label in field_labels.items()
        ]
        int_hint = (
            " and ".join(config["int_fields"]) if config["int_fields"] else "none"
        )
        system = _FIELD_COLLECTION_PROMPT.format(
            doc_type=body.documentType,
            fields_status="\n".join(status_lines),
            int_fields_hint=int_hint,
        )

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "system", "content": system}, *messages],
                },
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            return _bad(f"AI service returned {exc.response.status_code}.", 502)
        except httpx.HTTPError:
            return _bad("Could not reach AI service.", 502)

    raw = ""
    try:
        raw = resp.json()["choices"][0]["message"]["content"]
        parsed = _extract_json(raw)
        message = str(parsed["message"])

        # Resolve document type from response
        response_doc_type = parsed.get("documentType")
        if response_doc_type and response_doc_type not in _DOC_CONFIGS:
            response_doc_type = None
        # Fall back to the current confirmed type if the AI didn't change it
        effective_doc_type = response_doc_type or (body.documentType if body.documentType in _DOC_CONFIGS else None)

        # Extract and filter fields
        raw_fields = parsed.get("fields")
        if isinstance(raw_fields, dict) and allowed_fields:
            new_fields: dict = {}
            for k, v in raw_fields.items():
                if k not in allowed_fields:
                    continue
                if k in int_fields:
                    try:
                        new_fields[k] = int(v)
                    except (TypeError, ValueError):
                        pass
                else:
                    new_fields[k] = v
        else:
            new_fields = {}

    except (KeyError, json.JSONDecodeError, TypeError) as exc:
        print(f"AI parse error: {exc!r}\nRaw content: {raw!r}")
        return _bad("Failed to parse AI response.", 502)

    # Include field metadata so the frontend can check completeness without hardcoding
    effective_config = _DOC_CONFIGS.get(effective_doc_type) if effective_doc_type else None
    return {
        "message": message,
        "documentType": effective_doc_type,
        "fields": new_fields,
        "requiredFields": list(effective_config["fields"].keys()) if effective_config else [],
        "intFields": effective_config["int_fields"] if effective_config else [],
    }


# Static files must be mounted last — API routes above take precedence
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
