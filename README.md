# Job MNG System

## Overview
Job MNG System is a full-stack job board platform where users can browse jobs and submit applications, while admins can manage listings, review applications, and run AI-assisted screening.

## Tech Stack
- Frontend: React + Redux Toolkit
- Backend: Node.js + Express
- Database: SQLite
- Authentication: JWT
- Testing: Jest, Supertest, React Testing Library

## Features
- User registration and login
- Admin and user role-based access
- Public job listings and job details
- Job draft creation and submission
- Admin job and application management
- AI-assisted application screening with fallback keyword mode

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
```

## Backend

Install dependencies and start the API:

```bash
cd backend
npm install
npm start
```

## Frontend

Install dependencies and start the Vite app:

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file inside the backend directory based on `.env.example`.

### Example

```env
PORT=5050
DATABASE_URL=./job-mng-system.sqlite
JWT_SECRET=job_mng_system_demo_secret
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

### Frontend Example

```env
VITE_API_BASE_URL=http://localhost:5050/api
```

## Docker

The project includes Docker support for both frontend and backend through `docker-compose.yml`.

### Run with Docker

```bash
docker compose up --build
```

App URLs::

- backend on `http://localhost:5050`
- frontend on `http://localhost:5173`

### Stop Docker Services

```bash
docker compose down
```

### Notes

- The backend container mounts the local `backend` folder, so the SQLite database remains available in the project during development.
- The frontend container runs the Vite development server with host exposure enabled for browser access.
- If you update environment values, restart the containers so the changes are picked up.

## Admin Test Credentials

```text
Email: admin@jobmng.local
Password: Admin123!
```

## Testing

### Backend

cd backend
npm test

### Frontend

cd frontend
npm test

## Author

Gladys Jade
