"""FastAPI entry point for the AI Coding Feedback Platform."""

import os

from dotenv import load_dotenv

# Load variables before project modules initialize clients or configuration.
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from limiting import limiter

app = FastAPI(
    title="AI Coding Feedback Platform",
    description="Backend API for AI-powered coding feedback and analytics",
    version="1.0.0",
)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
from routes.ai import router as ai_router
from routes.analytics import router as analytics_router

app.include_router(auth_router, prefix="/api")
app.include_router(execute_router, prefix="/api")
app.include_router(class_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


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
