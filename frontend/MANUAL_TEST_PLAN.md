# Manual Test Plan — PreLegal Mutual NDA Creator

Run `npm run dev` and open http://localhost:3000 before starting.

---

## 1. Live Preview (updates as you type)

| # | Action | Expected |
|---|--------|----------|
| 1.1 | Load the page with no data entered | All fields in preview show indigo placeholder chips (e.g. "Party A Name", "X", "State") |
| 1.2 | Type in Party A Name | Preview cover page and signature block update immediately |
| 1.3 | Type `1` in MNDA Term | Preview shows "1 year" (singular) |
| 1.4 | Type `2` in MNDA Term | Preview shows "2 years" (plural) |
| 1.5 | Type in Purpose | Preview title clause and clause 2 both update |
| 1.6 | Clear a filled field | Placeholder chip reappears in preview |

---

## 2. Form Layout & Resize

| # | Action | Expected |
|---|--------|----------|
| 2.1 | Drag the vertical divider right | Form panel widens; preview shrinks |
| 2.2 | Drag divider to the far right | Form panel stops at 700 px max |
| 2.3 | Drag divider to the far left | Form panel stops at 280 px min |
| 2.4 | Resize browser window | Layout stays in two-column; no overflow |
| 2.5 | Scroll inside the form panel | Preview panel does not scroll; form scrolls independently |

---

## 3. PDF Generation — Happy Path

| # | Action | Expected |
|---|--------|----------|
| 3.1 | Fill all fields with valid data; click "↓ Generate PDF" | Button shows "Generating…" then browser downloads a `.pdf` file |
| 3.2 | Open the downloaded PDF | Party A and B details appear correctly; all 10 clauses present; MNDA Term and Confidentiality Term show correct years |
| 3.3 | Generate with `mndaTermYears = 1` | PDF reads "1 year" (not "1 years") |
| 3.4 | Generate with `confidentialityYears = 5` | PDF reads "5 years" |
| 3.5 | Generate twice in a row | Each download gets a unique filename (different timestamp) |

---

## 4. Validation Errors

| # | Action | Expected |
|---|--------|----------|
| 4.1 | Click Generate with all fields empty | Error banner appears: "Missing required field: partyAName" |
| 4.2 | Fill all except Party B Email; click Generate | Error banner: "Missing required field: partyBEmail" |
| 4.3 | Set MNDA Term to `0`; click Generate | Error banner: "MNDA term must be at least 1 year" |
| 4.4 | Set Confidentiality to `-1`; click Generate | Error banner: confidentiality error message shown |
| 4.5 | Fix the error and click Generate again | Error banner disappears; download starts |
| 4.6 | Try to enter `0.5` in a year field (browser number input) | Browser should reject (step=1 prevents fractional input) |

---

## 5. Edge Cases

| # | Action | Expected |
|---|--------|----------|
| 5.1 | Enter special characters in name: `O'Brien & Sons` | Preview and PDF both display correctly without corruption |
| 5.2 | Enter a very long purpose (200+ characters) | Preview wraps gracefully; no layout breakage |
| 5.3 | Enter an email with `+` character: `alice+test@acme.com` | Accepted and rendered correctly |
| 5.4 | Enter an address with newline (paste multi-line text) | Displayed inline; no crash |

---

## 6. Header & Branding

| # | Action | Expected |
|---|--------|----------|
| 6.1 | Check header appearance | White background, light border, "⚖ PreLegal" + "Mutual NDA Creator" text, PROTOTYPE badge |
| 6.2 | Check footer of preview | "Common Paper Mutual NDA v1.0 · CC BY 4.0 · commonpaper.com" |
| 6.3 | Click the CC BY 4.0 link at bottom of form | Opens creativecommons.org in new tab |
