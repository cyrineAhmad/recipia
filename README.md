🍳 Recipia

Recipia is an AI-powered recipe management platform that helps users discover, create, and organize recipes with intelligent assistance.

🔗 Live App:  
https://recipia-sepia.vercel.app

Key Features  

🤖 AI-Powered Assistance

Conversational AI assistant (Groq – Llama 3.3)  
Generate full recipes from natural prompts  
Smart suggestions based on available ingredients  
Improve existing recipes (healthier, simpler, clearer)  

📚 Recipe Management

Advanced search & filtering (name, cuisine, ingredients, prep time)  
Personal tracking (favorite, to-cook, cooked)  
Admin dashboard with full CRUD management  

🤝 Collaboration & Sharing

Share recipes with specific users (email-based)  
Public shareable links with optional expiration  
Real-time share notifications  
Community recipe suggestions for admin review  

🛠 Tech Stack

Frontend: React + TypeScript + Vite  
Backend: FastAPI (Python)  
Database & Auth: Supabase  
AI Integration: Groq API  

🚀 Run Locally  
1️⃣ Backend  
cd recipia-backend  
python -m venv venv  
source venv/bin/activate  # Windows: venv\Scripts\activate  
pip install -r requirements.txt  
uvicorn app.main:app --reload  

Backend runs on:
http://localhost:8000

2️⃣ Frontend  
cd recipia-frontend  
npm install  
npm run dev  

Frontend runs on:
http://localhost:5173
