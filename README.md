# User Story to Tests Generator

A full-stack AI-powered application that automatically converts user stories into comprehensive test cases using LLM integration with Groq.

## 📋 Table of Contents

- [Project Purpose](#project-purpose)
- [Framework & Technology Stack](#framework--technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Project Structure](#project-structure)

## 🎯 Project Purpose

This framework automates the process of generating test cases from user stories. Instead of manually writing tests based on requirements, developers can:

- **Input user stories** in natural language
- **Generate structured test cases** automatically using AI (Groq LLM)
- **Create Jira tickets** directly from the generated tests
- **Ensure test coverage** by deriving tests from actual requirements

### Key Benefits

- **Time Saving**: Automatically generate test cases from user stories
- **Consistency**: Maintain uniform test structure across projects
- **Traceability**: Link tests directly to user story requirements
- **Integration**: Seamlessly integrate with Jira for ticket management
- **AI-Powered**: Uses Groq's LLM for intelligent test generation

## 🛠️ Framework & Technology Stack

### Backend

- **Node.js** with **Express.js** - REST API server
- **TypeScript** - Type-safe code
- **Groq LLM API** - AI model for test generation
- **Zod** - Schema validation
- **CORS** - Cross-origin resource sharing
- **TSX** - TypeScript executor for development

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Modern CSS** - Styling

### Architecture

- **Monorepo Structure**: Backend and frontend in separate workspaces
- **REST API**: Backend exposes APIs for test generation and Jira integration
- **LLM Integration**: Groq API for intelligent test case generation
- **Environment Configuration**: `.env` file for sensitive data

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Groq API Key** - Get it from [Groq Console](https://console.groq.com)
- **Jira Account** (optional) - For Jira integration features
- **Jira API Token** - Get it from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd user-story-to-tests
```

### 2. Install Dependencies

```bash
npm install
# OR
npm run install:all
```

This will install dependencies for both backend and frontend workspaces.

## ⚙️ Configuration

### 1. Create `.env` File

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=8080
CORS_ORIGIN=http://localhost:5173

# Groq LLM Configuration
groq_API_BASE=https://api.groq.com/openai/v1
groq_API_KEY=your_groq_api_key_here
groq_MODEL=openai/gpt-oss-120b

# Jira Configuration (Optional)
JIRA_BASE=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token_here
```

### 2. Get Required API Keys

**Groq API Key:**
- Visit [Groq Console](https://console.groq.com)
- Sign up or log in
- Create a new API key
- Copy and paste into `groq_API_KEY`

**Jira API Token:**
- Visit [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
- Click "Create API token"
- Copy and paste into `JIRA_API_TOKEN`

## 🎮 Running the Project

### Option 1: Run Both Frontend and Backend (Recommended)

```bash
npm run dev
```

This starts both services concurrently:
- **Backend**: http://localhost:8080
- **Frontend**: http://localhost:5173

### Option 2: Run Backend Only

```bash
cd backend
npm run dev
```

The backend server runs on `http://localhost:8080`

### Option 3: Run Frontend Only

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173`

### Production Build

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

## 📡 API Endpoints

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-01-28T10:30:00.000Z"
}
```

### Generate Tests from User Story

```http
POST /api/generate-tests
Content-Type: application/json

{
  "userStory": "As a user, I want to login with email and password so that I can access my account",
  "acceptanceCriteria": [
    "User can enter email and password",
    "System validates credentials",
    "User is redirected to dashboard on success"
  ],
  "projectContext": "Authentication module for web application"
}
```

**Response:**
```json
{
  "testCases": [
    {
      "id": "TEST-001",
      "name": "Valid login with correct credentials",
      "description": "Verify user can login with valid email and password",
      "steps": [
        {
          "step": 1,
          "action": "Navigate to login page",
          "expectedResult": "Login form is displayed"
        },
        {
          "step": 2,
          "action": "Enter valid email and password",
          "expectedResult": "Email and password fields are populated"
        },
        {
          "step": 3,
          "action": "Click login button",
          "expectedResult": "User is redirected to dashboard"
        }
      ],
      "priority": "High",
      "estimatedTime": "5 minutes"
    }
  ],
  "model": "openai/gpt-oss-120b",
  "promptTokens": 250,
  "completionTokens": 450
}
```

### Create Jira Issue with Tests

```http
POST /api/jira/create-issue
Content-Type: application/json

{
  "projectKey": "PROJ",
  "summary": "Login functionality tests",
  "description": "Test cases for login feature",
  "issueType": "Test",
  "testCases": [...]
}
```

## 💡 Usage Examples

### Example 1: Generate Tests for a Shopping Feature

**Input User Story:**
```
As an e-commerce customer, I want to add items to my shopping cart so that I can purchase them later.
```

**Acceptance Criteria:**
- User can see "Add to Cart" button on product page
- Clicking button adds item to cart
- Cart count updates instantly
- User can view cart contents

**Generated Output:**
The system will generate comprehensive test cases covering:
- Positive scenarios (adding valid items)
- Edge cases (adding duplicate items, max quantity)
- Error scenarios (out of stock items)

### Example 2: Full Integration Workflow

```bash
# 1. Start the application
npm run dev

# 2. Open frontend at http://localhost:5173

# 3. Enter your user story in the UI

# 4. Click "Generate Tests"

# 5. Review generated test cases

# 6. (Optional) Create Jira issue with the test cases
```

### Example 3: API Call from JavaScript

```javascript
const userStory = "As a user, I want to reset my password via email";
const acceptanceCriteria = [
  "User receives password reset email",
  "Link in email is valid for 24 hours",
  "User can set new password"
];

const response = await fetch('http://localhost:8080/api/generate-tests', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userStory,
    acceptanceCriteria,
    projectContext: "User authentication system"
  })
});

const testCases = await response.json();
console.log(testCases);
```

## 📁 Project Structure

```
user-story-to-tests/
├── backend/                          # Express.js API server
│   ├── src/
│   │   ├── server.ts                # Main server file
│   │   ├── prompt.ts                # LLM prompt templates
│   │   ├── schemas.ts               # Zod validation schemas
│   │   ├── llm/
│   │   │   └── groqClient.ts        # Groq API client
│   │   ├── routes/
│   │   │   ├── generate.ts          # Test generation endpoint
│   │   │   └── jira.ts              # Jira integration endpoint
│   │   └── services/
│   │       └── jiraService.ts       # Jira API service
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                         # React + Vite UI
│   ├── src/
│   │   ├── App.tsx                  # Main component
│   │   ├── api.ts                   # API client
│   │   ├── main.tsx                 # Entry point
│   │   ├── types.ts                 # TypeScript types
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .env                              # Environment variables
├── package.json                      # Root workspace configuration
└── README.md                         # This file
```

## 🔧 Troubleshooting

### Issue: "Cannot find module dotenv"

**Solution:** Run `npm install` in the backend directory:
```bash
cd backend
npm install
```

### Issue: Groq API Key Error

**Solution:** Verify your API key is correct in `.env`:
```env
groq_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Issue: CORS Error

**Solution:** Ensure `CORS_ORIGIN` matches your frontend URL:
```env
CORS_ORIGIN=http://localhost:5173
```

### Issue: Frontend can't connect to Backend

**Solution:** Verify backend is running on correct port:
```bash
# Check if port 8080 is available
# Or change PORT in .env
PORT=3000
```

## 📝 Notes

- Keep your `.env` file private and never commit it to version control
- The `.gitignore` file should exclude `.env`
- Generated test cases can be exported to various formats (JSON, CSV, etc.)
- All API responses include token usage metrics for cost tracking

## 🤝 Contributing

Feel free to extend this project with:
- Additional LLM provider support
- More test case formats
- Enhanced Jira integration
- Custom validation rules

## 📄 License

[Add your license here]

---

**Happy Testing! 🚀**
