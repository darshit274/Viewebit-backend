const XLSX = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');

const TEMPLATE_HEADERS = {
  'Question Text (English)': 'question_text',
  'Question Text (Gujarati)': 'question_text_gujarati',
  'Option A (English)': 'option_a',
  'Option B (English)': 'option_b',
  'Option C (English)': 'option_c',
  'Option D (English)': 'option_d',
  'Option A (Gujarati)': 'option_a_gujarati',
  'Option B (Gujarati)': 'option_b_gujarati',
  'Option C (Gujarati)': 'option_c_gujarati',
  'Option D (Gujarati)': 'option_d_gujarati',
  'Correct Answer': 'correct_answer',
  'Explanation (English)': 'explanation',
  'Explanation (Gujarati)': 'explanation_gujarati',
  'Marks': 'marks'
};

function buildSampleRows() {
  return [
    {
      'Question Text (English)': 'What is the capital of Gujarat?',
      'Question Text (Gujarati)': 'ગુજરાતની રાજધાની શું છે?',
      'Option A (English)': 'Ahmedabad',
      'Option B (English)': 'Gandhinagar',
      'Option C (English)': 'Surat',
      'Option D (English)': 'Rajkot',
      'Option A (Gujarati)': 'અમદાવાદ',
      'Option B (Gujarati)': 'ગાંધીનગર',
      'Option C (Gujarati)': 'સુરત',
      'Option D (Gujarati)': 'રાજકોટ',
      'Correct Answer': 'B',
      'Explanation (English)': 'Gandhinagar is the capital city of Gujarat state in India.',
      'Explanation (Gujarati)': 'ગાંધીનગર એ ભારતના ગુજરાત રાજ્યની રાજધાની છે.',
      'Marks': 1
    },
    {
      'Question Text (English)': 'Which river flows through Ahmedabad?',
      'Question Text (Gujarati)': 'કઈ નદી અમદાવાદમાંથી વહે છે?',
      'Option A (English)': 'Narmada',
      'Option B (English)': 'Sabarmati',
      'Option C (English)': 'Tapi',
      'Option D (English)': 'Mahi',
      'Option A (Gujarati)': 'નર્મદા',
      'Option B (Gujarati)': 'સાબરમતી',
      'Option C (Gujarati)': 'તાપી',
      'Option D (Gujarati)': 'માહી',
      'Correct Answer': 'B',
      'Explanation (English)': 'The Sabarmati River flows through Ahmedabad city.',
      'Explanation (Gujarati)': 'સાબરમતી નદી અમદાવાદ શહેરમાંથી વહે છે.',
      'Marks': 1
    }
  ];
}

function validateQuestionRow(row, rowNumber, questionOrder = null) {
  const errors = [];
  const question = {};

  const hasEnglishContent = row['Question Text (English)'] && row['Question Text (English)'].toString().trim() !== '';
  const hasGujaratiContent = row['Question Text (Gujarati)'] && row['Question Text (Gujarati)'].toString().trim() !== '';

  if (!hasEnglishContent && !hasGujaratiContent) {
    errors.push({ row: rowNumber, field: 'Question Text', error: 'Question text is required in at least one language (English or Gujarati)' });
    return { errors, question };
  }

  if (hasEnglishContent) {
    ['Question Text (English)', 'Option A (English)', 'Option B (English)', 'Option C (English)', 'Option D (English)'].forEach((field) => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({ row: rowNumber, field, error: `${field} is required when providing English content` });
      }
    });
  }

  if (hasGujaratiContent) {
    ['Question Text (Gujarati)', 'Option A (Gujarati)', 'Option B (Gujarati)', 'Option C (Gujarati)', 'Option D (Gujarati)'].forEach((field) => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({ row: rowNumber, field, error: `${field} is required when providing Gujarati content` });
      }
    });
  }

  if (!row['Correct Answer'] || row['Correct Answer'].toString().trim() === '') {
    errors.push({ row: rowNumber, field: 'Correct Answer', error: 'Correct Answer is required' });
  }
  if (row['Correct Answer']) {
    const correctAnswer = row['Correct Answer'].toString().toUpperCase().trim();
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      errors.push({ row: rowNumber, field: 'Correct Answer', error: 'Correct Answer must be A, B, C, or D' });
    }
  }

  const marks = parseInt(row['Marks'] || 1);
  if (isNaN(marks) || marks < 1 || marks > 10) {
    errors.push({ row: rowNumber, field: 'Marks', error: 'Marks must be a number between 1 and 10' });
  }

  if (errors.length === 0) {
    question.question_text = hasEnglishContent ? row['Question Text (English)'].toString().trim() : null;
    question.option_a = hasEnglishContent ? row['Option A (English)'].toString().trim() : null;
    question.option_b = hasEnglishContent ? row['Option B (English)'].toString().trim() : null;
    question.option_c = hasEnglishContent ? row['Option C (English)'].toString().trim() : null;
    question.option_d = hasEnglishContent ? row['Option D (English)'].toString().trim() : null;
    question.explanation = (hasEnglishContent && row['Explanation (English)']) ? row['Explanation (English)'].toString().trim() : null;

    question.question_text_gujarati = hasGujaratiContent ? row['Question Text (Gujarati)'].toString().trim() : null;
    question.option_a_gujarati = hasGujaratiContent ? row['Option A (Gujarati)'].toString().trim() : null;
    question.option_b_gujarati = hasGujaratiContent ? row['Option B (Gujarati)'].toString().trim() : null;
    question.option_c_gujarati = hasGujaratiContent ? row['Option C (Gujarati)'].toString().trim() : null;
    question.option_d_gujarati = hasGujaratiContent ? row['Option D (Gujarati)'].toString().trim() : null;
    question.explanation_gujarati = (hasGujaratiContent && row['Explanation (Gujarati)']) ? row['Explanation (Gujarati)'].toString().trim() : null;

    question.correct_answer = row['Correct Answer'].toString().toUpperCase().trim();
    question.marks = marks;
    question.is_active = true;
    if (questionOrder !== null) question.question_order = questionOrder;
  }

  return { errors, question };
}

async function parseAndValidateFile(filePath, fileType) {
  const errors = [];
  const questions = [];
  let totalRows = 0;

  if (fileType === 'excel') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    totalRows = jsonData.length;
    jsonData.forEach((row, index) => {
      const rowNumber = index + 2;
      const questionOrder = index + 1;
      const result = validateQuestionRow(row, rowNumber, questionOrder);
      if (result.errors.length > 0) errors.push(...result.errors);
      else questions.push(result.question);
    });

    return { isValid: errors.length === 0, totalRows, errors, validQuestions: questions };
  }

  if (fileType === 'csv') {
    return new Promise((resolve, reject) => {
      const csvData = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => csvData.push(row))
        .on('end', () => {
          totalRows = csvData.length;
          csvData.forEach((row, index) => {
            const rowNumber = index + 2;
            const questionOrder = index + 1;
            const result = validateQuestionRow(row, rowNumber, questionOrder);
            if (result.errors.length > 0) errors.push(...result.errors);
            else questions.push(result.question);
          });
          resolve({ isValid: errors.length === 0, totalRows, errors, validQuestions: questions });
        })
        .on('error', reject);
    });
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

module.exports = { TEMPLATE_HEADERS, buildSampleRows, validateQuestionRow, parseAndValidateFile };
