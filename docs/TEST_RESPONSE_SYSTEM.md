# Test Response Storage and Leaderboard System

## Overview

This system provides comprehensive test response storage, scoring calculation, and leaderboard functionality for the Mocktail Academy platform. It handles test sessions, answer storage, score calculations, rankings, and various leaderboard views.

## Database Structure

### Tables Created

1. **`leaderboard_entries`** - Stores calculated results and rankings for completed tests
   - Links to users, tests, test sessions, and test series
   - Stores scores, percentages, rankings, and percentiles
   - Supports category-based filtering

2. **Existing Tables Enhanced**
   - `test_sessions` - Already exists, stores active test sessions
   - `user_answers` - Already exists, stores individual question responses

## API Endpoints

### Base URL: `/api/test-response`

### Test Session Management

#### 1. Start Test Session
```http
POST /session/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "test_id": 123,
  "user_id": "user-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test session started successfully",
  "data": {
    "session": {
      "id": "session-uuid",
      "user_id": "user-uuid",
      "test_id": 123,
      "started_at": "2025-08-27T10:00:00Z",
      "total_questions": 50,
      "remaining_time_seconds": 3600,
      "status": "active"
    },
    "test": {
      "id": 123,
      "name": "Sample Test",
      "duration_minutes": 60,
      "total_questions": 50,
      "instructions": "Test instructions here"
    }
  }
}
```

#### 2. Save Answer
```http
POST /session/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "test_session_id": "session-uuid",
  "question_id": 456,
  "selected_option": "A",
  "time_spent": 45,
  "is_flagged": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Answer saved successfully",
  "data": {
    "user_answer": {
      "id": 789,
      "selected_option": "A",
      "is_correct": true,
      "time_spent": 45,
      "is_flagged": false
    },
    "is_correct": true
  }
}
```

#### 3. Submit Test
```http
POST /session/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "test_session_id": "session-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "session": {
      "id": "session-uuid",
      "is_completed": true,
      "is_submitted": true,
      "completed_at": "2025-08-27T11:00:00Z",
      "calculated_score": 85.50,
      "total_correct": 42,
      "total_wrong": 6,
      "total_unanswered": 2
    },
    "results": {
      "totalQuestions": 50,
      "correctAnswers": 42,
      "wrongAnswers": 6,
      "unanswered": 2,
      "finalScore": 85.50,
      "percentage": 85.50,
      "timeTakenSeconds": 3240
    }
  }
}
```

#### 4. Get Test Results
```http
GET /session/{sessionId}/results
Authorization: Bearer <token>
```

### Leaderboard APIs

#### 1. Test-Specific Leaderboard
```http
GET /leaderboard/test/{test_id}?page=1&limit=50&user_id={user_uuid}
```

**Response:**
```json
{
  "success": true,
  "message": "Test leaderboard retrieved successfully",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user": {
          "uuid": "user-uuid",
          "username": "student1",
          "fullName": "John Doe",
          "avatarUrl": "https://..."
        },
        "score": 95.50,
        "percentage": 95.50,
        "percentile": 98.5,
        "time_taken_seconds": 2890,
        "completion_date": "2025-08-27T11:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalEntries": 247,
      "limit": 50
    },
    "userRank": {
      "rank": 15,
      "score": 78.25,
      "percentage": 78.25,
      "percentile": 75.3
    }
  }
}
```

#### 2. Test Series Leaderboard
```http
GET /leaderboard/series/{test_series_id}?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user_id": "user-uuid",
        "username": "student1",
        "fullName": "John Doe",
        "tests_taken": 8,
        "avg_score": 89.25,
        "avg_percentage": 89.25,
        "total_score": 714.00,
        "last_test_date": "2025-08-27T11:00:00Z"
      }
    ]
  }
}
```

#### 3. Overall Leaderboard
```http
GET /leaderboard/overall?timeframe=week&page=1&limit=50
```

**Timeframe options:** `today`, `week`, `month`, `all`

#### 4. Category Leaderboard
```http
GET /leaderboard/category/{category_id}?page=1&limit=50
```

#### 5. User Test History
```http
GET /history/user/{user_id}?page=1&limit=20&test_series_id={series_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": 123,
        "score": 85.50,
        "percentage": 85.50,
        "rank": 15,
        "percentile": 75.3,
        "completion_date": "2025-08-27T11:00:00Z",
        "test": {
          "id": 456,
          "name": "Math Test 1",
          "testSeries": {
            "id": 789,
            "name": "JEE Preparation"
          }
        }
      }
    ],
    "statistics": {
      "total_tests": 25,
      "avg_score": 82.35,
      "avg_percentage": 82.35,
      "best_score": 95.50,
      "worst_score": 65.25,
      "avg_rank": 18,
      "best_rank": 3
    }
  }
}
```

### Analytics APIs

#### Test Analytics (Admin)
```http
GET /analytics/test/{test_id}
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "test": {
      "id": 123,
      "name": "Sample Test",
      "duration_minutes": 60
    },
    "analytics": {
      "total_attempts": 247,
      "avg_score": 76.83,
      "avg_percentage": 76.83,
      "highest_score": 98.50,
      "lowest_score": 23.75,
      "avg_time_taken_minutes": 52,
      "avg_correct": 38,
      "avg_wrong": 9,
      "avg_unanswered": 3
    },
    "score_distribution": [
      { "score_range": "90-100%", "count": 25 },
      { "score_range": "80-89%", "count": 67 },
      { "score_range": "70-79%", "count": 89 },
      { "score_range": "60-69%", "count": 45 },
      { "score_range": "50-59%", "count": 15 },
      { "score_range": "40-49%", "count": 4 },
      { "score_range": "30-39%", "count": 2 },
      { "score_range": "0-29%", "count": 0 }
    ]
  }
}
```

## Features

### 1. Comprehensive Test Session Management
- **Session Creation**: Start new test sessions with proper validation
- **Real-time Answer Storage**: Save answers as users progress through questions
- **Session State Management**: Track visited, answered, flagged questions
- **Time Tracking**: Monitor time spent per question and overall test time

### 2. Advanced Scoring System
- **Automatic Score Calculation**: Calculate scores with negative marking support
- **Multiple Metrics**: Track correct, wrong, unanswered, and flagged questions
- **Percentage Calculation**: Provide percentage scores based on total marks
- **Time-based Scoring**: Consider time taken for tie-breaking in rankings

### 3. Multi-Level Leaderboards
- **Test-specific Rankings**: Individual test leaderboards with detailed metrics
- **Series Aggregation**: Combined rankings across test series
- **Category-based**: Filter rankings by subject categories
- **Overall Performance**: Global rankings with timeframe filters
- **Percentile Calculation**: Show user performance relative to peers

### 4. Ranking Algorithm
Rankings are calculated using multiple criteria in order:
1. **Primary**: Total score (higher is better)
2. **Secondary**: Time taken (lower is better for same score)
3. **Tertiary**: Completion date (earlier is better for tie-breaking)

### 5. Analytics and Insights
- **Test Performance Metrics**: Average scores, attempt counts, time analysis
- **Score Distribution**: Histogram of performance ranges
- **User Progress Tracking**: Historical performance and trends
- **Comparative Analysis**: Percentile rankings and peer comparisons

## Usage Examples

### Frontend Integration

#### Starting a Test
```javascript
// Start test session
const response = await fetch('/api/test-response/session/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    test_id: testId,
    user_id: userId
  })
});

const { data } = await response.json();
const sessionId = data.session.id;
```

#### Saving Answers
```javascript
// Save answer when user selects option
const saveAnswer = async (questionId, selectedOption, timeSpent) => {
  await fetch('/api/test-response/session/answer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      test_session_id: sessionId,
      question_id: questionId,
      selected_option: selectedOption,
      time_spent: timeSpent,
      is_flagged: false
    })
  });
};
```

#### Submitting Test
```javascript
// Submit test when user finishes
const submitTest = async () => {
  const response = await fetch('/api/test-response/session/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      test_session_id: sessionId
    })
  });

  const { data } = await response.json();
  // Show results and redirect to leaderboard
  return data;
};
```

#### Loading Leaderboard
```javascript
// Get test leaderboard
const loadLeaderboard = async (testId, page = 1) => {
  const response = await fetch(
    `/api/test-response/leaderboard/test/${testId}?page=${page}&user_id=${userId}`
  );
  const { data } = await response.json();
  return data;
};
```

## Database Schema

### leaderboard_entries
```sql
CREATE TABLE leaderboard_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  test_id INT NOT NULL,
  test_session_id CHAR(36) NOT NULL,
  test_series_id INT NULL,
  category_id INT NULL,
  score DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL DEFAULT 0,
  wrong_answers INT NOT NULL DEFAULT 0,
  unanswered INT NOT NULL DEFAULT 0,
  time_taken_seconds INT NOT NULL,
  rank INT NULL,
  percentile DECIMAL(5,2) NULL,
  completion_date DATETIME NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_test_id (test_id),
  INDEX idx_test_series_id (test_series_id),
  INDEX idx_category_id (category_id),
  INDEX idx_score_date (score, completion_date),
  INDEX idx_rank (rank)
);
```

## Error Handling

The system includes comprehensive error handling:

- **Validation Errors**: Missing required fields, invalid data types
- **Authentication Errors**: Invalid or expired tokens
- **Business Logic Errors**: Attempting to start duplicate sessions, submitting inactive sessions
- **Database Errors**: Connection issues, constraint violations
- **Not Found Errors**: Non-existent tests, sessions, or users

All errors return standardized JSON responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (development only)"
}
```

## Performance Considerations

1. **Database Indexes**: All frequently queried fields are indexed
2. **Pagination**: All list endpoints support pagination
3. **Query Optimization**: Complex leaderboard queries use raw SQL for performance
4. **Caching Strategy**: Consider implementing Redis caching for frequently accessed leaderboards
5. **Background Jobs**: Rank calculations can be moved to background processing for large datasets

## Security Features

1. **JWT Authentication**: All user-specific endpoints require valid tokens
2. **User Authorization**: Users can only access their own test sessions and history
3. **Admin Endpoints**: Analytics endpoints require admin privileges
4. **Data Validation**: All inputs are validated and sanitized
5. **SQL Injection Protection**: Uses parameterized queries and Sequelize ORM

This system provides a complete solution for managing test responses, calculating scores, and displaying leaderboards with comprehensive analytics and performance tracking capabilities.