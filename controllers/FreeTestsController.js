const ErrorHandler = require('../utils/default/errorHandler');
const { FreeTest, Subject, SubjectHierarchy, NewQuestion } = require('../models');
const { Op } = require('sequelize');

// Get all free tests with pagination and filters (Public endpoint)
exports.getFreeTests = async (req, res, next) => {
    try {
        console.log('🔍 Free tests endpoint called');
        
        // Return mock data for now until database is set up
        const mockData = {
            success: true,
            data: [
                {
                    id: 1,
                    uuid: 'test-uuid-1',
                    title: 'Mathematics Practice Test',
                    description: 'Basic mathematics questions for practice',
                    test_type: 'practice',
                    total_questions: 20,
                    duration: 60,
                    difficulty: 'easy',
                    is_featured: true,
                    is_free: true,
                    category: 'Mathematics',
                    user_attempts: 0,
                    attempts_allowed: 3
                },
                {
                    id: 2,
                    uuid: 'test-uuid-2',
                    title: 'English Grammar Mock Test',
                    description: 'Test your english grammar skills',
                    test_type: 'mock',
                    total_questions: 25,
                    duration: 45,
                    difficulty: 'medium',
                    is_featured: false,
                    is_free: true,
                    category: 'English',
                    user_attempts: 1,
                    attempts_allowed: 5
                },
                {
                    id: 3,
                    uuid: 'test-uuid-3',
                    title: 'General Knowledge Quiz',
                    description: 'Test your general knowledge',
                    test_type: 'practice',
                    total_questions: 30,
                    duration: 90,
                    difficulty: 'hard',
                    is_featured: true,
                    is_free: true,
                    category: 'General Knowledge',
                    user_attempts: 0,
                    attempts_allowed: 2
                }
            ],
            pagination: {
                page: 1,
                limit: 20,
                total: 3,
                totalPages: 1
            },
            message: 'Free tests retrieved successfully'
        };

        res.status(200).json(mockData);
    } catch (err) {
        console.error('Get free tests error:', err);
        const error = new ErrorHandler('Failed to fetch free tests', 500);
        return next(error);
    }
};

// Get single free test by ID
exports.getFreeTestById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Mock data for specific test
        const mockTest = {
            success: true,
            data: {
                id: id,
                uuid: id,
                title: 'Mathematics Practice Test',
                description: 'Comprehensive mathematics test covering algebra, geometry, and arithmetic',
                test_type: 'practice',
                total_questions: 25,
                duration: 90,
                difficulty: 'medium',
                is_featured: true,
                category: 'Mathematics',
                subject: 'Mathematics',
                instructions: 'Read all questions carefully. Each question carries 4 marks. There is negative marking of 1 mark for wrong answers.',
                allows_pause_resume: true,
                negative_marking: true,
                negative_marks: 1,
                supports_multilanguage: true,
                attempts_allowed: 3,
                user_attempts: 0
            },
            message: 'Free test retrieved successfully'
        };

        res.status(200).json(mockTest);
    } catch (err) {
        console.error('Get free test by ID error:', err);
        const error = new ErrorHandler('Failed to fetch free test', 500);
        return next(error);
    }
};

// Get free test categories
exports.getFreeTestCategories = async (req, res, next) => {
    try {
        const mockCategories = {
            success: true,
            data: [
                { name: 'Mathematics', count: 15 },
                { name: 'English', count: 12 },
                { name: 'General Knowledge', count: 18 },
                { name: 'Reasoning', count: 10 },
                { name: 'Computer Science', count: 8 }
            ],
            message: 'Categories retrieved successfully'
        };

        res.status(200).json(mockCategories);
    } catch (err) {
        console.error('Get free test categories error:', err);
        const error = new ErrorHandler('Failed to fetch categories', 500);
        return next(error);
    }
};

// Get free test statistics
exports.getFreeTestStats = async (req, res, next) => {
    try {
        const mockStats = {
            success: true,
            data: {
                total_tests: 25,
                featured_tests: 8,
                completed_tests: 12,
                average_score: 78.5,
                total_attempts: 156,
                category_stats: [
                    { category: 'Mathematics', count: 15, avg_score: 82.3 },
                    { category: 'English', count: 12, avg_score: 75.8 },
                    { category: 'General Knowledge', count: 18, avg_score: 79.2 }
                ],
                difficulty_stats: [
                    { difficulty: 'easy', count: 8, avg_score: 85.5 },
                    { difficulty: 'medium', count: 12, avg_score: 76.8 },
                    { difficulty: 'hard', count: 5, avg_score: 68.2 }
                ]
            },
            message: 'Statistics retrieved successfully'
        };

        res.status(200).json(mockStats);
    } catch (err) {
        console.error('Get free test stats error:', err);
        const error = new ErrorHandler('Failed to fetch stats', 500);
        return next(error);
    }
};