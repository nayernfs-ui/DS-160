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

    // --- Arabic country names mapping ---
    const countryNamesArabic = {
        "Afghanistan": "أفغانستان",
        "Albania": "ألبانيا",
        "Algeria": "الجزائر",
        "Andorra": "أندورا",
        "Angola": "أنغولا",
        "Antigua and Barbuda": "أنتيغوا وباربودا",
        "Argentina": "الأرجنتين",
        "Armenia": "أرمينيا",
        "Australia": "أستراليا",
        "Austria": "النمسا",
        "Azerbaijan": "أذربيجان",
        "Bahamas": "الباهاما",
        "Bahrain": "البحرين",
        "Bangladesh": "بنغلاديش",
        "Barbados": "بربادوس",
        "Belarus": "بيلاروسيا",
        "Belgium": "بلجيكا",
        "Belize": "بليز",
        "Benin": "بنين",
        "Bhutan": "بوتان",
        "Bolivia": "بوليفيا",
        "Bosnia and Herzegovina": "البوسنة والهرسك",
        "Botswana": "بتسوانا",
        "Brazil": "البرازيل",
        "Brunei": "بروناي",
        "Bulgaria": "بلغاريا",
        "Burkina Faso": "بوركينا فاسو",
        "Burundi": "بوروندي",
        "Cabo Verde": "الرأس الأخضر",
        "Cambodia": "كمبوديا",
        "Cameroon": "الكاميرون",
        "Canada": "كندا",
        "Central African Republic": "جمهورية أفريقيا الوسطى",
        "Chad": "تشاد",
        "Chile": "تشيلي",
        "China": "الصين",
        "Colombia": "كولومبيا",
        "Comoros": "جزر القمر",
        "Costa Rica": "كوستاريكا",
        "Côte d'Ivoire": "ساحل العاج",
        "Croatia": "كرواتيا",
        "Cuba": "كوبا",
        "Cyprus": "قبرص",
        "Czechia": "التشيك",
        "Democratic Republic of the Congo": "جمهورية الكونغو الديمقراطية",
        "Denmark": "الدنمارك",
        "Djibouti": "جيبوتي",
        "Dominica": "دومينيكا",
        "Dominican Republic": "الجمهورية الدومينيكية",
        "Ecuador": "الإكوادور",
        "Egypt": "مصر",
        "El Salvador": "السلفادور",
        "Equatorial Guinea": "غينيا الاستوائية",
        "Eritrea": "إريتريا",
        "Estonia": "إستونيا",
        "Eswatini": "إسواتيني",
        "Ethiopia": "إثيوبيا",
        "Federated States of Micronesia": "ولايات ميكرونيزيا الفيدرالية",
        "Fiji": "فيجي",
        "Finland": "فنلندا",
        "France": "فرنسا",
        "Gabon": "الغابون",
        "Gambia": "غامبيا",
        "Georgia": "جورجيا",
        "Germany": "ألمانيا",
        "Ghana": "غانا",
        "Greece": "اليونان",
        "Grenada": "غرينادا",
        "Guatemala": "غواتيمالا",
        "Guinea": "غينيا",
        "Guinea-Bissau": "غينيا بيساو",
        "Guyana": "غيانا",
        "Haiti": "هايتي",
        "Honduras": "هندوراس",
        "Hungary": "المجر",
        "Iceland": "آيسلندا",
        "India": "الهند",
        "Indonesia": "إندونيسيا",
        "Iran": "إيران",
        "Iraq": "العراق",
        "Ireland": "إيرلندا",
        "Israel": "إسرائيل",
        "Italy": "إيطاليا",
        "Jamaica": "جامايكا",
        "Japan": "اليابان",
        "Jordan": "الأردن",
        "Kazakhstan": "كازاخستان",
        "Kenya": "كينيا",
        "Kiribati": "كيريباتي",
        "Kosovo": "كوسوفو",
        "Kuwait": "الكويت",
        "Kyrgyzstan": "قيرغيزستان",
        "Laos": "لاوس",
        "Latvia": "لاتفيا",
        "Lebanon": "لبنان",
        "Lesotho": "ليسوتو",
        "Liberia": "ليبيريا",
        "Libya": "ليبيا",
        "Liechtenstein": "ليختنشتاين",
        "Lithuania": "ليتوانيا",
        "Luxembourg": "لوكسمبورغ",
        "Madagascar": "مدغشقر",
        "Malawi": "مالاوي",
        "Malaysia": "ماليزيا",
        "Maldives": "المالديف",
        "Mali": "مالي",
        "Malta": "مالطا",
        "Marshall Islands": "جزر مارشال",
        "Mauritania": "موريتانيا",
        "Mauritius": "موريشيوس",
        "Mexico": "المكسيك",
        "Moldova": "مولدوفا",
        "Monaco": "موناكو",
        "Mongolia": "منغوليا",
        "Montenegro": "الجبل الأسود",
        "Morocco": "المغرب",
        "Mozambique": "موزمبيق",
        "Myanmar": "ميانمار",
        "Namibia": "ناميبيا",
        "Nauru": "ناورو",
        "Nepal": "نيبال",
        "Netherlands": "هولندا",
        "New Zealand": "نيوزيلندا",
        "Nicaragua": "نيكاراغوا",
        "Niger": "النيجر",
        "Nigeria": "نيجيريا",
        "North Korea": "كوريا الشمالية",
        "North Macedonia": "مقدونيا الشمالية",
        "Norway": "النرويج",
        "Oman": "عمان",
        "Pakistan": "باكستان",
        "Palau": "بالاو",
        "Panama": "بنما",
        "Papua New Guinea": "بابوا غينيا الجديدة",
        "Paraguay": "باراجواي",
        "Peru": "بيرو",
        "Philippines": "الفلبين",
        "Poland": "بولندا",
        "Portugal": "البرتغال",
        "Qatar": "قطر",
        "Republic of the Congo": "جمهورية الكونغو",
        "Romania": "رومانيا",
        "Russia": "روسيا",
        "Rwanda": "رواندا",
        "Saint Kitts and Nevis": "سانت كيتس ونيفيس",
        "Saint Lucia": "سانت لوسيا",
        "Saint Vincent and the Grenadines": "سانت فنسنت والغرينادين",
        "Samoa": "ساموا",
        "San Marino": "سان مارينو",
        "Sao Tome and Principe": "ساو تومي وبرينسيب",
        "Saudi Arabia": "المملكة العربية السعودية",
        "Senegal": "السنغال",
        "Serbia": "صربيا",
        "Seychelles": "سيشيل",
        "Sierra Leone": "سيراليون",
        "Singapore": "سنغافورة",
        "Slovakia": "سلوفاكيا",
        "Slovenia": "سلوفينيا",
        "Solomon Islands": "جزر سولومون",
        "Somalia": "الصومال",
        "South Africa": "جنوب أفريقيا",
        "South Korea": "كوريا الجنوبية",
        "South Sudan": "جنوب السودان",
        "Spain": "إسبانيا",
        "Sri Lanka": "سريلانكا",
        "Sudan": "السودان",
        "Suriname": "سورينام",
        "Sweden": "السويد",
        "Switzerland": "سويسرا",
        "Syria": "سوريا",
        "Taiwan": "تايوان",
        "Tajikistan": "طاجيكستان",
        "Tanzania": "تنزانيا",
        "Thailand": "تايلاند",
        "Timor-Leste": "تيمور الشرقية",
        "Togo": "توغو",
        "Tonga": "تونغا",
        "Trinidad and Tobago": "ترينيداد وتوباغو",
        "Tunisia": "تونس",
        "Turkey": "تركيا",
        "Turkmenistan": "تركمانستان",
        "Tuvalu": "توفالو",
        "Uganda": "أوغندا",
        "Ukraine": "أوكرانيا",
        "United Arab Emirates": "الإمارات العربية المتحدة",
        "United Kingdom": "المملكة المتحدة",
        "United States of America": "الولايات المتحدة الأمريكية",
        "Uruguay": "أوروغواي",
        "Uzbekistan": "أوزبكستان",
        "Vanuatu": "فانواتو",
        "Vatican City": "دولة الفاتيكان",
        "Venezuela": "فنزويلا",
        "Vietnam": "فيتنام",
        "Yemen": "اليمن",
        "Zambia": "زامبيا",
        "Zimbabwe": "زيمبابوي"
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
