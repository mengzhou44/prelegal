import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import init_db
from pdf_generator import NdaData, generate_nda_pdf


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


# Static files must be mounted last — API routes above take precedence
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
