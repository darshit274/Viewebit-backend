'use strict';

// One-off dev-DB seed: adds a real quiz (Category + Question rows, the same
// "simplified hierarchy" system EducatorController/quizHierarchyController.js
// uses) into the first module of the first course seeded by
// seed-course-with-modules.js, then attaches it as a 'quiz' lesson —
// mirroring exactly what createCourseQuizCategory + createQuestion +
// createLesson do for a real educator using the course builder UI.

const db = require('../models');
const { getOrCreateQuizBank, createChildCategory } = require('../utils/quizCategoryHelpers');

const EDUCATOR_EMAIL = process.argv[2] || 'educator@viewebit.com';
const COURSE_TITLE = process.argv[3] || 'Complete Quantitative Aptitude Mastery';

const QUESTIONS = [
  { question_text: 'What is 15% of 200?', option_a: '20', option_b: '30', option_c: '40', option_d: '50', correct_answer: 'B', explanation: '15% of 200 = 0.15 x 200 = 30.' },
  { question_text: 'If the ratio of two numbers is 3:4 and their sum is 63, what is the larger number?', option_a: '27', option_b: '30', option_c: '36', option_d: '33', correct_answer: 'C', explanation: 'Parts = 63/7 = 9, larger = 4 x 9 = 36.' },
  { question_text: 'The HCF of 12 and 18 is:', option_a: '2', option_b: '6', option_c: '3', option_d: '9', correct_answer: 'B', explanation: 'Common factors of 12 and 18: highest is 6.' },
  { question_text: 'Solve for x: 2x + 5 = 15', option_a: '4', option_b: '5', option_c: '6', option_d: '10', correct_answer: 'B', explanation: '2x = 10, so x = 5.' },
  { question_text: 'What is the next number in the series: 2, 4, 8, 16, ...?', option_a: '18', option_b: '24', option_c: '32', option_d: '20', correct_answer: 'C', explanation: 'Each term doubles the previous one: 16 x 2 = 32.' }
];

async function run() {
  const educator = await db.Educator.findOne({ where: { email: EDUCATOR_EMAIL } });
  if (!educator) {
    console.error(`No educator found with email ${EDUCATOR_EMAIL}`);
    process.exit(1);
  }

  const course = await db.Course.findOne({ where: { title: COURSE_TITLE, educator_id: educator.id } });
  if (!course) {
    console.error(`No course "${COURSE_TITLE}" found for ${EDUCATOR_EMAIL}`);
    process.exit(1);
  }

  const firstModule = await db.CourseModule.findOne({ where: { course_id: course.id }, order: [['display_order', 'ASC']] });
  if (!firstModule) {
    console.error('Course has no modules to attach a quiz lesson to.');
    process.exit(1);
  }

  // Mirrors findOrCreateCourseQuizRoot() from courseController.js
  let root;
  if (course.quiz_category_id) {
    root = await db.Category.findByPk(course.quiz_category_id);
  }
  if (!root) {
    const quizBank = await getOrCreateQuizBank(educator);
    root = await createChildCategory({
      parentCategory: null,
      testSeriesId: quizBank.id,
      hierarchyLevel: 0,
      educatorId: educator.id,
      name: `${course.title} — Course Quizzes`,
      description: `Auto-created container for quizzes created inline from the "${course.title}" course builder.`,
      nodeType: 'container'
    });
    await course.update({ quiz_category_id: root.id });
  }

  // Mirrors createCourseQuizCategory()
  const quizCategory = await createChildCategory({
    parentCategory: root,
    testSeriesId: root.test_series_id,
    hierarchyLevel: root.hierarchy_level + 1,
    educatorId: educator.id,
    name: 'Quantitative Aptitude — Module Quiz',
    description: null
  });

  // Mirrors createQuestion() called once per question
  for (const [i, q] of QUESTIONS.entries()) {
    await db.Question.create({
      category_id: quizCategory.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      marks: 1,
      display_order: i + 1
    });
  }
  await quizCategory.update({ node_type: 'question_holder' });

  // Mirrors createLesson() with lesson_type 'quiz'
  const display_order = await db.Lesson.count({ where: { course_module_id: firstModule.id } });
  const lesson = await db.Lesson.create({
    course_module_id: firstModule.id,
    title: 'Module Quiz: Quantitative Aptitude Basics',
    lesson_type: 'quiz',
    category_id: quizCategory.id,
    duration_minutes: 15,
    is_free_preview: false,
    display_order
  });

  console.log('Seeded quiz lesson:', {
    course: course.title,
    module: firstModule.title,
    quizCategory: { id: quizCategory.id, uuid: quizCategory.uuid, name: quizCategory.name },
    questionCount: QUESTIONS.length,
    lesson: { id: lesson.id, uuid: lesson.uuid, title: lesson.title }
  });

  await db.sequelize.close();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
