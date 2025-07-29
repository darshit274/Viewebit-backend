# Test System API Documentation

## Overview
Complete API documentation for the new hierarchical test system with multilingual support, pause/resume functionality, and comprehensive analytics.

## Base URLs
- **Student APIs**: `/api/tests/`
- **Admin APIs**: `/api/admin/test-management/`

---

## 🎯 Student APIs

### 1. Get Exam Categories (Hierarchical)
```http
GET /api/tests/categories?level=0&parent_id=1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Exam-wise Test Series",
      "name_gujarati": "પરીક્ષા પ્રમાણે ટેસ્ટ સિરીઝ",
      "hierarchy_level": 0,
      "children": [
        {
          "id": 4,
          "name": "Police Sub Inspector (PSI)",
          "name_gujarati": "પોલીસ સબ ઇન્સ્પેક્ટર (PSI)",
          "testSeries": [...]
        }
      ]
    }
  ]
}
```

### 2. Get Test Series
```http
GET /api/tests/series?category_id=4&search=PSI&page=1&limit=12
```

**Response:**
```json
{
  "success": true,
  "data": {
    "testSeries": [
      {
        "id": 1,
        "uuid": "550e8400-e29b-41d4-a716-446655440001",
        "title": "PSI Complete Mock Test Series 2025",
        "title_gujarati": "PSI સંપૂર્ણ મોક ટેસ્ટ સિરીઝ 2025",
        "price": 999.00,
        "is_free": false,
        "free_test_count": 2,
        "total_tests": 10,
        "actualTestsCount": 10,
        "actualFreeTestsCount": 2,
        "category": {
          "id": 4,
          "name": "Police Sub Inspector (PSI)"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 12,
      "totalPages": 1
    }
  }
}
```

### 3. Start Test Session
```http
POST /api/tests/550e8400-e29b-41d4-a716-446655440101/start
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "user_id": "user-uuid-here",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test session started successfully",
  "data": {
    "sessionId": "session-uuid-here",
    "test": {
      "id": 1,
      "title": "PSI Mock Test 1",
      "duration_minutes": 120,
      "total_questions": 100,
      "has_negative_marking": true,
      "negative_marks": 0.25,
      "allows_pause": true,
      "instructions": "Answer all questions carefully..."
    },
    "session": {
      "attemptNumber": 1,
      "remainingTime": 7200,
      "startedAt": "2025-01-30T10:00:00Z"
    },
    "questions": [
      {
        "id": 1,
        "question": "What is the capital of Gujarat?",
        "options": [
          {"key": "A", "text": "Ahmedabad"},
          {"key": "B", "text": "Gandhinagar"},
          {"key": "C", "text": "Surat"},
          {"key": "D", "text": "Vadodara"}
        ],
        "marks": 1,
        "subject": "General Knowledge",
        "difficulty": "easy"
      }
    ]
  }
}
```

### 4. Submit Answer
```http
POST /api/tests/session/session-uuid-here/answer
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "questionId": 1,
  "selectedOption": "B",
  "timeSpent": 45,
  "isFlagged": false,
  "confidenceLevel": "high"
}
```

### 5. Pause Test Session
```http
POST /api/tests/session/session-uuid-here/pause
Authorization: Bearer <token>
```

### 6. Resume Test Session
```http
POST /api/tests/session/session-uuid-here/resume
Authorization: Bearer <token>
```

### 7. Submit Complete Test
```http
POST /api/tests/session/session-uuid-here/submit
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "sessionId": "session-uuid-here",
    "results": {
      "totalScore": 75.25,
      "maxPossibleScore": 100,
      "percentage": 75.25,
      "correctAnswers": 78,
      "wrongAnswers": 22,
      "unanswered": 0,
      "negativeMarks": 5.5,
      "timeSpent": 6847,
      "rank": 156,
      "percentile": 84.5,
      "isPassed": true,
      "passingMarks": 50
    }
  }
}
```

---

## 🔧 Admin APIs

### 1. Get Exam Categories
```http
GET /api/admin/test-management/categories?level=0&include_stats=true
Authorization: Bearer <admin-token>
```

### 2. Create Exam Category
```http
POST /api/admin/test-management/categories
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "name": "Bank Exams",
  "name_gujarati": "બેંક પરીક્ષાઓ",
  "description": "Banking sector competitive exams",
  "hierarchy_level": 1,
  "parent_id": 1,
  "display_order": 5,
  "color_code": "#3b82f6"
}
```

### 3. Create Test Series
```http
POST /api/admin/test-management/series
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "Banking Aptitude Test Series",
  "title_gujarati": "બેંકિંગ એપ્ટિટ્યુડ ટેસ્ટ સિરીઝ",
  "description": "Comprehensive banking aptitude preparation",
  "category_id": 15,
  "exam_type_id": 2,
  "price": 799.00,
  "currency": "INR",
  "is_free": false,
  "free_test_count": 3,
  "difficulty_level": "intermediate",
  "access_duration_days": 180,
  "supports_pause_resume": true,
  "supports_multilanguage": true,
  "has_negative_marking": true,
  "negative_marks": 0.25,
  "instructions": "Complete test series for banking exams...",
  "slug": "banking-aptitude-test-series"
}
```

### 4. Create Test
```http
POST /api/admin/test-management/series/1/tests
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "Banking Aptitude - Test 1",
  "title_gujarati": "બેંકિંગ એપ્ટિટ્યુડ - ટેસ્ટ 1",
  "description": "Quantitative aptitude and reasoning",
  "test_type": "mock",
  "duration_minutes": 90,
  "total_marks": 100,
  "passing_marks": 60,
  "is_free": true,
  "allows_pause": true,
  "has_negative_marking": true,
  "negative_marks": 0.25,
  "marks_per_question": 1,
  "show_results_immediately": true,
  "instructions": "Answer all questions within time limit..."
}
```

### 5. Create Question
```http
POST /api/admin/test-management/tests/1/questions
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "question": "If a train travels at 60 km/h for 2 hours, what distance does it cover?",
  "question_gujarati": "જો ટ્રેન 2 કલાક માટે 60 કિમી/કલાકની ઝડપે મુસાફરી કરે, તો તે કેટલું અંતર કાપે?",
  "options": [
    {"key": "A", "text": "100 km"},
    {"key": "B", "text": "120 km"},
    {"key": "C", "text": "140 km"},
    {"key": "D", "text": "160 km"}
  ],
  "options_gujarati": [
    {"key": "A", "text": "100 કિમી"},
    {"key": "B", "text": "120 કિમી"},
    {"key": "C", "text": "140 કિમી"},
    {"key": "D", "text": "160 કિમી"}
  ],
  "correct_option": "B",
  "explanation": "Distance = Speed × Time = 60 × 2 = 120 km",
  "explanation_gujarati": "અંતર = ઝડપ × સમય = 60 × 2 = 120 કિમી",
  "subject": "Mathematics",
  "topic": "Speed and Distance",
  "difficulty": "medium",
  "marks": 1,
  "display_order": 1
}
```

---

## 🔐 Authentication

All protected routes require authentication:

**Student Routes**: Bearer token from user login
```http
Authorization: Bearer <user-jwt-token>
```

**Admin Routes**: Admin authentication token
```http
Authorization: Bearer <admin-jwt-token>
```

---

## 📊 Data Models

### Test Session States
- `not_started` - Session created but not started
- `in_progress` - Test is currently active
- `paused` - Test is paused (can be resumed)
- `completed` - Test finished successfully  
- `timed_out` - Test time expired
- `abandoned` - Session abandoned by user
- `terminated` - Session terminated by admin

### Question Difficulty Levels
- `easy` - Basic level questions
- `medium` - Intermediate level
- `hard` - Advanced level
- `expert` - Expert level questions

### Test Types
- `practice` - Practice tests
- `mock` - Mock examinations
- `assessment` - Assessment tests
- `sample` - Sample tests
- `full_length` - Full-length tests

---

## 🚨 Error Handling

### Common Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad request/validation error
- `401` - Unauthorized
- `403` - Forbidden/Access denied
- `404` - Resource not found
- `500` - Internal server error

---

## 🌍 Multilingual Support

The system supports both English and Gujarati:

- Questions can have `question` (English) and `question_gujarati`
- Options can have `options` (English) and `options_gujarati`  
- Explanations available in both languages
- Test titles and descriptions in both languages
- Language preference stored per session

---

## 📈 Analytics Available

### Test Series Analytics
- Total enrollments
- Average completion rate
- Performance distribution
- Popular tests

### Test Analytics  
- Attempt statistics
- Average scores
- Time distribution
- Question-wise performance

### Question Analytics
- Accuracy rates
- Time spent per question
- Difficulty analysis
- Option distribution

This comprehensive API system provides everything needed for a full-featured educational test platform with hierarchical navigation, multilingual support, and advanced session management!