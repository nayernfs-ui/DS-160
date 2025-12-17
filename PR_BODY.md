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
  - `test/military.test.js` — validates initial collapsed state of `militaryFields` (hidden, `aria-expanded="false"`, `aria-hidden="true"`, no required attributes), toggling to `Yes` sets visible state and required attributes (e.g., `Military_Branch`, `Military_ServiceFrom_Year`), and toggling to `No` hides the container and removes required attributes.
  - Updated existing `test/visits.test.js` to reflect `US_Visited` naming and the add/remove behavior (including removing last visit node and auto-switching to `No`).
- **Test results:** Ran full test suite via `npm test`; all tests passed (see test runner output).
All tests have passed; the `feature/military-us-visits-accessibility` branch is ready for review and merge.
