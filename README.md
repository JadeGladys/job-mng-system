# Job MNG System

## Overview
Job MNG System is a full-stack job board platform where users can browse job listings and apply for jobs, while admins can create and manage job posts, review applications, and use AI-assisted screening to support candidate evaluation.

## Tech Stack
- Frontend: React.js + Redux Toolkit
- Backend: Node.js + Express.js
- Database: SQLite with raw SQL
- Authentication: JWT
- Testing: Jest, Supertest, React Testing Library

## Features
- User registration and login
- Role-based access control for admin and user
- Public job listings and job details
- Admin job creation, update, and deletion
- Job application submission
- Admin application review
- AI-assisted application screening

## AI Screening
The application includes an AI-assisted screening feature that compares submitted applications against job requirements and returns:
- Match score
- Summary
- Recommendation

If no AI API key is provided, the system can still run using a fallback non-AI matching mode.

## Setup

### Clone the Repository
```bash
git clone <your-repository-url>
cd job-mng-system

## Backend

To be completed.

## Frontend

To be completed.

## Environment Variables

Create a `.env` file inside the backend directory based on `.env.example`.

### Example

```env
PORT=5050
DATABASE_URL=./job-mng-system.sqlite
JWT_SECRET=job_mng_system_demo_secret
AI_API_KEY=
```

## Admin Test Credentials

```text
Email: admin@jobmng.local
Password: Admin123!
```

## Database

The database includes the following main tables:

- `users`
- `jobs`
- `applications`

Applications also support AI-related fields such as:

- `ai_score`
- `ai_summary`
- `ai_recommendation`

## Testing

Testing will cover critical application flows including authentication, data fetching, application submission, and protected routes.

## Deployment

Deployment is optional but recommended. Environment variables should be configured through the hosting platform settings.

## Notes

This is the initial README structure. Setup instructions, scripts, testing commands, and deployment details will be completed as the project is finalized.

## Author

Gladys Jade