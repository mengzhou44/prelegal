# PreLegal Backend

FastAPI application serving the static Next.js frontend and all API endpoints. Uses `uv` for dependency management. Run with `uvicorn main:app`.

## Project Structure

```
backend/
  main.py            # All API routes and chat logic
  pdf_generator.py   # MNDA ReportLab generator + generic PDF generator
  database.py        # SQLite init (users table)
  catalog.json       # 11 supported document types with template paths
  templates/         # Common Paper markdown templates (.md) for all 11 types
  tests/             # pytest integration tests
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/signup` | Create account (bcrypt hash, 409 on duplicate email) |
| `POST` | `/api/auth/login` | Verify credentials (bcrypt compare, 401 on bad password) |
| `POST` | `/api/chat` | Two-phase AI chat (type selection + field collection) |
| `POST` | `/api/generate-nda` | Generate Mutual NDA PDF (legacy endpoint, validated separately) |
| `POST` | `/api/generate-doc` | Generate PDF for any of the 11 document types |

Static files (`backend/static/`) are mounted last and serve the Next.js build at `/`.

## Document Type System

All 11 supported types are defined in `_DOC_CONFIGS` in `main.py`. Each entry has:
- `template`: relative path to the `.md` file in `templates/`
- `int_fields`: list of field names that must be JSON integers (only MNDA has these)
- `fields`: ordered dict of `fieldName → human-readable label` used for both prompting and validation

`catalog.json` is the source of truth for the type list and descriptions shown to the AI.

## Chat System (`/api/chat`)

**Request**: `{ messages, fields, documentType }` — `documentType` is `null` until confirmed.

**Phase 0** (no `documentType`): uses `_DOC_SELECTION_PROMPT`, which lists all 11 types. AI returns `documentType` as the exact type name, or `null` if the request is unsupported.

**Phase 1** (documentType set): uses `_FIELD_COLLECTION_PROMPT` (formatted with the doc type, live field status, and int field hints). AI collects one field per turn.

**Response**: `{ message, documentType, fields, requiredFields, intFields }` — `requiredFields` and `intFields` let the frontend check completeness without hardcoding the field list.

Fields returned by the AI are filtered through the `allowed_fields` allowlist for the active document type. Integer fields are coerced to `int`; invalid values are silently dropped.

## PDF Generation

**MNDA** (`/api/generate-nda` and `/api/generate-doc` with `documentType = "Mutual Non-Disclosure Agreement"`):
- Validates all 14 fields including integer constraints
- Calls `generate_nda_pdf(NdaData)` from `pdf_generator.py`
- Uses hardcoded ReportLab clauses (not read from the template file)

**All other types** (`/api/generate-doc`):
- Reads the `.md` template file from `templates/`
- Calls `generate_generic_pdf(doc_type, fields, field_labels, template_content)`
- Produces: title → Cover Page table (key terms) → Standard Terms (markdown rendered via `_md_to_rl()`)

`_md_to_rl()` converts a markdown paragraph block to ReportLab XML: strips `<span>` tags, strips `[text](url)` links, HTML-escapes, then converts `**bold**` / `*italic*`.

## Running

```bash
# Install dependencies
uv sync

# Start dev server
uvicorn main:app --reload --port 8000

# Run tests
uv run pytest tests/
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | — | Required for `/api/chat` |
| `CLAUDE_MODEL` | `anthropic/claude-3.5-sonnet` | Model passed to OpenRouter |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
