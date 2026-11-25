"""FastAPI entry point for the AI Coding Feedback Platform."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from the backend directory or process environment.
load_dotenv()

app = FastAPI(
    title="AI Coding Feedback Platform",
    description="Backend API for AI-powered coding feedback and analytics",
    version="1.0.0",
)


def _allowed_origins() -> list[str]:
    """Return configured browser origins, with local development defaults."""
    configured = os.getenv("ALLOWED_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "https://codementor-ai-dev.web.app",
        "http://localhost:5173",
        "http://localhost:5500",
    ]


from routes.auth import router as auth_router
from routes.execute import router as execute_router
from routes.class_mgmt import router as class_router

app.include_router(auth_router, prefix="/api")
app.include_router(execute_router, prefix="/api")
app.include_router(class_router, prefix="/api")


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/", tags=["Health"])
async def root():
    """Basic service information."""
    return {
        "status": "running",
        "app": "AI Coding Feedback Platform",
        "version": app.version,
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health endpoint used by deployment and uptime checks."""
    return {
        "status": "healthy",
        "environment": os.getenv("APP_ENV", "development"),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "firebase_configured": bool(os.getenv("FIREBASE_PROJECT_ID")),
    }


# Keep the earlier path working while clients move to the documented API path.
@app.get("/health", tags=["Health"], include_in_schema=False)
async def legacy_health_check():
    return await health_check()
