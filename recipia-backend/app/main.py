from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app import auth
from app.routes import recipes, ai

app = FastAPI(
    title="Recipia API",
    description="Recipe Management System with AI Assistant",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(recipes.router)
app.include_router(ai.router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Recipia API",
        "docs": "/docs",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)