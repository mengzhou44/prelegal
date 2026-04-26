@AGENTS.md

# PreLegal Frontend

Next.js 16 app configured as a **static export** (`output: 'export'` in `next.config.ts`). The built output (`out/`) is served by the FastAPI backend at `http://localhost:8000`. There is no Next.js server in production — all API calls go to FastAPI.

## Pages

- `/` (`app/page.tsx`) — Legal Document Creator: two-column layout with a resizable chat panel and live document preview. Supports all 11 document types from the catalog. Checks localStorage for a session on mount and redirects to `/login` if none is found.
- `/login` (`app/login/page.tsx`) — Login form (email + password). Calls `POST /api/auth/login` on submit; the backend always returns success regardless of credentials. Stores `{ email }` in `localStorage` as `prelegal_user` and redirects to `/`.

## Auth

Fake authentication using `localStorage`. No real tokens or cookies.

- **Session key**: `prelegal_user` — JSON object `{ email: string }`
- **Login**: POST to `/api/auth/login` → store result → `router.replace('/')`
- **Auth check**: `useEffect` in `app/page.tsx` reads localStorage; missing or invalid → `router.replace('/login')`
- **Sign out**: clears `prelegal_user` from localStorage, redirects to `/login`

## Chat Flow

The AI chat is two-phase:

1. **Phase 0 — Document type selection**: AI asks what document the user needs and matches it to one of the 11 supported types. If the user requests an unsupported type, the AI explains and suggests the closest match.
2. **Phase 1 — Field collection**: Once a type is confirmed, the AI collects the type-specific fields one at a time.

State in `page.tsx`:
- `documentType: string | null` — the confirmed document type (null until phase 0 completes)
- `form: Record<string, string>` — collected field values (reset when document type changes)
- `requiredFields: string[]` / `intFields: string[]` — returned by the chat API when a type is confirmed; used to check completeness locally

The "Start over" button resets all state and reloads the page.

## PDF Generation

- **MNDA**: "Generate PDF" calls `POST /api/generate-nda` with the 14 MNDA fields (int fields converted from string).
- **All other types**: calls `POST /api/generate-doc` with `{ documentType, fields }`.

Both return `application/pdf` blobs downloaded via a temporary anchor element.

The generate button is only shown after a document type is confirmed, and only enabled when all `requiredFields` are non-empty and all `intFields` pass integer validation.

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Document Creator UI — manages `documentType`, `form`, completeness check, PDF download |
| `app/login/page.tsx` | Login form |
| `app/layout.tsx` | Root layout — loads Geist, Geist Mono, Lora fonts |
| `components/chat-panel.tsx` | Two-phase AI chat; exports `ChatFields` (MNDA field type, kept for preview compatibility) |
| `components/nda-preview.tsx` | Live HTML preview of the MNDA document (shown only for Mutual NDA type) |
| `lib/nda-pdf.tsx` | React-PDF document definition (used by tests; PDF is generated server-side in production) |
| `next.config.ts` | `output: 'export'` — no API routes, no SSR |

## ChatPanel Props

```typescript
interface ChatPanelProps {
  documentType: string | null;
  fields: Record<string, string>;
  onFieldsUpdate: (fields: Record<string, string>) => void;
  onDocumentTypeChange: (type: string, requiredFields: string[], intFields: string[]) => void;
}
```

## Preview Panel

- No document type selected: placeholder message
- `documentType === "Mutual Non-Disclosure Agreement"`: renders `<NdaPreview>`
- Any other document type: renders `<KeyTermsPreview>` — a simple table listing all required fields and their collected values with a completion counter

## Color Scheme

- Blue Primary `#209dd7` — logo icon
- Dark Navy `#032147` — headings
- Purple `#753991` — primary action buttons (submit/sign-in)
- Yellow Accent `#ecad0a`
- Gray Text `#888888`

## Running Tests

```bash
npm test
```

29 Jest tests across `__tests__/nda-pdf.test.ts` and `__tests__/nda-preview.test.tsx`.

## Building

```bash
npm run build   # generates out/ for Docker
npm run dev     # dev server at localhost:3000 (API calls need FastAPI running at :8000)
```
