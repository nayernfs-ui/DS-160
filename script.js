document.addEventListener('DOMContentLoaded', (event) => {
    // 1. Marital Status Logic
    const maritalStatusSelect = document.getElementById('maritalStatus');
    const marriedFields = document.getElementById('marriedFields');
    const widowedFields = document.getElementById('widowedFields');
    const divorcedFields = document.getElementById('divorcedFields');

    // --- NEW / MODIFIED SUBMISSION LOGIC WITH INLINE ERRORS ---
    const form = document.getElementById('ds160Form');
    const confirmationMessage = document.getElementById('confirmationMessage');

    if (form) {
        form.addEventListener('submit', function(event) {
            let isValid = true;
            const allFields = form.querySelectorAll('input[required], textarea[required], select[required]');

            // 1. Reset all errors
            form.querySelectorAll('.error-message').forEach(span => span.textContent = '');
            form.querySelectorAll('.is-invalid').forEach(field => field.classList.remove('is-invalid'));

            // 2. Validation Check
            allFields.forEach(field => {
                const closestFieldset = field.closest('fieldset');
                const isVisible = closestFieldset ? window.getComputedStyle(closestFieldset).display !== 'none' : true;

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
                        field.classList.remove('is-invalid');
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

                event.preventDefault();
                fetch(form.action, {
                    method: 'POST',
                    body: JSON.stringify(jsonObj),
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                })
                .then(response => {
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
                        alert("عفواً، حدث خطأ أثناء إرسال البيانات. الرجاء المحاولة مرة أخرى.");
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    alert("حدث خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.");
                });
            } catch (e) {
                // If URL parsing fails for any reason, default to normal submit to avoid blocking the user.
                return;
            }
        });
    }

    function hideAllMaritalFields() {
        if (marriedFields) marriedFields.style.display = 'none';
        if (widowedFields) widowedFields.style.display = 'none';
        if (divorcedFields) divorcedFields.style.display = 'none';
    }

    if (maritalStatusSelect) {
        maritalStatusSelect.addEventListener('change', function() {
            hideAllMaritalFields();
            const status = this.value;

            if (status === 'Married') {
                marriedFields.style.display = 'block';
                marriedFields.style.animation = 'fadeIn 0.5s';
            } else if (status === 'Widowed') {
                widowedFields.style.display = 'block';
                widowedFields.style.animation = 'fadeIn 0.5s';
            } else if (status === 'Divorced') {
                divorcedFields.style.display = 'block';
                divorcedFields.style.animation = 'fadeIn 0.5s';
            }
        });
    }

    // 2. Travel Companion Logic
    const travelRadios = document.querySelectorAll('input[name="TravellingWithOthers"]');
    const companionFields = document.getElementById('travelCompanionFields');

    travelRadios.forEach(radio => {
        radio.addEventListener('change', function() {
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

    denialRadios.forEach(radio => {
        radio.addEventListener('change', function() {
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

    hadVisaRadios.forEach(radio => {
        radio.addEventListener('change', function() {
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
        visaNumberUnknown.addEventListener('change', function() {
            if (this.checked) {
                visaNumberInput.removeAttribute('required');
                visaNumberInput.classList.remove('is-invalid');
                const err = document.getElementById('error-visaNumber'); if (err) err.textContent = '';
            } else {
                // only require if previousUSVisas is visible
                const vis = previousUSVisas && window.getComputedStyle(previousUSVisas).display !== 'none';
                if (vis) visaNumberInput.setAttribute('required', 'required');
            }
        });
    }

    // 4. Other Nationality Logic (new)
    const otherNatRadios = document.querySelectorAll('input[name="HasOtherNationality"]');
    const otherNationalityFields = document.getElementById('otherNationalityFields');
    const otherPassRadios = document.querySelectorAll('input[name="Other_Nationality_Passport"]');
    const otherPassportField = document.getElementById('otherPassportField');

    otherNatRadios.forEach(radio => {
        radio.addEventListener('change', function() {
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

    otherPassRadios.forEach(radio => {
        radio.addEventListener('change', function() {
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

    // 5. Other Permanent Resident Logic (Arabic question)
    const permResRadios = document.querySelectorAll('input[name="HasOtherPermanentResident"]');
    const otherPermanentResidentFields = document.getElementById('otherPermanentResidentFields');
    const otherPermanentResidentSelect = document.getElementById('otherPermanentResidentSelect');

    // Populate the permanent resident select from the main nationality list to avoid duplication
    const nationalitySelect = document.getElementById('nationality');
    if (otherPermanentResidentSelect && nationalitySelect) {
        otherPermanentResidentSelect.innerHTML = nationalitySelect.innerHTML.replace('-- اختر / Select --', '- اختر -');
    }

    permResRadios.forEach(radio => {
        radio.addEventListener('change', function() {
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
