'use strict';

// One-off dev-DB seed: creates a sample published course with multiple
// modules and lessons for an existing educator, mirroring the shape that
// EducatorController/courseController.js produces (Course -> CourseModule
// -> Lesson), so the educator panel + student web app have something real
// to browse after clear-course-engagement-data.js wiped the old data.

const db = require('../models');

const EDUCATOR_EMAIL = process.argv[2] || 'educator@viewebit.com';

const COURSES = [
  {
    title: 'Complete Quantitative Aptitude Mastery',
    description: 'A structured course covering arithmetic, algebra, and data interpretation for competitive exams.',
    modules: [
      {
        title: 'Foundations of Arithmetic',
        lessons: [
          { title: 'Number Systems Overview', lesson_type: 'text', content_html: '<p>Introduction to number systems, HCF/LCM, and divisibility rules.</p>', duration_minutes: 15 },
          { title: 'Percentages Explained', lesson_type: 'video', video_url: 'https://example.com/videos/percentages.mp4', duration_minutes: 20 },
          { title: 'Ratio & Proportion Basics', lesson_type: 'text', content_html: '<p>Working with ratios, proportions, and their real-world applications.</p>', duration_minutes: 18, is_free_preview: true }
        ]
      },
      {
        title: 'Algebra Essentials',
        lessons: [
          { title: 'Linear Equations', lesson_type: 'video', video_url: 'https://example.com/videos/linear-equations.mp4', duration_minutes: 25 },
          { title: 'Quadratic Equations', lesson_type: 'text', content_html: '<p>Solving quadratics by factoring, completing the square, and the formula.</p>', duration_minutes: 22 }
        ]
      },
      {
        title: 'Data Interpretation',
        lessons: [
          { title: 'Reading Bar & Line Graphs', lesson_type: 'video', video_url: 'https://example.com/videos/graphs.mp4', duration_minutes: 20 },
          { title: 'Tables & Pie Charts', lesson_type: 'text', content_html: '<p>Extracting and comparing data from tabular and pie-chart formats.</p>', duration_minutes: 17 }
        ]
      }
    ]
  },
  {
    title: 'English Language & Comprehension',
    description: 'Grammar, vocabulary, and reading comprehension strategies for competitive exams.',
    modules: [
      {
        title: 'Grammar Fundamentals',
        lessons: [
          { title: 'Parts of Speech', lesson_type: 'text', content_html: '<p>Nouns, verbs, adjectives, and how they combine into sentences.</p>', duration_minutes: 15, is_free_preview: true },
          { title: 'Tenses in Depth', lesson_type: 'video', video_url: 'https://example.com/videos/tenses.mp4', duration_minutes: 24 }
        ]
      },
      {
        title: 'Reading Comprehension',
        lessons: [
          { title: 'Skimming & Scanning Techniques', lesson_type: 'video', video_url: 'https://example.com/videos/skimming.mp4', duration_minutes: 19 },
          { title: 'Inference-Based Questions', lesson_type: 'text', content_html: '<p>How to answer questions that require reading between the lines.</p>', duration_minutes: 16 }
        ]
      }
    ]
  }
];

async function run() {
  const educator = await db.Educator.findOne({ where: { email: EDUCATOR_EMAIL } });
  if (!educator) {
    console.error(`No educator found with email ${EDUCATOR_EMAIL}`);
    process.exit(1);
  }

  const t = await db.sequelize.transaction();
  try {
    const summary = [];

    for (const courseDef of COURSES) {
      const course = await db.Course.create({
        title: courseDef.title,
        description: courseDef.description,
        educator_id: educator.id,
        branch_id: educator.branch_id,
        department_id: educator.department_id,
        status: 'published'
      }, { transaction: t });

      let moduleOrder = 0;
      let lessonCount = 0;
      for (const moduleDef of courseDef.modules) {
        const module = await db.CourseModule.create({
          course_id: course.id,
          title: moduleDef.title,
          display_order: moduleOrder++
        }, { transaction: t });

        let lessonOrder = 0;
        for (const lessonDef of moduleDef.lessons) {
          await db.Lesson.create({
            course_module_id: module.id,
            title: lessonDef.title,
            lesson_type: lessonDef.lesson_type,
            video_url: lessonDef.video_url || null,
            content_html: lessonDef.content_html || null,
            duration_minutes: lessonDef.duration_minutes || null,
            is_free_preview: lessonDef.is_free_preview ?? false,
            display_order: lessonOrder++
          }, { transaction: t });
          lessonCount++;
        }
      }

      summary.push({ title: course.title, uuid: course.uuid, modules: courseDef.modules.length, lessons: lessonCount });
    }

    await t.commit();
    console.log(`Seeded for educator ${educator.name} (${educator.email}):`);
    console.table(summary);
  } catch (err) {
    await t.rollback();
    console.error('Seed failed, rolled back:', err.message);
    throw err;
  } finally {
    await db.sequelize.close();
  }
}

run();
