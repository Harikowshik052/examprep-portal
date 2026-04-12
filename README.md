# Exam Prep Web App

A prototype web application for students of Vishnu college to access notes and previous question papers.

## Project Structure

```
college_data/
  frontend/   - React + Vite app
  backend/    - Node.js + Express (OTP email only)
  data/       - Static PDF files organized by year/semester/subject
```

## Setup

### Backend
```bash
cd backend
cp .env.example .env
# Fill in EMAIL_USER, EMAIL_PASS (Gmail App Password), JWT_SECRET
npm install
npm start
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Fill in VITE_BACKEND_URL and VITE_GEMINI_API_KEY
npm install
npm run dev
```

## Data Folder Structure

Place your PDF files in the `frontend/public/data/` folder following this structure:

```
public/
  data/
    II_year/
      II_semester/
        java/
          notes/
            file.pdf
          previous_question_papers/
            file.pdf
    data-index.json   ← required manifest file
```

Then update `frontend/public/data/data-index.json` with the file manifest.

## Deployment (Vercel)

- Frontend: Deploy `frontend/` as a Vite project on Vercel
- Backend: Deploy `backend/` as a Node.js project on Vercel (serverless)

See `vercel.json` in each folder for configuration.
