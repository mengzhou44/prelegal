import json
import os
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
from pdf_generator import NdaData, generate_nda_pdf

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


def _bad(msg: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"error": msg}, status_code=status)


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


def _extract_json(text: str) -> dict:
    """Parse JSON from Claude's response, tolerating markdown code fences and leading/trailing prose."""
    text = text.strip()
    # Strip ```json ... ``` or ``` ... ``` fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text).strip()
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Fall back: find the outermost {...} block in the text
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])
    raise json.JSONDecodeError("No JSON object found", text, 0)


_FIELD_LABELS: dict[str, str] = {
    "partyAName": "Party A's full name",
    "partyACompany": "Party A's company name",
    "partyAAddress": "Party A's address",
    "partyAEmail": "Party A's email address",
    "partyBName": "Party B's full name",
    "partyBCompany": "Party B's company name",
    "partyBAddress": "Party B's address",
    "partyBEmail": "Party B's email address",
    "purpose": "purpose of the NDA",
    "effectiveDate": "effective date (e.g. April 25, 2026)",
    "mndaTermYears": "MNDA term in years (whole number ≥ 1)",
    "confidentialityYears": "term of confidentiality in years (whole number ≥ 1)",
    "governingLaw": "governing law — state name (e.g. California)",
    "jurisdiction": "jurisdiction for disputes (e.g. San Francisco, California)",
}

_CHAT_SYSTEM_PROMPT = """\
You are a friendly legal assistant helping a user fill out a Mutual Non-Disclosure Agreement (NDA).
Ask ONE question at a time in a warm, professional tone.

Current field status:
{fields_status}

IMPORTANT: Always respond with valid JSON in exactly this format:
{{"message": "your friendly response", "fields": {{"fieldName": "extracted value"}}}}

Rules:
- Only include in "fields" what you just extracted from the user's latest message.
- If nothing new was extracted, return "fields": {{}}.
- For mndaTermYears and confidentialityYears, always extract the value as a JSON integer (not a string).
- If the answer is ambiguous or incomplete, ask for clarification and return "fields": {{}}.
- Never ask for more than one field at a time.
- When all fields are collected, congratulate the user warmly and say the document preview is complete and ready to generate.\
"""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    fields: dict


@app.post("/api/chat")
async def chat(body: ChatRequest):
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return _bad("OPENROUTER_API_KEY not configured.", 500)

    model = os.environ.get("CLAUDE_MODEL", "anthropic/claude-3.5-sonnet")

    collected = {k: v for k, v in body.fields.items() if v}
    status_lines = [
        f"✓ {label}: {collected[field]}" if field in collected else f"○ {label}: (not yet collected)"
        for field, label in _FIELD_LABELS.items()
    ]
    system = _CHAT_SYSTEM_PROMPT.format(fields_status="\n".join(status_lines))

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
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

    try:
        raw = resp.json()["choices"][0]["message"]["content"]
        parsed = _extract_json(raw)
        message = str(parsed["message"])
        new_fields = parsed.get("fields", {})
    except (KeyError, json.JSONDecodeError, TypeError) as exc:
        print(f"AI parse error: {exc!r}\nRaw content: {raw!r}")
        return _bad("Failed to parse AI response.", 502)

    return {"message": message, "fields": new_fields}


# Static files must be mounted last — API routes above take precedence
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
