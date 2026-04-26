@AGENTS.md

# PreLegal Frontend

Next.js 16 app configured as a **static export** (`output: 'export'` in `next.config.ts`). The built output (`out/`) is served by the FastAPI backend at `http://localhost:8000`. There is no Next.js server in production — all API calls go to FastAPI.

## Pages

- `/` (`app/page.tsx`) — Mutual NDA Creator: two-column layout with a resizable form panel and live document preview. Checks localStorage for a session on mount and redirects to `/login` if none is found.
- `/login` (`app/login/page.tsx`) — Login form (email + password). Calls `POST /api/auth/login` on submit; the backend always returns success regardless of credentials. Stores `{ email }` in `localStorage` as `prelegal_user` and redirects to `/`.

## Auth

Fake authentication using `localStorage`. No real tokens or cookies.

- **Session key**: `prelegal_user` — JSON object `{ email: string }`
- **Login**: POST to `/api/auth/login` → store result → `router.replace('/')`
- **Auth check**: `useEffect` in `app/page.tsx` reads localStorage; missing or invalid → `router.replace('/login')`
- **Sign out**: clears `prelegal_user` from localStorage, redirects to `/login`

## PDF Generation

The "Generate PDF" button in `app/page.tsx` calls `POST /api/generate-nda` on the FastAPI backend (not a Next.js API route — there are none). The backend returns a `application/pdf` blob which is downloaded via a temporary anchor element.

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | NDA Creator UI, auth check, PDF download |
| `app/login/page.tsx` | Login form |
| `app/layout.tsx` | Root layout — loads Geist, Geist Mono, Lora fonts |
| `components/nda-preview.tsx` | Live HTML preview of the NDA document |
| `lib/nda-pdf.tsx` | React-PDF document definition (used by tests; PDF is now generated server-side) |
| `next.config.ts` | `output: 'export'` — no API routes, no SSR |

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
