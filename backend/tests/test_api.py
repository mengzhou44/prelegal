import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

VALID_BODY = {
    "partyAName": "Alice",
    "partyACompany": "Acme",
    "partyAAddress": "123 Main St",
    "partyAEmail": "alice@acme.com",
    "partyBName": "Bob",
    "partyBCompany": "Widget",
    "partyBAddress": "456 Market St",
    "partyBEmail": "bob@widget.com",
    "purpose": "Exploring partnership",
    "effectiveDate": "January 1, 2025",
    "mndaTermYears": 2,
    "confidentialityYears": 3,
    "governingLaw": "California",
    "jurisdiction": "San Francisco, California",
}


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_login_always_succeeds():
    res = client.post("/api/auth/login", json={"email": "any@example.com", "password": "anything"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["user"]["email"] == "any@example.com"


def test_login_returns_provided_email():
    res = client.post("/api/auth/login", json={"email": "test@corp.com", "password": "wrong"})
    assert res.status_code == 200
    assert res.json()["user"]["email"] == "test@corp.com"


class TestGenerateNda:
    def test_valid_request_returns_pdf(self):
        res = client.post("/api/generate-nda", json=VALID_BODY)
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert res.content[:4] == b"%PDF"

    def test_content_disposition_header(self):
        res = client.post("/api/generate-nda", json=VALID_BODY)
        cd = res.headers.get("content-disposition", "")
        assert "attachment" in cd
        assert "mutual-nda-" in cd

    @pytest.mark.parametrize("field", [
        "partyAName", "partyACompany", "partyAAddress", "partyAEmail",
        "partyBName", "partyBCompany", "partyBAddress", "partyBEmail",
        "purpose", "effectiveDate", "governingLaw", "jurisdiction",
    ])
    def test_missing_field_returns_400(self, field):
        res = client.post("/api/generate-nda", json={**VALID_BODY, field: ""})
        assert res.status_code == 400
        assert field in res.json()["error"]

    def test_whitespace_only_field_returns_400(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "partyAName": "   "})
        assert res.status_code == 400

    def test_mnda_term_zero_returns_400(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "mndaTermYears": 0})
        assert res.status_code == 400
        assert "MNDA term" in res.json()["error"]

    def test_mnda_term_negative_returns_400(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "mndaTermYears": -1})
        assert res.status_code == 400

    def test_mnda_term_float_returns_400(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "mndaTermYears": 1.5})
        assert res.status_code == 400

    def test_mnda_term_one_accepted(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "mndaTermYears": 1})
        assert res.status_code == 200

    def test_confidentiality_years_zero_returns_400(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "confidentialityYears": 0})
        assert res.status_code == 400
        assert "confidentiality" in res.json()["error"].lower()

    def test_confidentiality_years_float_returns_400(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "confidentialityYears": 2.7})
        assert res.status_code == 400

    def test_partyAName_too_long_returns_400(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "partyAName": "A" * 201})
        assert res.status_code == 400

    def test_purpose_max_length_accepted(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "purpose": "x" * 1000})
        assert res.status_code == 200

    def test_purpose_too_long_returns_400(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "purpose": "x" * 1001})
        assert res.status_code == 400

    def test_singular_year_in_pdf(self):
        res = client.post("/api/generate-nda", json={**VALID_BODY, "mndaTermYears": 1, "confidentialityYears": 1})
        assert res.status_code == 200
        assert res.content[:4] == b"%PDF"
