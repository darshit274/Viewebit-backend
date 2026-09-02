'use strict';

// One-off dev-DB cleanup: wipes all Course records and everything that
// hangs off them (modules, lessons, progress, assignments, submissions,
// course-scoped live sessions/attendance, certificates, category links).
// Leaves Educators, Students, TestSeries, and non-course LiveSessions intact.
// Local dev database only - do not point this at production.

const db = require('../models');

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  const t = await db.sequelize.transaction();
  try {
    const courseIds = (await db.Course.findAll({ attributes: ['id'], transaction: t }))
      .map((c) => c.id);

    if (courseIds.length === 0) {
      console.log('No courses found - nothing to clean up.');
      await t.rollback();
      return;
    }

    const lessonIds = (await db.Lesson.findAll({ attributes: ['id'], transaction: t }))
      .map((l) => l.id);
    const courseLiveSessionIds = (await db.LiveSession.findAll({
      attributes: ['id'],
      where: { course_id: courseIds },
      transaction: t
    })).map((s) => s.id);

    if (DRY_RUN) {
      const counts = {
        courses: courseIds.length,
        course_modules: await db.CourseModule.count({ where: { course_id: courseIds }, transaction: t }),
        lessons: lessonIds.length,
        lesson_progress: await db.LessonProgress.count({ where: { lesson_id: lessonIds }, transaction: t }),
        assignments: await db.Assignment.count({ where: { course_id: courseIds }, transaction: t }),
        assignment_submissions: await db.AssignmentSubmission.count({ transaction: t }),
        certificates: await db.Certificate.count({ where: { course_id: courseIds }, transaction: t }),
        live_sessions: courseLiveSessionIds.length,
        live_session_attendance: await db.LiveSessionAttendance.count({ where: { live_session_id: courseLiveSessionIds }, transaction: t }),
        course_category_links: await db.CourseCategoryLink.count({ where: { course_id: courseIds }, transaction: t })
      };
      console.log('Would delete (dry run, no changes made):', counts);
      await t.rollback();
      return;
    }

    const counts = {};

    counts.lesson_progress = await db.LessonProgress.destroy({
      where: { lesson_id: lessonIds },
      transaction: t
    });

    // Assignment.course_id is NOT NULL, so every assignment (and therefore
    // every submission against one) is course-scoped - safe to wipe all.
    counts.assignment_submissions = await db.AssignmentSubmission.destroy({ where: {}, transaction: t });

    counts.live_session_attendance = await db.LiveSessionAttendance.destroy({
      where: { live_session_id: courseLiveSessionIds },
      transaction: t
    });

    counts.assignments = await db.Assignment.destroy({ where: { course_id: courseIds }, transaction: t });
    counts.certificates = await db.Certificate.destroy({ where: { course_id: courseIds }, transaction: t });
    counts.live_sessions = await db.LiveSession.destroy({ where: { id: courseLiveSessionIds }, transaction: t });
    counts.course_category_links = await db.CourseCategoryLink.destroy({ where: { course_id: courseIds }, transaction: t });
    counts.lessons = await db.Lesson.destroy({ where: { id: lessonIds }, transaction: t });
    counts.course_modules = await db.CourseModule.destroy({ where: { course_id: courseIds }, transaction: t });
    counts.courses = await db.Course.destroy({ where: { id: courseIds }, transaction: t });

    await t.commit();
    console.log('Deleted rows:', counts);
  } catch (err) {
    await t.rollback();
    console.error('Cleanup failed, rolled back:', err.message);
    throw err;
  } finally {
    await db.sequelize.close();
  }
}

run();
