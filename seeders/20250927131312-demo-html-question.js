'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // First, get or create a category for testing
    const [category] = await queryInterface.bulkInsert('DynamicCategories', [{
      uuid: uuidv4(),
      name: 'HTML Test Category',
      description: 'Category for testing HTML explanations',
      createdAt: new Date(),
      updatedAt: new Date()
    }], { returning: true });

    // Get the category ID
    const categoryData = await queryInterface.sequelize.query(
      "SELECT id FROM DynamicCategories WHERE name = 'HTML Test Category' LIMIT 1"
    );
    const categoryId = categoryData[0][0]?.id;

    if (categoryId) {
      // Insert sample questions with rich HTML explanations
      await queryInterface.bulkInsert('DynamicQuestions', [
        {
          uuid: uuidv4(),
          category_id: categoryId,
          question_text: 'What is the capital of India?',
          question_text_gujarati: 'ભારતની રાજધાની શું છે?',
          option_a: 'Mumbai',
          option_b: 'Delhi',
          option_c: 'Kolkata',
          option_d: 'Chennai',
          option_a_gujarati: 'મુંબઈ',
          option_b_gujarati: 'દિલ્હી',
          option_c_gujarati: 'કોલકાતા',
          option_d_gujarati: 'ચેન્નાઈ',
          correct_answer: 'B',
          explanation: `
            <h3>Capital of India</h3>
            <p>The correct answer is <strong>Delhi</strong> (New Delhi).</p>

            <h4>Key Points:</h4>
            <ul>
              <li><strong>Delhi</strong> has been the capital since <em>1911</em></li>
              <li>Previously, <strong>Kolkata</strong> was the capital during British rule</li>
              <li>Delhi is both the <u>political</u> and <u>administrative</u> center of India</li>
            </ul>

            <blockquote>
              <p>New Delhi was specifically designed as the capital city by British architects Sir Edwin Lutyens and Sir Herbert Baker.</p>
            </blockquote>

            <h4>Other Major Cities:</h4>
            <table border="1">
              <tr>
                <th>City</th>
                <th>Status</th>
                <th>Population</th>
              </tr>
              <tr>
                <td>Mumbai</td>
                <td>Financial Capital</td>
                <td>~20 million</td>
              </tr>
              <tr>
                <td>Delhi</td>
                <td>National Capital</td>
                <td>~30 million</td>
              </tr>
              <tr>
                <td>Kolkata</td>
                <td>Former Capital</td>
                <td>~15 million</td>
              </tr>
            </table>
          `,
          explanation_gujarati: 'ભારતની રાજધાની દિલ્હી છે.',
          marks: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          uuid: uuidv4(),
          category_id: categoryId,
          question_text: 'Which programming language is known for web development?',
          question_text_gujarati: 'કઈ પ્રોગ્રામિંગ ભાષા વેબ ડેવલપમેન્ટ માટે જાણીતી છે?',
          option_a: 'Python',
          option_b: 'JavaScript',
          option_c: 'Java',
          option_d: 'C++',
          option_a_gujarati: 'પાયથોન',
          option_b_gujarati: 'જાવાસ્ક્રિપ્ટ',
          option_c_gujarati: 'જાવા',
          option_d_gujarati: 'સી++',
          correct_answer: 'B',
          explanation: `
            <h3>JavaScript for Web Development</h3>
            <p>The correct answer is <strong>JavaScript</strong>.</p>

            <p><em>JavaScript</em> is the <u>primary programming language</u> for web development because:</p>

            <ol>
              <li><strong>Client-side scripting</strong> - Runs in web browsers</li>
              <li><strong>Server-side development</strong> - Node.js runtime</li>
              <li><strong>Interactive web pages</strong> - Dynamic content manipulation</li>
              <li><strong>Rich ecosystem</strong> - Frameworks like React, Vue, Angular</li>
            </ol>

            <h4>JavaScript Usage Example:</h4>
            <pre><code>
// Simple JavaScript function
function greetUser(name) {
  return \`Hello, \${name}!\`;
}

console.log(greetUser("Developer"));
            </code></pre>

            <blockquote>
              <p><strong>Fun Fact:</strong> JavaScript was created in just 10 days by Brendan Eich in 1995!</p>
            </blockquote>

            <p>While other languages like <code>Python</code>, <code>Java</code>, and <code>C++</code> are powerful, JavaScript remains the <em>lingua franca</em> of the web.</p>
          `,
          explanation_gujarati: 'જાવાસ્ક્રિપ્ટ વેબ ડેવલપમેન્ટ માટે મુખ્ય ભાષા છે.',
          marks: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('DynamicQuestions', {
      question_text: ['What is the capital of India?', 'Which programming language is known for web development?']
    });

    await queryInterface.bulkDelete('DynamicCategories', {
      name: 'HTML Test Category'
    });
  }
};
