const { Category, TestSeries, Educator, sequelize } = require('../models');

async function getOrCreateQuizBank(educator) {
    if (educator.quiz_bank_test_series_id) {
        const existing = await TestSeries.findByPk(educator.quiz_bank_test_series_id);
        if (existing) return existing;
    }

    const testSeries = await TestSeries.create({
        name: `${educator.name} — Quiz Bank`,
        description: 'Private container for this educator\'s own quiz categories. Not shown to students directly.',
        is_active: true,
        pricing_type: 'free'
    });

    await Educator.update({ quiz_bank_test_series_id: testSeries.id }, { where: { id: educator.id } });
    return testSeries;
}

const findOwnedCategory = async (categoryUuid, educatorId) => {
    return Category.findOne({ where: { uuid: categoryUuid, educator_id: educatorId } });
};

async function createChildCategory({ parentCategory, testSeriesId, hierarchyLevel, educatorId, name, description, nodeType }) {
    const siblingMax = await Category.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('display_order')), 'maxOrder']],
        where: { test_series_id: testSeriesId, parent_category_id: parentCategory ? parentCategory.id : null },
        raw: true
    });
    const nextDisplayOrder = (siblingMax?.maxOrder || 0) + 1;

    const category = await Category.create({
        test_series_id: testSeriesId,
        parent_category_id: parentCategory ? parentCategory.id : null,
        educator_id: educatorId,
        name: name.trim(),
        description: description?.trim() || null,
        hierarchy_level: hierarchyLevel,
        node_type: nodeType || 'unset',
        display_order: nextDisplayOrder,
        negative_marking_enabled: false,
        negative_marks_per_wrong: 0.25,
        test_duration_minutes: 60
    });

    if (parentCategory && parentCategory.node_type === 'unset') {
        await parentCategory.update({ node_type: 'container' });
    }

    return category;
}

module.exports = { getOrCreateQuizBank, findOwnedCategory, createChildCategory };
