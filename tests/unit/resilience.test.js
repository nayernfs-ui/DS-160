const assert = require('assert');
const submit = require('../../api/submit');

(async function run() {
  try {
    console.log('resilience.test: starting');
    // Build a sample form that intentionally omits Module 4 fields (Work/Education/Training)
    const sample = {
      FullName: 'Test User',
      DOB_Day: '01',
      DOB_Month: '01',
      DOB_Year: '1990',
      Nationality: 'United States',
      // Note: Work_JobTitle, Work_Employer, Education_Institution, Training_Course intentionally omitted
    };

    const result = await submit.generateDocument(sample, { returnProcessedData: true });
    // generateDocument may return an object { buffer, processedData } when returnProcessedData is true
    const processed =
      result && result.processedData ? result.processedData : result.processedData || result;

    // Basic assertions
    assert(result, 'generateDocument returned falsy');
    if (result.buffer) assert(Buffer.isBuffer(result.buffer), 'Buffer missing from result');
    assert(processed && typeof processed === 'object', 'processedData missing or invalid');

    // Ensure the removed keys are not present in processedData (they should be absent)
    assert(
      !Object.prototype.hasOwnProperty.call(processed, 'Work_JobTitle'),
      'Work_JobTitle should not be present'
    );
    assert(
      !Object.prototype.hasOwnProperty.call(processed, 'Work_Employer'),
      'Work_Employer should not be present'
    );
    assert(
      !Object.prototype.hasOwnProperty.call(processed, 'Education_Institution'),
      'Education_Institution should not be present'
    );
    assert(
      !Object.prototype.hasOwnProperty.call(processed, 'Training_Course'),
      'Training_Course should not be present'
    );

    console.log('resilience.test: PASS');
    process.exit(0);
  } catch (err) {
    console.error('resilience.test: FAIL');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();
