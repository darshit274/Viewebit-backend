// Viewebit-backend/utils/educatorScope.js
const { Course, Category } = require('../models');

// Full Course rows owned by this educator — callers derive course ids /
// test series ids from this rather than issuing separate queries.
const getEducatorCourses = async (educatorId) => {
    const courses = await Course.findAll({
        where: { educator_id: educatorId },
        attributes: ['id', 'uuid', 'title', 'test_series_id'],
    });
    return courses.map((c) => c.toJSON());
};

// Returns every Category id/uuid owned by this educator, PLUS all
// descendants (walking down parent_category_id) — a TestSession only
// counts toward this educator if its session_data.category_uuid matches
// one of these uuids.
const getEducatorCategoryIds = async (educatorId) => {
    const roots = await Category.findAll({
        where: { educator_id: educatorId },
        attributes: ['id', 'uuid'],
    });

    const ids = roots.map((r) => r.id);
    const uuids = roots.map((r) => r.uuid);

    let frontier = ids.slice();
    while (frontier.length > 0) {
        const children = await Category.findAll({
            where: { parent_category_id: frontier },
            attributes: ['id', 'uuid'],
        });
        if (children.length === 0) break;
        ids.push(...children.map((c) => c.id));
        uuids.push(...children.map((c) => c.uuid));
        frontier = children.map((c) => c.id);
    }

    return { ids, uuids };
};

module.exports = { getEducatorCourses, getEducatorCategoryIds };
