# HireSense

HireSense is an AI-powered interview preparation platform that helps users turn a job description and profile details into a practical, role-specific preparation plan. It combines resume parsing, structured interview report generation, skill-gap analysis, behavioral and technical question sets, and a tailored resume PDF flow in one full-stack application.

The goal is simple: help candidates prepare faster, with clearer direction and better alignment to the role they want.

## Overview

HireSense is built as a two-part application:

| Layer | Description |
| --- | --- |
| Frontend | A React + Vite client for authentication, report generation, report review, recent reports, and resume PDF actions |
| Backend | An Express + MongoDB API that handles auth, report generation, PDF parsing, AI integration, and report storage |

## Core Functionalities

| Feature | What It Does |
| --- | --- |
| User authentication | Lets users register, log in, stay signed in with cookies, and access only their own reports |
| Interview report generation | Creates a structured report from a job description plus resume PDF and/or self description |
| Match score | Generates a role fit score to help users quickly understand alignment |
| Technical questions | Produces targeted technical interview prompts with intention and model answer guidance |
| Behavioral questions | Produces behavioral prompts designed for STAR-style preparation |
| Skill-gap analysis | Highlights the most important missing or weaker areas for the target role |
| Preparation roadmap | Builds a day-by-day preparation plan with focused tasks |
| Recent reports | Shows a user’s latest reports and allows revisiting or deleting them |
| Resume PDF generation | Generates a cleaner, role-aligned resume PDF based on the created report |
| Low-quality response protection | Blocks weak or malformed AI output from being shown as a fake-good report |
| Mobile-responsive UI | Includes responsive loaders, report views, auth screens, and recent-report layouts |

## How It Works

1. A user registers or logs in.
2. The user pastes a job description and adds either a resume PDF, a self description, or both.
3. The backend extracts profile context and sends a structured prompt to the AI model.
4. The backend validates and normalizes the AI response before saving it.
5. The frontend shows the report in sections: technical questions, behavioral questions, roadmap, score, and skill gaps.
6. The user can return to recent reports or generate a tailored resume PDF from a report.

## Tech Stack

| Category | Tools |
| --- | --- |
| Frontend | React, Vite, React Router, Axios, SCSS |
| Backend | Node.js, Express, Cookie Parser, Multer |
| Database | MongoDB, Mongoose |
| AI | Google GenAI / Gemini |
| PDF Handling | `pdf-parse`, `puppeteer` |
| Validation | Zod |
| Auth | JWT + HTTP-only cookies |

## Project Structure

```text
Gen Ai Full Stack/
|-- frontend/
|   |-- public/
|   |-- src/
|   |-- package.json
|   |-- vercel.json
|
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middlewaers/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- services/
|   |-- server.js
|   |-- package.json
|
|-- README.md
```

## Main API Routes

### Auth

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Log in a user |
| `GET` | `/api/auth/logout` | Log out the current user |
| `GET` | `/api/auth/get-me` | Get the currently authenticated user |

### Interview Reports

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/interview` | Generate a new interview report |
| `GET` | `/api/interview` | Fetch all reports for the logged-in user |
| `GET` | `/api/interview/report/:interviewId` | Fetch one report by ID |
| `DELETE` | `/api/interview/report/:interviewId` | Delete a saved report |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | Generate a tailored resume PDF |
| `GET` | `/api/health` | Health check for deployments |

## Local Setup

### Prerequisites

| Requirement | Recommended Version |
| --- | --- |
| Node.js | 20+ |
| npm | Latest stable |
| MongoDB Atlas account | Any working cluster |
| Google GenAI API key | Required |

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "Gen Ai Full Stack"
```

### 2. Install Dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
npm install
```

## Environment Variables

### Backend `.env`

Create `backend/.env` using [backend/.env.example](E:/Gen%20Ai%20Full%20Stack/backend/.env.example).

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `PORT` | Yes | `3000` | API server port |
| `NODE_ENV` | Yes | `development` or `production` | Runtime mode |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed frontend origin for CORS and cookies |
| `MONGO_URI` | Yes | `mongodb+srv://...` | MongoDB connection string |
| `JWT_SECRET` | Yes | `your-long-random-secret` | Signs auth tokens |
| `GOOGLE_GENAI_API_KEY` | Yes | `AIza...` | AI generation key |

Example:

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_GENAI_API_KEY=replace-with-your-google-genai-api-key
```

### Frontend `.env`

Create `frontend/.env` using [frontend/.env.example](E:/Gen%20Ai%20Full%20Stack/frontend/.env.example).

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | Yes | `http://localhost:3000` | Base URL for the backend API |

Example:

```env
VITE_API_URL=http://localhost:3000
```

## Running the App Locally

### Start the Backend

```bash
cd backend
npm run dev
```

The backend will run on:

```text
http://localhost:3000
```

### Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

## Production Build Commands

| App | Command |
| --- | --- |
| Frontend | `npm run build` |
| Backend | `npm start` |

## Deployment Notes

### Recommended Setup

| Part | Recommended Host |
| --- | --- |
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |

This setup is recommended because the backend handles PDF uploads and resume PDF generation, which are usually more reliable on a long-running backend service than on stricter serverless limits.

### Frontend Deployment

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Env Variable | `VITE_API_URL=https://your-backend-url` |

### Backend Deployment

| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check | `/api/health` |

Backend production env values:

```env
NODE_ENV=production
PORT=3000
CLIENT_URL=https://your-frontend-url
MONGO_URI=your-mongodb-atlas-connection-string
JWT_SECRET=your-long-random-secret
GOOGLE_GENAI_API_KEY=your-google-genai-api-key
```

## UX Highlights

| Area | Notes |
| --- | --- |
| Home page | Premium hero section, guided form hierarchy, loading state, recent reports |
| Interview page | Section navigation, responsive layout, skill-gap summary, roadmap, animated accordions |
| Auth pages | Redesigned login/register flow with branded loading states |
| Error handling | Clear UI for missing inputs, failed fetches, low-quality AI output, and service unavailability |

## Important Behavior Notes

| Situation | App Behavior |
| --- | --- |
| Match score below 50 | Report details are hidden and the user sees guidance instead |
| AI returns poor-quality output | The backend rejects it instead of saving placeholder junk |
| Old malformed reports | The frontend tries to normalize and display them safely |
| Resume PDF generation | Uses AI-generated HTML + Puppeteer PDF export |


## Future Improvement Ideas

| Area | Possible Next Step |
| --- | --- |
| Branding | Add the new logo across navbar, auth, and homepage |
| Monitoring | Add logging and runtime monitoring for API failures |
| Testing | Add backend route tests and frontend component tests |
| Analytics | Track report generation success rate and resume PDF usage |
| Auth | Add password reset and stronger session controls |

=======

## Known Considerations

| Topic | Note |
| --- | --- |
| AI output | AI can make mistakes, so results should be reviewed before being relied on |
| Secrets | Real production secrets should never be committed to the repo |
| File uploads | Large PDFs may need host-specific review depending on deployment limits |

## Credits

Built as a full-stack AI interview preparation product using React, Express, MongoDB, and Google GenAI.

