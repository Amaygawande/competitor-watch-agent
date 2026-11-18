# AI Competitor Watch Agent (MERN)

## Setup
1. Backend:  cd backend && npm install && cp .env.example .env   (then add GEMINI_API_KEY)
2. Frontend: cd frontend && npm install
3. Start MongoDB (local) or put your Atlas URL in MONGO_URI.
4. Run backend:  cd backend && npm start        (http://localhost:5000)
5. Run frontend: cd frontend && npm run dev     (http://localhost:5173)

Pipeline: fetch Google News RSS -> remove duplicates -> Gemini categorizes/filters -> Gemini writes brief.

## Deploy
- Database: MongoDB Atlas (free) -> copy the connection string into MONGO_URI
- Backend: Render (Root Directory: backend, Build: npm install, Start: npm start)
  env vars: MONGO_URI, GEMINI_API_KEY, GEMINI_MODEL
- Frontend: Vercel (Root Directory: frontend, Framework: Vite)
  env var: VITE_API_URL = your Render backend URL (no trailing slash)
