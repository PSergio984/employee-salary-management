# Employee Salary Management

Standalone Employee Onboarding and Salary Management application with React/Vite frontend and NestJS backend backed by Prisma 7.10.1 and a dedicated Neon PostgreSQL project in Singapore (`aws-ap-southeast-1`).

## System Requirements
- Node.js >= 22 (tested with Node v26)
- npm >= 10
- PostgreSQL (Neon serverless PostgreSQL, dedicated project with isolated `development` and `test` branches)

## Project Architecture
- `backend/`: NestJS 12 + Prisma 7.10.1 (`@prisma/adapter-pg` over TCP), Express, bcrypt, cookie-parser
- `frontend/`: React 19 + Vite + Tailwind CSS + Lucide icons
- `docs/`: System documentation and reviewable ERD (`docs/ERD.md`)

## Environment Setup
Copy `.env.example` in `backend/` to `backend/.env` and supply:
- `PORT`: Backend server port (default `5050`)
- `DATABASE_URL`: Pooled connection URL for runtime
- `DIRECT_URL`: Direct connection URL for Prisma migrations
- `ADMIN_USERNAME`: Initial admin username (default `admin`)
- `ADMIN_PASSWORD`: Initial admin password
- `CLIENT_ORIGIN`: Allowed frontend origin (default `http://localhost:5173`)
- `COOKIE_SECURE`: `false` for local HTTP, `true` for production HTTPS

## Quick Start
1. Install backend dependencies and run migrations:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run db:seed
   ```
2. Start the backend:
   ```bash
   npm run start:dev
   ```
3. Install frontend dependencies and start Vite dev server:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
4. Access the application at `http://localhost:5173`.
