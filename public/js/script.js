document.addEventListener('DOMContentLoaded', (_event) => {
  // 1. Marital Status Logic
  const maritalStatusSelect = document.getElementById('maritalStatus');
  const marriedFields = document.getElementById('marriedFields');
  const widowedFields = document.getElementById('widowedFields');
  const divorcedFields = document.getElementById('divorcedFields');

  // --- NEW / MODIFIED SUBMISSION LOGIC WITH INLINE ERRORS ---
  const form = document.getElementById('ds160Form');
  const confirmationMessage = document.getElementById('confirmationMessage');

  if (form) {
    form.addEventListener('submit', function (event) {
      let isValid = true;
      const allFields = form.querySelectorAll(
        'input[required], textarea[required], select[required]'
      );

      // 1. Reset all errors
      form.querySelectorAll('.error-message').forEach((span) => (span.textContent = ''));
      form.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));

      // 2. Validation Check
      allFields.forEach((field) => {
        const closestFieldset = field.closest('fieldset');
        const isVisible = closestFieldset
          ? window.getComputedStyle(closestFieldset).display !== 'none'
          : true;

        if (field.hasAttribute('required') && isVisible) {
          if (!field.value || !field.value.toString().trim()) {
            isValid = false;
            field.classList.add('is-invalid');

            // Display inline error message
            const errorSpan = document.getElementById(`error-${field.id}`);
            if (errorSpan) {
              errorSpan.textContent = 'هذا الحقل مطلوب.';
            }
          } else {
            // Additional pattern validation for the start year
            if (field.id === 'startDateCurrent') {
              const yr = field.value.toString().trim();
              if (!/^[0-9]{4}$/.test(yr)) {
                isValid = false;
                field.classList.add('is-invalid');
                const errorSpan = document.getElementById(`error-${field.id}`);
                if (errorSpan) errorSpan.textContent = 'الرجاء إدخال سنة صحيحة مكونة من 4 أرقام.';
              } else {
                field.classList.remove('is-invalid');
                const errorSpan = document.getElementById(`error-${field.id}`);
                if (errorSpan) errorSpan.textContent = '';
              }
            } else {
              field.classList.remove('is-invalid');
            }
          }
        }
      });

      if (!isValid) {
        // Prevent submission when validation fails
        event.preventDefault();
        return;
      }

      // If the action is external (different origin), allow the normal form submission
      // to proceed (this avoids CORS issues with Fetch on services like formsubmit.co).
      // If you explicitly want AJAX, set `data-use-ajax="true"` on the form and
      // the code will attempt a fetch when same-origin or when the attribute is present.
      try {
        const actionUrl = new URL(form.action, window.location.href);
        const isSameOrigin = actionUrl.origin === window.location.origin;
        const useAjax = form.getAttribute('data-use-ajax') === 'true';

        if (!isSameOrigin && !useAjax) {
          // Let the browser submit the form (target="_blank" will open a new tab).
          return;
        }

        // Otherwise, attempt AJAX submit (for same-origin or explicit opt-in).
        const formData = new FormData(form);

        // Convert FormData to a JSON object so the serverless proxy can forward it.
        const jsonObj = {};
        formData.forEach((value, key) => {
          if (Object.prototype.hasOwnProperty.call(jsonObj, key)) {
            if (!Array.isArray(jsonObj[key])) jsonObj[key] = [jsonObj[key]];
            jsonObj[key].push(value);
          } else {
            jsonObj[key] = value;
          }
        });

        // Ensure the duplicated education fields (suffix _2.._5) are always present in
        // the submitted JSON (so the server-side generator can pick them up even when empty).
        for (let idx = 2; idx <= 5; idx++) {
          const keys = [
            `Education_InstitutionName_${idx}`,
            `Education_Address_${idx}`,
            `Education_QualificationName_${idx}`,
            `Education_QualificationMajor_${idx}`,
            `Education_StudyStartDate_Day_${idx}`,
            `Education_StudyStartDate_Month_${idx}`,
            `Education_StudyStartDate_Year_${idx}`,
            `Education_StudyEndDate_Day_${idx}`,
            `Education_StudyEndDate_Month_${idx}`,
            `Education_StudyEndDate_Year_${idx}`,
          ];
          keys.forEach((k) => {
            if (!Object.prototype.hasOwnProperty.call(jsonObj, k)) jsonObj[k] = '';
          });
        }

        // Ensure military fields are always present in the JSON (even when hidden)
        const ensureMilitaryKeys = [
          'Military_Served',
          'Military_Branch',
          'Military_Rank',
          'Military_Specialty',
          'Military_ServiceFrom_Day',
          'Military_ServiceFrom_Month',
          'Military_ServiceFrom_Year',
          'Military_ServiceTo_Day',
          'Military_ServiceTo_Month',
          'Military_ServiceTo_Year',
        ];
        ensureMilitaryKeys.forEach((k) => {
          if (!Object.prototype.hasOwnProperty.call(jsonObj, k)) jsonObj[k] = '';
        });

        // Ensure immediate relatives fields are always present (even when hidden or not used)
        for (let idx = 1; idx <= 10; idx++) {
          const keys = [
            `Relative_${idx}_Surnames`,
            `Relative_${idx}_GivenNames`,
            `Relative_${idx}_Relationship`,
            `Relative_${idx}_Status`,
          ];
          keys.forEach((k) => {
            if (!Object.prototype.hasOwnProperty.call(jsonObj, k)) jsonObj[k] = '';
          });
        }

        event.preventDefault();
        fetch(form.action, {
          method: 'POST',
          body: JSON.stringify(jsonObj),
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        })
          .then((response) => {
            if (response.ok) {
              form.style.display = 'none';
              if (confirmationMessage) {
                confirmationMessage.style.display = 'block';
                setTimeout(() => {
                  confirmationMessage.style.opacity = 1;
                  confirmationMessage.style.animation = 'fadeIn 0.5s ease-out';
                }, 20);
              }
            } else {
              alert('عفواً، حدث خطأ أثناء إرسال البيانات. الرجاء المحاولة مرة أخرى.');
            }
          })
          .catch((error) => {
            console.error('Error submitting form:', error);
            alert('حدث خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.');
          });
      } catch (e) {
        // If URL parsing fails for any reason, default to normal submit to avoid blocking the user.
        return;
      }
    });
  }

  function hideAllMaritalFields() {
    [marriedFields, widowedFields, divorcedFields].forEach((f) => {
      if (f) {
        // Use setProperty with !important so explicit CSS rules can't override JS
        f.style.setProperty('display', 'none', 'important');
        f.style.animation = '';
        f.setAttribute('aria-hidden', 'true');
        f.setAttribute('aria-expanded', 'false');
      }
    });

    // make spouse current address not required when the marital sections are hidden
    const spouseAddr = document.getElementById('spouseCurrentAddress');
    if (spouseAddr) spouseAddr.removeAttribute('required');
  }

  // force hide canonical marital containers using inline !important (fail-proof)
  function forceVisibilityReset() {
    const married = document.getElementById('marriedFields');
    const widowed = document.getElementById('widowedFields');
    const divorced = document.getElementById('divorcedFields');

    // Hide ALL first using inline !important
    if (married) {
      married.style.setProperty('display', 'none', 'important');
      married.style.animation = '';
      married.setAttribute('aria-hidden', 'true');
      married.setAttribute('aria-expanded', 'false');
    }
    if (widowed) {
      widowed.style.setProperty('display', 'none', 'important');
      widowed.style.animation = '';
      widowed.setAttribute('aria-hidden', 'true');
      widowed.setAttribute('aria-expanded', 'false');
    }
    if (divorced) {
      divorced.style.setProperty('display', 'none', 'important');
      divorced.style.animation = '';
      divorced.setAttribute('aria-hidden', 'true');
      divorced.setAttribute('aria-expanded', 'false');
    }
  }

  // helper to hide only the widowed fields and clean up any required flags/errors
  function hideWidowedFields() {
    if (!widowedFields) return;
    // Use setProperty with !important so explicit CSS rules can't override JS
    widowedFields.style.setProperty('display', 'none', 'important');
    widowedFields.style.animation = '';
    widowedFields.setAttribute('aria-hidden', 'true');
    widowedFields.setAttribute('aria-expanded', 'false');
    // remove required and error markers from any inputs inside widowed fields
    widowedFields.querySelectorAll('input, select, textarea').forEach((el) => {
      el.removeAttribute('required');
      el.classList.remove('is-invalid');
      const err = document.getElementById(`error-${el.id}`);
      if (err) err.textContent = '';
    });
  }

  // helper to hide only the married fields and clean up any required flags/errors
  function hideMarriedFields() {
    if (!marriedFields) return;
    // Use setProperty with !important so explicit CSS rules can't override JS
    marriedFields.style.setProperty('display', 'none', 'important');
    marriedFields.style.animation = '';
    marriedFields.setAttribute('aria-hidden', 'true');
    marriedFields.setAttribute('aria-expanded', 'false');
    // remove required and error markers from any inputs inside married fields
    marriedFields.querySelectorAll('input, select, textarea').forEach((el) => {
      el.removeAttribute('required');
      el.classList.remove('is-invalid');
      const err = document.getElementById(`error-${el.id}`);
      if (err) err.textContent = '';
    });
  }

  // helper to set spouse address required state
  function setSpouseAddressRequired(isRequired) {
    const spouseAddr = document.getElementById('spouseCurrentAddress');
    const errSpan = document.getElementById('error-Spouse_CurrentAddress');
    if (!spouseAddr) return;
    if (isRequired) {
      spouseAddr.setAttribute('required', 'required');
      if (errSpan) errSpan.textContent = '';
    } else {
      spouseAddr.removeAttribute('required');
      if (errSpan) errSpan.textContent = '';
      spouseAddr.classList.remove('is-invalid');
    }
  }

  // helper to hide only the divorced fields and clean up any required flags/errors
  function hideDivorcedFields() {
    if (!divorcedFields) return;
    divorcedFields.style.setProperty('display', 'none', 'important');
    divorcedFields.style.animation = '';
    divorcedFields.setAttribute('aria-hidden', 'true');
    divorcedFields.setAttribute('aria-expanded', 'false');
    // remove required and error markers from any inputs inside divorced fields
    divorcedFields.querySelectorAll('input, select, textarea').forEach((el) => {
      el.removeAttribute('required');
      el.classList.remove('is-invalid');
      const err = document.getElementById(`error-${el.id}`);
      if (err) err.textContent = '';
    });
  }

  // helper to set required attributes for divorced fields
  function setDivorcedRequired(isRequired) {
    const ids = ['exName', 'exDOBYear', 'dateOfDivorceYear', 'nationality'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (isRequired) el.setAttribute('required', 'required');
      else el.removeAttribute('required');
    });

    // sync add/remove controls depending on max
    const formerContainer = document.getElementById('formerSpousesContainer');
    if (formerContainer) {
      const entries = formerContainer.querySelectorAll('.former-spouse.entry').length;
      const max = 5;
      const addBtns = formerContainer.querySelectorAll('.add-former-spouse');
      addBtns.forEach((b) => (b.disabled = entries >= max));
      // ensure count input reflects actual number of entries
      const countInput = document.getElementById('formerSpouseCount');
      if (countInput) countInput.value = Math.max(1, entries);
    }
  }

  // helper to show a conditional fieldset, scroll it into view and focus its first input
  function showConditionalFieldset(fieldset) {
    if (!fieldset) return;

    // Hide all other marital sections first to avoid multiple visible sections
    hideAllMaritalFields();

    // Use setProperty with !important so inline intent overrides stylesheet !important
    fieldset.style.setProperty('display', 'block', 'important');
    fieldset.style.animation = 'fadeIn 0.5s';
    fieldset.setAttribute('aria-hidden', 'false');
    fieldset.setAttribute('aria-expanded', 'true');

    // If we're showing the married fields, make the spouse address and key spouse DOB fields required
    if (fieldset === marriedFields) {
      setSpouseAddressRequired(true);
      // require specific spouse DOB controls by ID to avoid broad class overlaps
      ['spouseDOBDay', 'spouseDOBMonth', 'spouseDOBYear'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('required', 'required');
      });
    }

    // focus first form control and scroll into view after a short delay to allow layout
    const firstControl = fieldset.querySelector('input, select, textarea, button, a');
    setTimeout(() => {
      if (firstControl && typeof firstControl.focus === 'function') {
        firstControl.focus({ preventScroll: true });
      }
      try {
        fieldset.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        /* ignore */
      }
    }, 50);
  }

  // ensure ARIA attributes are set correctly at load
  // Use a single update function that hides all sections first then shows the requested one
  function updateMaritalFields() {
    const select = document.getElementById('maritalStatus');
    if (!select) return;

    // preserve exact casing from the select value (e.g., "Married", "Widowed")
    const status = (select.value || '').trim();
    const marriedDiv = document.getElementById('marriedFields');
    const widowedDiv = document.getElementById('widowedFields');

    // 1. Force Reset: hide everything first (use !important to override stylesheet)
    forceVisibilityReset();

    // Remove required/error flags from all sections to ensure a clean state
    hideMarriedFields();
    hideWidowedFields();
    hideDivorcedFields();

    // 2. Exact Match Selection (case-sensitive)
    if (status === 'Married' && marriedDiv) {
      marriedDiv.style.setProperty('display', 'block', 'important');
      marriedDiv.setAttribute('aria-hidden', 'false');
      marriedDiv.setAttribute('aria-expanded', 'true');
      // ensure spouse address and spouse DOB controls are required
      setSpouseAddressRequired(true);
      ['spouseDOBDay', 'spouseDOBMonth', 'spouseDOBYear'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('required', 'required');
      });
    } else if (status === 'Widowed' && widowedDiv) {
      widowedDiv.style.setProperty('display', 'block', 'important');
      widowedDiv.setAttribute('aria-hidden', 'false');
      widowedDiv.setAttribute('aria-expanded', 'true');
      // widowed: ensure spouse address is not required
      setSpouseAddressRequired(false);
    } else if (status === 'Divorced' && divorcedFields) {
      // Show divorced block and ensure others remain hidden
      divorcedFields.style.setProperty('display', 'block', 'important');
      divorcedFields.setAttribute('aria-hidden', 'false');
      divorcedFields.setAttribute('aria-expanded', 'true');
      // divorced: ensure spouse address is not required
      setSpouseAddressRequired(false);
      // require key divorced fields
      setDivorcedRequired(true);
    } else {
      // not divorced, ensure divorced-specific required attrs are cleared
      setDivorcedRequired(false);
    }
  }

  if (maritalStatusSelect) {
    // initialize the UI and attach a single listener that uses exact matches
    updateMaritalFields();
    maritalStatusSelect.addEventListener('change', updateMaritalFields);

    /**
     * Manual testing note (documentation only):
     * To trigger the marital update immediately in the browser console run:
     *   document.getElementById('maritalStatus').dispatchEvent(new Event('change'))
     * This is documentation only and not executed at runtime.
     */

    // Former spouse add/remove controls (simple cloning UI)
    const formerContainer = document.getElementById('formerSpousesContainer');
    if (formerContainer) {
      formerContainer.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t.classList && t.classList.contains('add-former-spouse')) {
          ev.preventDefault();
          const entries = formerContainer.querySelectorAll('.former-spouse.entry');
          const max = 5; // limit to 5 former spouses
          if (entries.length >= max) return;
          const first = entries[0];
          if (!first) return;
          const clone = first.cloneNode(true);
          const newIndex = entries.length + 1;
          clone.setAttribute('data-index', String(newIndex));
          // Update ids, names and label for attributes by replacing trailing numeric suffix
          clone.querySelectorAll('[id]').forEach((el) => {
            el.id = el.id.replace(/_(\d+)$/, `_${newIndex}`);
            if (el.name) el.name = el.name.replace(/_(\d+)$/, `_${newIndex}`);
            if (el.type === 'text' || el.tagName.toLowerCase() === 'textarea') el.value = '';
            if (el.type === 'checkbox') el.checked = false;
            if (el.tagName.toLowerCase() === 'select') el.selectedIndex = 0;
          });
          clone.querySelectorAll('label[for]').forEach((lbl) => {
            lbl.setAttribute('for', lbl.getAttribute('for').replace(/_(\d+)$/, `_${newIndex}`));
          });
          formerContainer.appendChild(clone);

          // update count and disable add buttons if at max
          const after = formerContainer.querySelectorAll('.former-spouse.entry').length;
          const countInput = document.getElementById('formerSpouseCount');
          if (countInput) countInput.value = after;
          // disable add buttons if reached max
          if (after >= max) {
            formerContainer
              .querySelectorAll('.add-former-spouse')
              .forEach((b) => (b.disabled = true));
          }
        }

        if (t.classList && t.classList.contains('remove-former-spouse')) {
          ev.preventDefault();
          const entry = t.closest('.former-spouse.entry');
          if (!entry) return;
          const entries = Array.from(formerContainer.querySelectorAll('.former-spouse.entry'));
          if (entries.length === 1) {
            // clear fields rather than removing the last one
            entry.querySelectorAll('input, textarea, select').forEach((el) => {
              if (el.type === 'checkbox') el.checked = false;
              else el.value = '';
            });
            // sync count
            const countInput = document.getElementById('formerSpouseCount');
            if (countInput) countInput.value = 1;
            return;
          }
          entry.remove();

          // re-index remaining entries so ids/names remain sequential
          const remaining = Array.from(formerContainer.querySelectorAll('.former-spouse.entry'));
          remaining.forEach((el, idx) => {
            const index = idx + 1;
            el.setAttribute('data-index', String(index));
            el.querySelectorAll('[id]').forEach((child) => {
              child.id = child.id.replace(/_(\d+)$/, `_${index}`);
              if (child.name) child.name = child.name.replace(/_(\d+)$/, `_${index}`);
            });
            el.querySelectorAll('label[for]').forEach((lbl) => {
              lbl.setAttribute('for', lbl.getAttribute('for').replace(/_(\d+)$/, `_${index}`));
            });
          });

          // sync count and re-enable add buttons
          const countInput = document.getElementById('formerSpouseCount');
          const now = formerContainer.querySelectorAll('.former-spouse.entry').length;
          if (countInput) countInput.value = now;
          formerContainer
            .querySelectorAll('.add-former-spouse')
            .forEach((b) => (b.disabled = false));
        }
      });
    }
  }

  // 2. Travel Companion Logic
  const travelRadios = document.querySelectorAll('input[name="TravellingWithOthers"]');
  const companionFields = document.getElementById('travelCompanionFields');

  travelRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (companionFields) {
        if (this.value === 'Yes') {
          companionFields.style.display = 'block';
          companionFields.style.animation = 'fadeIn 0.5s';
        } else {
          companionFields.style.display = 'none';
        }
      }
    });
  });

  // 3. Visa Denial Logic
  const denialRadios = document.querySelectorAll('input[name="USVisaDenied"]');
  const denialTimeField = document.getElementById('denialTimeField');

  denialRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (denialTimeField) {
        if (this.id === 'deniedYes') {
          denialTimeField.style.display = 'block';
          denialTimeField.style.animation = 'fadeIn 0.5s';
        } else {
          denialTimeField.style.display = 'none';
        }
      }
    });
  });

  // 3b. Previous U.S. Visa details (show when HadUSVisaBefore = Yes)
  const hadVisaRadios = document.querySelectorAll('input[name="HadUSVisaBefore"]');
  const previousUSVisas = document.getElementById('previousUSVisas');
  const visaNumberInput = document.getElementById('visaNumber');
  const visaNumberUnknown = document.getElementById('visaNumberUnknown');

  hadVisaRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (previousUSVisas) {
        if (this.value === 'Yes') {
          previousUSVisas.style.display = 'block';
          previousUSVisas.style.animation = 'fadeIn 0.5s';
          // make visa number required unless unknown is checked
          if (visaNumberInput && (!visaNumberUnknown || !visaNumberUnknown.checked)) {
            visaNumberInput.setAttribute('required', 'required');
          }
        } else {
          previousUSVisas.style.display = 'none';
          if (visaNumberInput) visaNumberInput.removeAttribute('required');
        }
      }
    });
  });

  // Visa number 'Do Not Know' checkbox logic
  if (visaNumberUnknown && visaNumberInput) {
    visaNumberUnknown.addEventListener('change', function () {
      if (this.checked) {
        visaNumberInput.removeAttribute('required');
        visaNumberInput.classList.remove('is-invalid');
        const err = document.getElementById('error-visaNumber');
        if (err) err.textContent = '';
      } else {
        // only require if previousUSVisas is visible
        const vis = previousUSVisas && window.getComputedStyle(previousUSVisas).display !== 'none';
        if (vis) visaNumberInput.setAttribute('required', 'required');
      }
    });
  }

  // Parent presence and status logic (show status select only when 'Yes' selected)
  const fatherRadios = document.querySelectorAll('input[name="Father_In_US"]');
  const fatherStatusGroup = document.getElementById('fatherStatusGroup');
  const fatherStatusSelect = document.getElementById('fatherStatus');

  function updateFatherStatusVisibility(value) {
    if (!fatherStatusGroup || !fatherStatusSelect) return;
    if (value === 'Yes') {
      fatherStatusGroup.style.display = 'block';
      fatherStatusGroup.style.animation = 'fadeIn 0.5s';
      fatherStatusGroup.setAttribute('aria-expanded', 'true');
      fatherStatusGroup.setAttribute('aria-hidden', 'false');
      fatherStatusSelect.setAttribute('required', 'required');
    } else {
      fatherStatusGroup.style.display = 'none';
      fatherStatusGroup.setAttribute('aria-expanded', 'false');
      fatherStatusGroup.setAttribute('aria-hidden', 'true');
      fatherStatusSelect.removeAttribute('required');
      fatherStatusSelect.classList.remove('is-invalid');
      const err = document.getElementById('error-fatherStatus');
      if (err) err.textContent = '';
    }
  }

  if (fatherRadios && fatherRadios.length) {
    fatherRadios.forEach((radio) => {
      radio.addEventListener('change', function () {
        updateFatherStatusVisibility(this.value);
      });
    });
    // initialize based on default checked value
    const checkedFather = document.querySelector('input[name="Father_In_US"]:checked');
    if (checkedFather) updateFatherStatusVisibility(checkedFather.value);
  }

  const motherRadios = document.querySelectorAll('input[name="Mother_In_US"]');
  const motherStatusGroup = document.getElementById('motherStatusGroup');
  const motherStatusSelect = document.getElementById('motherStatus');

  function updateMotherStatusVisibility(value) {
    if (!motherStatusGroup || !motherStatusSelect) return;
    if (value === 'Yes') {
      motherStatusGroup.style.display = 'block';
      motherStatusGroup.style.animation = 'fadeIn 0.5s';
      motherStatusGroup.setAttribute('aria-expanded', 'true');
      motherStatusGroup.setAttribute('aria-hidden', 'false');
      motherStatusSelect.setAttribute('required', 'required');
    } else {
      motherStatusGroup.style.display = 'none';
      motherStatusGroup.setAttribute('aria-expanded', 'false');
      motherStatusGroup.setAttribute('aria-hidden', 'true');
      motherStatusSelect.removeAttribute('required');
      motherStatusSelect.classList.remove('is-invalid');
      const err = document.getElementById('error-motherStatus');
      if (err) err.textContent = '';
    }
  }

  if (motherRadios && motherRadios.length) {
    motherRadios.forEach((radio) => {
      radio.addEventListener('change', function () {
        updateMotherStatusVisibility(this.value);
      });
    });
    // initialize based on default checked value
    const checkedMother = document.querySelector('input[name="Mother_In_US"]:checked');
    if (checkedMother) updateMotherStatusVisibility(checkedMother.value);
  }

  // 4b. Previous U.S. Visits (show when US_Visited = Yes)
  const visitedRadios = document.querySelectorAll('input[name="US_Visited"]');
  const previousUSVisits = document.getElementById('US_Visits_Container');
  const visitEntries = document.getElementById('visitEntries');
  const maxVisits = 5;
  // keep a hidden template clone for re-creating entries when all have been removed
  const initialVisitTemplate = visitEntries ? visitEntries.querySelector('.visit-entry') : null;
  const visitTemplateNode = initialVisitTemplate ? initialVisitTemplate.cloneNode(true) : null;

  // Ensure existing remove buttons are labeled with their index on initial load
  if (visitEntries) {
    visitEntries.querySelectorAll('.visit-entry').forEach((el, idx) => {
      const rem = el.querySelector('.remove-visit');
      if (rem) rem.setAttribute('aria-label', `Remove visit ${idx + 1}`);
    });
  }

  function setVisitRequired(index, required) {
    const year = document.getElementById(`USVisit_${index}_DateArrived_Year`);
    const day = document.getElementById(`USVisit_${index}_DateArrived_Day`);
    const month = document.getElementById(`USVisit_${index}_DateArrived_Month`);
    const length = document.getElementById(`USVisit_${index}_Length`);
    const unit = document.getElementById(`USVisit_${index}_Unit`);
    [year, day, month, length, unit].forEach((el) => {
      if (!el) return;
      if (required) el.setAttribute('required', 'required');
      else el.removeAttribute('required');
    });
  }

  if (!window.__ds160VisitedInit) {
    window.__ds160VisitedInit = true;

    visitedRadios.forEach((radio) => {
      radio.addEventListener('change', function () {
        if (previousUSVisits) {
          if (this.value === 'Yes') {
            previousUSVisits.style.display = 'block';
            previousUSVisits.style.animation = 'fadeIn 0.5s';
            // accessibility: mark expanded and visible
            previousUSVisits.setAttribute('aria-expanded', 'true');
            previousUSVisits.setAttribute('aria-hidden', 'false');
            // require fields for all currently visible entries
            const currentCount = visitEntries
              ? visitEntries.querySelectorAll('.visit-entry').length
              : 0;
            for (let i = 1; i <= currentCount; i++) setVisitRequired(i, true);
          } else {
            previousUSVisits.style.display = 'none';
            // accessibility: mark collapsed/hidden
            previousUSVisits.setAttribute('aria-expanded', 'false');
            previousUSVisits.setAttribute('aria-hidden', 'true');
            // remove required attributes from all entries
            for (let i = 1; i <= maxVisits; i++) setVisitRequired(i, false);
          }
        }
      });
    });

    // Add / Remove visit entries (delegated)
    const clickDelegateRoot = previousUSVisits || visitEntries;
    if (clickDelegateRoot) {
      clickDelegateRoot.addEventListener('click', function (e) {
        const addBtn = e.target.closest && e.target.closest('.add-visit');
        const remBtn = e.target.closest && e.target.closest('.remove-visit');

        if (addBtn && clickDelegateRoot.contains(addBtn)) {
          e.preventDefault();
          const current = visitEntries.querySelectorAll('.visit-entry').length;
          console.info('add-click: current entries =', current);
          if (current >= maxVisits) {
            return;
          }
          // use an existing entry as template, or fall back to the stored template node
          const template = visitEntries.querySelector('.visit-entry') || visitTemplateNode;
          if (!template) return;
          const clone = template.cloneNode(true);
          const newIndex = current + 1;
          clone.setAttribute('data-index', String(newIndex));

          // Update ids, names and label 'for' inside cloned node (handle any existing index)
          clone.querySelectorAll('[id]').forEach((el) => {
            el.id = el.id
              .replace(/(?:US)?Visit_\d+_/g, `USVisit_${newIndex}_`)
              .replace(/(?:US)?Visit_\d+$/g, `USVisit_${newIndex}`);
            if (el.name)
              el.name = el.name
                .replace(/(?:US)?Visit_\d+_/g, `USVisit_${newIndex}_`)
                .replace(/(?:US)?Visit_\d+$/g, `USVisit_${newIndex}`);
            if (el.tagName === 'INPUT') el.value = '';
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
          });
          clone.querySelectorAll('label').forEach((lbl) => {
            if (lbl.htmlFor)
              lbl.htmlFor = lbl.htmlFor
                .replace(/(?:US)?Visit_\d+_/g, `USVisit_${newIndex}_`)
                .replace(/(?:US)?Visit_\d+$/g, `USVisit_${newIndex}`);
            // if labels themselves have an id (group label), it will be updated in the id loop above
          });

          // Update aria-describedby references inside cloned node (so they point to updated label ids)
          clone.querySelectorAll('[aria-describedby]').forEach((el) => {
            const v = el.getAttribute('aria-describedby');
            if (!v) return;
            el.setAttribute(
              'aria-describedby',
              v
                .replace(/(?:US)?Visit_\d+_/g, `USVisit_${newIndex}_`)
                .replace(/(?:US)?Visit_\d+$/g, `USVisit_${newIndex}`)
            );
          });

          // ensure required attributes for new entry when visible
          const shouldRequire = window.getComputedStyle(previousUSVisits).display !== 'none';
          // set required attributes directly on clone so they exist once appended
          clone.querySelectorAll('input, select').forEach((el) => {
            if (shouldRequire) el.setAttribute('required', 'required');
            else el.removeAttribute('required');
          });

          // ensure cloned remove button is accessible and labeled for screen readers
          clone.querySelectorAll('.remove-visit').forEach((btn) => {
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('aria-label', `Remove visit ${newIndex}`);
          });

          visitEntries.appendChild(clone);
          // also ensure required flags via DOM lookup for consistency
          setVisitRequired(newIndex, shouldRequire);
          updateAddControls();
        }

        if (remBtn && visitEntries.contains(remBtn)) {
          e.preventDefault();
          const entry = remBtn.closest('.visit-entry');
          if (!entry) return;
          const entries = visitEntries.querySelectorAll('.visit-entry');
          if (entries.length === 1) {
            // remove the only entry entirely from DOM
            entry.remove();
            // clear any required attributes for safety
            for (let i = 1; i <= maxVisits; i++) setVisitRequired(i, false);
            updateAddControls();

            // If there are now zero entries and the user still has US_Visited=Yes, toggle to No
            const remaining = visitEntries.querySelectorAll('.visit-entry').length;
            if (remaining === 0) {
              const yesRadio = document.querySelector('input[name="US_Visited"][value="Yes"]');
              const noRadio = document.querySelector('input[name="US_Visited"][value="No"]');
              if (yesRadio && yesRadio.checked && noRadio) {
                // programmatically switch to 'No' to reuse existing hide/cleanup logic
                noRadio.checked = true;
                noRadio.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          } else {
            entry.remove();
            // renumber remaining entries to keep indexes contiguous
            const remaining = visitEntries.querySelectorAll('.visit-entry');
            remaining.forEach((el, idx) => {
              const newIdx = idx + 1;
              el.setAttribute('data-index', String(newIdx));
              el.querySelectorAll('[id]').forEach((node) => {
                if (node.id)
                  node.id = node.id
                    .replace(/(?:US)?Visit_\d+_/g, `USVisit_${newIdx}_`)
                    .replace(/(?:US)?Visit_\d+$/g, `USVisit_${newIdx}`);
                if (node.name)
                  node.name = node.name
                    .replace(/(?:US)?Visit_\d+_/g, `USVisit_${newIdx}_`)
                    .replace(/(?:US)?Visit_\d+$/g, `USVisit_${newIdx}`);
              });

              // update remove button aria-labels for accessibility and keyboard users
              const rem = el.querySelector('.remove-visit');
              if (rem) rem.setAttribute('aria-label', `Remove visit ${newIdx}`);
            });
            updateAddControls();
          }
        }
      });
      // initialize add controls visibility
      updateAddControls();
    }
  }

  // show/hide add controls when at max
  function updateAddControls() {
    const visitEntries = document.getElementById('visitEntries');
    const entries = visitEntries ? visitEntries.querySelectorAll('.visit-entry').length : 0;
    // Select all buttons with the class 'add-visit'
    const addButtons = document.querySelectorAll('.add-visit');

    addButtons.forEach((btn) => {
      // Ensure controls are accessible
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Add visit');

      if (entries >= 5) {
        // Ensure this is 5
        btn.style.setProperty('display', 'none', 'important');
      } else {
        btn.style.display = 'inline-block';
      }
    });
    console.log(`Visits check: ${entries} of 5 entries present.`);
  }

  // ---------- Immediate Relatives in US (repeatable entries up to 10) ----------
  const relativesRadios = document.querySelectorAll('input[name="US_ImmediateRelatives"]');
  const relativesContainer = document.getElementById('US_Relatives_Container');
  const relativeEntries = document.getElementById('relativeEntries');
  const maxRelatives = 10;
  const initialRelativeTemplate = relativeEntries
    ? relativeEntries.querySelector('.relative-entry')
    : null;
  const relativeTemplateNode = initialRelativeTemplate
    ? initialRelativeTemplate.cloneNode(true)
    : null;

  // Ensure existing remove buttons are labeled for accessibility on initial load
  if (relativeEntries) {
    relativeEntries.querySelectorAll('.relative-entry').forEach((el, idx) => {
      const rem = el.querySelector('.remove-relative');
      if (rem) rem.setAttribute('aria-label', `Remove relative ${idx + 1}`);
    });
  }

  function setRelativeRequired(index, required) {
    const surnames = document.getElementById(`Relative_${index}_Surnames`);
    const given = document.getElementById(`Relative_${index}_GivenNames`);
    const rel = document.getElementById(`Relative_${index}_Relationship`);
    const stat = document.getElementById(`Relative_${index}_Status`);
    [surnames, given, rel, stat].forEach((el) => {
      if (!el) return;
      if (required) el.setAttribute('required', 'required');
      else el.removeAttribute('required');
    });
  }

  if (relativesRadios && relativesRadios.length) {
    if (!window.__ds160RelativesInit) {
      window.__ds160RelativesInit = true;

      relativesRadios.forEach((radio) => {
        radio.addEventListener('change', function () {
          if (!relativesContainer) return;
          if (this.value === 'Yes') {
            relativesContainer.style.display = 'block';
            relativesContainer.style.animation = 'fadeIn 0.5s';
            relativesContainer.setAttribute('aria-expanded', 'true');
            relativesContainer.setAttribute('aria-hidden', 'false');
            const currentCount = relativeEntries
              ? relativeEntries.querySelectorAll('.relative-entry').length
              : 0;
            for (let i = 1; i <= currentCount; i++) setRelativeRequired(i, true);
          } else {
            relativesContainer.style.display = 'none';
            relativesContainer.setAttribute('aria-expanded', 'false');
            relativesContainer.setAttribute('aria-hidden', 'true');
            for (let i = 1; i <= maxRelatives; i++) setRelativeRequired(i, false);
          }
        });
      });

      const clickDelegateRoot = relativesContainer || relativeEntries;
      if (clickDelegateRoot) {
        clickDelegateRoot.addEventListener('click', function (e) {
          const addBtn = e.target.closest && e.target.closest('.add-relative');
          const remBtn = e.target.closest && e.target.closest('.remove-relative');

          if (addBtn && clickDelegateRoot.contains(addBtn)) {
            e.preventDefault();
            const current = relativeEntries.querySelectorAll('.relative-entry').length;
            if (current >= maxRelatives) return;
            const template =
              relativeEntries.querySelector('.relative-entry') || relativeTemplateNode;
            if (!template) return;
            const clone = template.cloneNode(true);
            const newIndex = current + 1;
            clone.setAttribute('data-index', String(newIndex));

            // Update ids, names and labels inside cloned node
            clone.querySelectorAll('[id]').forEach((el) => {
              el.id = el.id
                .replace(/Relative_\d+_/g, `Relative_${newIndex}_`)
                .replace(/Relative_\d+$/g, `Relative_${newIndex}`);
              if (el.name)
                el.name = el.name
                  .replace(/Relative_\d+_/g, `Relative_${newIndex}_`)
                  .replace(/Relative_\d+$/g, `Relative_${newIndex}`);
              if (el.tagName === 'INPUT') el.value = '';
              if (el.tagName === 'SELECT') el.selectedIndex = 0;
            });
            clone.querySelectorAll('label').forEach((lbl) => {
              if (lbl.htmlFor)
                lbl.htmlFor = lbl.htmlFor
                  .replace(/Relative_\d+_/g, `Relative_${newIndex}_`)
                  .replace(/Relative_\d+$/g, `Relative_${newIndex}`);
            });

            clone.querySelectorAll('[aria-describedby]').forEach((el) => {
              const v = el.getAttribute('aria-describedby');
              if (!v) return;
              el.setAttribute(
                'aria-describedby',
                v
                  .replace(/Relative_\d+_/g, `Relative_${newIndex}_`)
                  .replace(/Relative_\d+$/g, `Relative_${newIndex}`)
              );
            });

            const shouldRequire = window.getComputedStyle(relativesContainer).display !== 'none';
            clone.querySelectorAll('input, select').forEach((el) => {
              if (shouldRequire) el.setAttribute('required', 'required');
              else el.removeAttribute('required');
            });

            clone.querySelectorAll('.remove-relative').forEach((btn) => {
              btn.setAttribute('role', 'button');
              btn.setAttribute('tabindex', '0');
              btn.setAttribute('aria-label', `Remove relative ${newIndex}`);
            });

            relativeEntries.appendChild(clone);
            setRelativeRequired(newIndex, shouldRequire);
            updateRelativeAddControls();
          }

          if (remBtn && relativeEntries.contains(remBtn)) {
            e.preventDefault();
            const entry = remBtn.closest('.relative-entry');
            if (!entry) return;
            const entries = relativeEntries.querySelectorAll('.relative-entry');
            if (entries.length === 1) {
              entry.remove();
              for (let i = 1; i <= maxRelatives; i++) setRelativeRequired(i, false);
              updateRelativeAddControls();
              const yesRadio = document.querySelector(
                'input[name="US_ImmediateRelatives"][value="Yes"]'
              );
              const noRadio = document.querySelector(
                'input[name="US_ImmediateRelatives"][value="No"]'
              );
              if (yesRadio && yesRadio.checked && noRadio) {
                noRadio.checked = true;
                noRadio.dispatchEvent(new Event('change', { bubbles: true }));
              }
            } else {
              entry.remove();
              const remaining = relativeEntries.querySelectorAll('.relative-entry');
              remaining.forEach((el, idx) => {
                const newIdx = idx + 1;
                el.setAttribute('data-index', String(newIdx));
                el.querySelectorAll('[id]').forEach((node) => {
                  if (node.id)
                    node.id = node.id
                      .replace(/Relative_\d+_/g, `Relative_${newIdx}_`)
                      .replace(/Relative_\d+$/g, `Relative_${newIdx}`);
                  if (node.name)
                    node.name = node.name
                      .replace(/Relative_\d+_/g, `Relative_${newIdx}_`)
                      .replace(/Relative_\d+$/g, `Relative_${newIdx}`);
                });
                const rem = el.querySelector('.remove-relative');
                if (rem) rem.setAttribute('aria-label', `Remove relative ${newIdx}`);
              });
              updateRelativeAddControls();
            }
          }
        });

        updateRelativeAddControls();
      }
    }
  }

  function updateRelativeAddControls() {
    const entries = relativeEntries
      ? relativeEntries.querySelectorAll('.relative-entry').length
      : 0;
    const addButtons = document.querySelectorAll('.add-relative');
    addButtons.forEach((btn) => {
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Add relative');
      if (entries >= maxRelatives) {
        btn.style.setProperty('display', 'none', 'important');
      } else {
        btn.style.display = 'inline-block';
      }
    });
  }

  // Control visibility for education add buttons
  function updateEducationAddControls() {
    const entries = educationEntries ? educationEntries.querySelectorAll('.edu-entry').length : 0;
    const addButtons = document.querySelectorAll('.add-education');
    addButtons.forEach((btn) => {
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Add institution');
      if (entries >= maxEducation) {
        btn.style.setProperty('display', 'none', 'important');
      } else {
        btn.style.display = 'inline-block';
      }
    });
  }

  // Section 12: Education History repeatable entries (up to 5)
  const educationRadios = document.querySelectorAll('input[name="HasOtherEducation"]');
  const educationContainer = document.getElementById('Education_Container');
  const educationEntries = document.getElementById('educationEntries');
  const maxEducation = 5;

  function setEducationRequired(index, required) {
    const inst = document.getElementById(`Education_${index}_InstitutionName`);
    const qual = document.getElementById(`Education_${index}_QualificationName`);
    [inst, qual].forEach((el) => {
      if (!el) return;
      if (required) el.setAttribute('required', 'required');
      else el.removeAttribute('required');
    });
  }

  if (educationRadios && educationRadios.length) {
    if (!window.__ds160EducationInit) {
      window.__ds160EducationInit = true;

      educationRadios.forEach((radio) => {
        radio.addEventListener('change', function () {
          if (!educationContainer) return;
          if (this.value === 'Yes') {
            educationContainer.style.display = 'block';
            educationContainer.style.animation = 'fadeIn 0.5s';
            educationContainer.setAttribute('aria-expanded', 'true');
            educationContainer.setAttribute('aria-hidden', 'false');
            const currentCount = educationEntries
              ? educationEntries.querySelectorAll('.edu-entry').length
              : 0;
            for (let i = 1; i <= currentCount; i++) setEducationRequired(i, true);
          } else {
            educationContainer.style.display = 'none';
            educationContainer.setAttribute('aria-expanded', 'false');
            educationContainer.setAttribute('aria-hidden', 'true');
            for (let i = 1; i <= maxEducation; i++) setEducationRequired(i, false);
          }
        });
      });

      const eduDelegateRoot = educationContainer || educationEntries;
      if (eduDelegateRoot) {
        eduDelegateRoot.addEventListener('click', function (e) {
          const addBtn = e.target.closest && e.target.closest('.add-education');
          const remBtn = e.target.closest && e.target.closest('.remove-education');

          if (addBtn && eduDelegateRoot.contains(addBtn)) {
            e.preventDefault();
            const current = educationEntries.querySelectorAll('.edu-entry').length;
            if (current >= maxEducation) return;
            const template = educationEntries.querySelector('.edu-entry');
            if (!template) return;
            const clone = template.cloneNode(true);
            const newIndex = current + 1;
            clone.setAttribute('data-index', String(newIndex));

            clone.querySelectorAll('[id]').forEach((el) => {
              el.id = el.id.replace(/Education_\d+_/g, `Education_${newIndex}_`);
              if (el.name) el.name = el.name.replace(/Education_\d+_/g, `Education_${newIndex}_`);
              if (el.tagName === 'INPUT') el.value = '';
              if (el.tagName === 'SELECT') el.selectedIndex = 0;
            });
            clone.querySelectorAll('label').forEach((lbl) => {
              if (lbl.htmlFor)
                lbl.htmlFor = lbl.htmlFor.replace(/Education_\d+_/g, `Education_${newIndex}_`);
            });

            const shouldRequire = window.getComputedStyle(educationContainer).display !== 'none';
            clone.querySelectorAll('input, select').forEach((el) => {
              if (shouldRequire) el.setAttribute('required', 'required');
              else el.removeAttribute('required');
            });

            // make remove controls accessible and labeled
            clone.querySelectorAll('.remove-education').forEach((btn) => {
              btn.setAttribute('role', 'button');
              btn.setAttribute('tabindex', '0');
              btn.setAttribute('aria-label', `Remove institution ${newIndex}`);
            });

            educationEntries.appendChild(clone);
            setEducationRequired(newIndex, shouldRequire);
            updateEducationAddControls();
          }

          if (remBtn && educationEntries.contains(remBtn)) {
            e.preventDefault();
            const entry = remBtn.closest('.edu-entry');
            if (!entry) return;
            const entries = educationEntries.querySelectorAll('.edu-entry');
            if (entries.length === 1) {
              entry.remove();
              for (let i = 1; i <= maxEducation; i++) setEducationRequired(i, false);
              const remaining = educationEntries.querySelectorAll('.edu-entry').length;
              if (remaining === 0) {
                const yesRadio = document.querySelector(
                  'input[name="HasOtherEducation"][value="Yes"]'
                );
                const noRadio = document.querySelector(
                  'input[name="HasOtherEducation"][value="No"]'
                );
                if (yesRadio && yesRadio.checked && noRadio) {
                  noRadio.checked = true;
                  noRadio.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            } else {
              entry.remove();
              // renumber remaining entries
              const remaining = educationEntries.querySelectorAll('.edu-entry');
              remaining.forEach((el, idx) => {
                const newIdx = idx + 1;
                el.setAttribute('data-index', String(newIdx));
                el.querySelectorAll('[id]').forEach((node) => {
                  if (node.id) node.id = node.id.replace(/Education_\d+_/g, `Education_${newIdx}_`);
                  if (node.name)
                    node.name = node.name.replace(/Education_\d+_/g, `Education_${newIdx}_`);
                });
                const rem = el.querySelector('.remove-education');
                if (rem) rem.setAttribute('aria-label', `Remove institution ${newIdx}`);
              });
              updateEducationAddControls();
            }
          }
        });
      }
      updateEducationAddControls();
    }
  }

  // 4. Other Nationality Logic (new)
  const otherNatRadios = document.querySelectorAll('input[name="HasOtherNationality"]');
  const otherNationalityFields = document.getElementById('otherNationalityFields');
  const otherPassRadios = document.querySelectorAll('input[name="Other_Nationality_Passport"]');
  const otherPassportField = document.getElementById('otherPassportField');

  otherNatRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (otherNationalityFields) {
        if (this.value === 'Yes') {
          otherNationalityFields.style.display = 'block';
          otherNationalityFields.style.animation = 'fadeIn 0.5s';
        } else {
          otherNationalityFields.style.display = 'none';
          if (otherPassportField) otherPassportField.style.display = 'none';
        }
      }
    });
  });

  otherPassRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (otherPassportField) {
        if (this.value === 'Yes') {
          otherPassportField.style.display = 'block';
          otherPassportField.style.animation = 'fadeIn 0.5s';
        } else {
          otherPassportField.style.display = 'none';
        }
      }
    });
  });

  // 6. Lost/ Stolen Passport Logic
  const lostPassportRadios = document.querySelectorAll('input[name="LostPassport"]');
  const lostPassportFields = document.getElementById('lostPassportFields');
  const lostPassportNumber = document.getElementById('lostPassportNumber');
  const lostPassportDoNotKnow = document.getElementById('lostPassportDoNotKnow');
  const lostPassportCountry = document.getElementById('lostPassportCountry');

  // Populate the lost passport country select from the main nationality list
  const _mainNationalitySelect = document.getElementById('nationality');
  if (lostPassportCountry && _mainNationalitySelect) {
    lostPassportCountry.innerHTML = _mainNationalitySelect.innerHTML;
  }

  function setLostPassportRequired(is_required) {
    if (!lostPassportFields) return;
    const controls = lostPassportFields.querySelectorAll('input, select, textarea');
    controls.forEach((c) => {
      if (is_required) {
        c.setAttribute('required', '');
      } else {
        c.removeAttribute('required');
      }
    });
  }

  lostPassportRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (!lostPassportFields) return;
      if (this.value === 'Yes') {
        lostPassportFields.style.display = 'block';
        lostPassportFields.style.animation = 'fadeIn 0.5s';
        lostPassportFields.setAttribute('aria-expanded', 'true');
        lostPassportFields.setAttribute('aria-hidden', 'false');
        setLostPassportRequired(true);
        // If user already checked Do Not Know, make sure number is not required
        if (lostPassportDoNotKnow && lostPassportDoNotKnow.checked) {
          lostPassportNumber && lostPassportNumber.removeAttribute('required');
        }
      } else {
        lostPassportFields.style.display = 'none';
        lostPassportFields.setAttribute('aria-expanded', 'false');
        lostPassportFields.setAttribute('aria-hidden', 'true');
        setLostPassportRequired(false);
        if (lostPassportDoNotKnow) lostPassportDoNotKnow.checked = false;
      }
    });
  });

  if (lostPassportDoNotKnow) {
    lostPassportDoNotKnow.addEventListener('change', function () {
      if (!lostPassportNumber) return;
      if (this.checked) {
        lostPassportNumber.removeAttribute('required');
      } else if (lostPassportFields && lostPassportFields.style.display !== 'none') {
        lostPassportNumber.setAttribute('required', '');
      }
    });
  }

  // 7. Military Service Logic
  const militaryRadios = document.querySelectorAll('input[name="Military_Served"]');
  const militaryFields = document.getElementById('militaryFields');

  function setMilitaryRequired(is_required) {
    if (!militaryFields) return;
    const controls = militaryFields.querySelectorAll('input, select, textarea');
    controls.forEach((c) => {
      if (is_required) {
        c.setAttribute('required', '');
      } else {
        c.removeAttribute('required');
      }
    });
  }

  militaryRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (!militaryFields) return;
      if (this.value === 'Yes') {
        militaryFields.style.display = 'block';
        militaryFields.style.animation = 'fadeIn 0.5s';
        militaryFields.setAttribute('aria-expanded', 'true');
        militaryFields.setAttribute('aria-hidden', 'false');
        setMilitaryRequired(true);
      } else {
        militaryFields.style.display = 'none';
        militaryFields.setAttribute('aria-expanded', 'false');
        militaryFields.setAttribute('aria-hidden', 'true');
        setMilitaryRequired(false);
      }
    });
  });

  // 5. Other Permanent Resident Logic (Arabic question)
  const permResRadios = document.querySelectorAll('input[name="HasOtherPermanentResident"]');
  const otherPermanentResidentFields = document.getElementById('otherPermanentResidentFields');
  const otherPermanentResidentSelect = document.getElementById('otherPermanentResidentSelect');

  // Populate the permanent resident select from the main nationality list to avoid duplication
  const nationalitySelect = document.getElementById('nationality');

  // --- Arabic country names mapping ---
  const countryNamesArabic = {
    Afghanistan: 'أفغانستان',
    Albania: 'ألبانيا',
    Algeria: 'الجزائر',
    Andorra: 'أندورا',
    Angola: 'أنغولا',
    'Antigua and Barbuda': 'أنتيغوا وباربودا',
    Argentina: 'الأرجنتين',
    Armenia: 'أرمينيا',
    Australia: 'أستراليا',
    Austria: 'النمسا',
    Azerbaijan: 'أذربيجان',
    Bahamas: 'الباهاما',
    Bahrain: 'البحرين',
    Bangladesh: 'بنغلاديش',
    Barbados: 'بربادوس',
    Belarus: 'بيلاروسيا',
    Belgium: 'بلجيكا',
    Belize: 'بليز',
    Benin: 'بنين',
    Bhutan: 'بوتان',
    Bolivia: 'بوليفيا',
    'Bosnia and Herzegovina': 'البوسنة والهرسك',
    Botswana: 'بتسوانا',
    Brazil: 'البرازيل',
    Brunei: 'بروناي',
    Bulgaria: 'بلغاريا',
    'Burkina Faso': 'بوركينا فاسو',
    Burundi: 'بوروندي',
    'Cabo Verde': 'الرأس الأخضر',
    Cambodia: 'كمبوديا',
    Cameroon: 'الكاميرون',
    Canada: 'كندا',
    'Central African Republic': 'جمهورية أفريقيا الوسطى',
    Chad: 'تشاد',
    Chile: 'تشيلي',
    China: 'الصين',
    Colombia: 'كولومبيا',
    Comoros: 'جزر القمر',
    'Costa Rica': 'كوستاريكا',
    "Côte d'Ivoire": 'ساحل العاج',
    Croatia: 'كرواتيا',
    Cuba: 'كوبا',
    Cyprus: 'قبرص',
    Czechia: 'التشيك',
    'Democratic Republic of the Congo': 'جمهورية الكونغو الديمقراطية',
    Denmark: 'الدنمارك',
    Djibouti: 'جيبوتي',
    Dominica: 'دومينيكا',
    'Dominican Republic': 'الجمهورية الدومينيكية',
    Ecuador: 'الإكوادور',
    Egypt: 'مصر',
    'El Salvador': 'السلفادور',
    'Equatorial Guinea': 'غينيا الاستوائية',
    Eritrea: 'إريتريا',
    Estonia: 'إستونيا',
    Eswatini: 'إسواتيني',
    Ethiopia: 'إثيوبيا',
    'Federated States of Micronesia': 'ولايات ميكرونيزيا الفيدرالية',
    Fiji: 'فيجي',
    Finland: 'فنلندا',
    France: 'فرنسا',
    Gabon: 'الغابون',
    Gambia: 'غامبيا',
    Georgia: 'جورجيا',
    Germany: 'ألمانيا',
    Ghana: 'غانا',
    Greece: 'اليونان',
    Grenada: 'غرينادا',
    Guatemala: 'غواتيمالا',
    Guinea: 'غينيا',
    'Guinea-Bissau': 'غينيا بيساو',
    Guyana: 'غيانا',
    Haiti: 'هايتي',
    Honduras: 'هندوراس',
    Hungary: 'المجر',
    Iceland: 'آيسلندا',
    India: 'الهند',
    Indonesia: 'إندونيسيا',
    Iran: 'إيران',
    Iraq: 'العراق',
    Ireland: 'إيرلندا',
    Israel: 'إسرائيل',
    Italy: 'إيطاليا',
    Jamaica: 'جامايكا',
    Japan: 'اليابان',
    Jordan: 'الأردن',
    Kazakhstan: 'كازاخستان',
    Kenya: 'كينيا',
    Kiribati: 'كيريباتي',
    Kosovo: 'كوسوفو',
    Kuwait: 'الكويت',
    Kyrgyzstan: 'قيرغيزستان',
    Laos: 'لاوس',
    Latvia: 'لاتفيا',
    Lebanon: 'لبنان',
    Lesotho: 'ليسوتو',
    Liberia: 'ليبيريا',
    Libya: 'ليبيا',
    Liechtenstein: 'ليختنشتاين',
    Lithuania: 'ليتوانيا',
    Luxembourg: 'لوكسمبورغ',
    Madagascar: 'مدغشقر',
    Malawi: 'مالاوي',
    Malaysia: 'ماليزيا',
    Maldives: 'المالديف',
    Mali: 'مالي',
    Malta: 'مالطا',
    'Marshall Islands': 'جزر مارشال',
    Mauritania: 'موريتانيا',
    Mauritius: 'موريشيوس',
    Mexico: 'المكسيك',
    Moldova: 'مولدوفا',
    Monaco: 'موناكو',
    Mongolia: 'منغوليا',
    Montenegro: 'الجبل الأسود',
    Morocco: 'المغرب',
    Mozambique: 'موزمبيق',
    Myanmar: 'ميانمار',
    Namibia: 'ناميبيا',
    Nauru: 'ناورو',
    Nepal: 'نيبال',
    Netherlands: 'هولندا',
    'New Zealand': 'نيوزيلندا',
    Nicaragua: 'نيكاراغوا',
    Niger: 'النيجر',
    Nigeria: 'نيجيريا',
    'North Korea': 'كوريا الشمالية',
    'North Macedonia': 'مقدونيا الشمالية',
    Norway: 'النرويج',
    Oman: 'عمان',
    Pakistan: 'باكستان',
    Palau: 'بالاو',
    Panama: 'بنما',
    'Papua New Guinea': 'بابوا غينيا الجديدة',
    Paraguay: 'باراجواي',
    Peru: 'بيرو',
    Philippines: 'الفلبين',
    Poland: 'بولندا',
    Portugal: 'البرتغال',
    Qatar: 'قطر',
    'Republic of the Congo': 'جمهورية الكونغو',
    Romania: 'رومانيا',
    Russia: 'روسيا',
    Rwanda: 'رواندا',
    'Saint Kitts and Nevis': 'سانت كيتس ونيفيس',
    'Saint Lucia': 'سانت لوسيا',
    'Saint Vincent and the Grenadines': 'سانت فنسنت والغرينادين',
    Samoa: 'ساموا',
    'San Marino': 'سان مارينو',
    'Sao Tome and Principe': 'ساو تومي وبرينسيب',
    'Saudi Arabia': 'المملكة العربية السعودية',
    Senegal: 'السنغال',
    Serbia: 'صربيا',
    Seychelles: 'سيشيل',
    'Sierra Leone': 'سيراليون',
    Singapore: 'سنغافورة',
    Slovakia: 'سلوفاكيا',
    Slovenia: 'سلوفينيا',
    'Solomon Islands': 'جزر سولومون',
    Somalia: 'الصومال',
    'South Africa': 'جنوب أفريقيا',
    'South Korea': 'كوريا الجنوبية',
    'South Sudan': 'جنوب السودان',
    Spain: 'إسبانيا',
    'Sri Lanka': 'سريلانكا',
    Sudan: 'السودان',
    Suriname: 'سورينام',
    Sweden: 'السويد',
    Switzerland: 'سويسرا',
    Syria: 'سوريا',
    Taiwan: 'تايوان',
    Tajikistan: 'طاجيكستان',
    Tanzania: 'تنزانيا',
    Thailand: 'تايلاند',
    'Timor-Leste': 'تيمور الشرقية',
    Togo: 'توغو',
    Tonga: 'تونغا',
    'Trinidad and Tobago': 'ترينيداد وتوباغو',
    Tunisia: 'تونس',
    Turkey: 'تركيا',
    Turkmenistan: 'تركمانستان',
    Tuvalu: 'توفالو',
    Uganda: 'أوغندا',
    Ukraine: 'أوكرانيا',
    'United Arab Emirates': 'الإمارات العربية المتحدة',
    'United Kingdom': 'المملكة المتحدة',
    'United States of America': 'الولايات المتحدة الأمريكية',
    Uruguay: 'أوروغواي',
    Uzbekistan: 'أوزبكستان',
    Vanuatu: 'فانواتو',
    'Vatican City': 'دولة الفاتيكان',
    Venezuela: 'فنزويلا',
    Vietnam: 'فيتنام',
    Yemen: 'اليمن',
    Zambia: 'زامبيا',
    Zimbabwe: 'زيمبابوي',
  };

  // Utility: Replace option text with Arabic labels when mapping exists
  function localizeSelectOptions(selectEl) {
    if (!selectEl || !selectEl.options) return;
    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      if (!opt.value) continue;
      if (Object.prototype.hasOwnProperty.call(countryNamesArabic, opt.value)) {
        opt.textContent = countryNamesArabic[opt.value];
      }
    }
  }

  // Update the existing selects before copying into otherPermanentResidentSelect
  if (nationalitySelect) localizeSelectOptions(nationalitySelect);
  const otherNationalitySelect = document.getElementById('otherNationalitySelect');
  if (otherNationalitySelect) localizeSelectOptions(otherNationalitySelect);

  if (otherPermanentResidentSelect && nationalitySelect) {
    otherPermanentResidentSelect.innerHTML = nationalitySelect.innerHTML.replace(
      '-- اختر / Select --',
      '- اختر -'
    );
  }

  permResRadios.forEach((radio) => {
    radio.addEventListener('change', function () {
      if (otherPermanentResidentFields) {
        if (this.value === 'Yes') {
          otherPermanentResidentFields.style.display = 'block';
          otherPermanentResidentFields.style.animation = 'fadeIn 0.5s';
        } else {
          otherPermanentResidentFields.style.display = 'none';
        }
      }
    });
  });

  // Ensure initial state is correct (e.g., if fields were pre-filled)
  hideAllMaritalFields();
  if (companionFields) companionFields.style.display = 'none';
  if (denialTimeField) denialTimeField.style.display = 'none';
  if (otherNationalityFields) otherNationalityFields.style.display = 'none';
  if (otherPassportField) otherPassportField.style.display = 'none';
  if (otherPermanentResidentFields) otherPermanentResidentFields.style.display = 'none';
});
