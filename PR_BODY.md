**New Features**

- **U.S. Visits History:** Replaced the single-field question with a radio group `US_Visited` and a repeatable visits container `US_Visits_Container`. Implemented up to five repeatable visit entries named with the `USVisit_{n}_...` pattern (e.g., `USVisit_1_DateArrived_Year`, `USVisit_1_Length`, `USVisit_1_Unit`). Added Arabic labels and screen-reader-only helpers for accessible labeling.
- **Military Service Accessibility + Behavior:** Enhanced the Military Service section:
  - Added `aria-live="polite"`, `aria-expanded="false"`, and `aria-hidden="true"` to `militaryFields` for initial state.
  - Wrapped start/end date inputs in `div.date-row-group` elements with `role="group"` and connected them to unique visible label ids (`milServiceFromLabel`, `milServiceToLabel`) via `aria-labelledby`.
    **Code Quality / Refactoring**
- **`script.js`:**
  - Added robust helper `setMilitaryRequired(is_required)` to toggle `required` attributes for all controls inside `militaryFields`.
  - Refactored the `Military_Served` radio handler to:
    - Toggle visibility via `style.display`.
    - Update `militaryFields` attributes: `aria-expanded` and `aria-hidden`.
    - Call `setMilitaryRequired(true|false)` appropriately.
  - Improved U.S. Visits add/remove logic earlier: cloning templates, renumbering, and required-attribute management; when the last visit is removed the DOM node is removed and `US_Visited` is programmatically set to `No`.
- **`index.html`:**
  - Ensured label elements have unique `id` where needed and date groups have `role="group"` and `aria-labelledby`.
  - Added `aria` attributes to the toggled containers for assistive tech clarity.
    **Testing / Stability**
- **New tests:**
- `tests/unit/military.test.js` — validates initial collapsed state of `militaryFields` (hidden, `aria-expanded="false"`, `aria-hidden="true"`, no required attributes), toggling to `Yes` sets visible state and required attributes (e.g., `Military_Branch`, `Military_ServiceFrom_Year`), and toggling to `No` hides the container and removes required attributes.
- Updated existing `tests/unit/visits.test.js` to reflect `US_Visited` naming and the add/remove behavior (including removing last visit node and auto-switching to `No`).
- **Test results:** Ran full test suite via `npm test`; all tests passed (see test runner output).
  All tests have passed; the `feature/military-us-visits-accessibility` branch is ready for review and merge.

**Maintenance / Cleanup**

- Removed generated artifacts (`*.txt`, `*.log`, `served.html` if empty) and deleted obsolete `test/` folder that duplicated `tests/unit/` files.
- Rewrote `.gitignore` to include common build artifacts, logs, and generated test outputs to prevent committing transient files.
- Ran `eslint --fix` and ensured linting passes; re-ran full test suite to confirm no regressions.

- HTML cleanup: fixed structural issues in `index.html` (removed duplicate `otherNationalitySelect`, removed Ex‑spouse Place of Birth field where requested, corrected mis-nested and unclosed tags), added `html-validate` to `lint-staged` for `index.html`, and verified `html-validate` reports no errors for both `index.html` and `public/index.html` locally.

- Added `xmldom` (dev) to satisfy `tools/` scripts that parse DOCX XML.
- Ran `depcheck` and confirmed no unused production dependencies; some dev tools remain intentionally installed (eslint, prettier, html-validate, lint-staged).
- Smoke tests for DOCX/email ran; the email send attempt returned 401 (Unauthorized) because the Sendinblue/Brevo API key is not set in the environment — this is expected unless credentials are provided.
