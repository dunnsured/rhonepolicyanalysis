"""
Rhône Risk Policy Analysis API
FastAPI microservice for automated cyber insurance policy analysis
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from routes import webhook, analysis
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting Rhone Risk Policy Analysis API")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Anthropic API configured: {'Yes' if settings.ANTHROPIC_API_KEY else 'No'}")
    logger.info(f"Supabase configured: {'Yes' if settings.SUPABASE_URL else 'No'}")
    logger.info(f"Webhook secret configured: {'Yes' if settings.WEBHOOK_SECRET else 'No'}")

    # Create required directories
    os.makedirs("temp", exist_ok=True)
    os.makedirs("reports", exist_ok=True)

    yield

    logger.info("Shutting down Policy Analysis API")


app = FastAPI(
    title="Rhone Risk Policy Analysis API",
    description="""
    Automated cyber insurance policy analysis microservice.

    ## Features
    - Webhook integration for policy upload notifications
    - PDF text extraction and parsing
    - Claude-powered policy analysis using Rhone Risk's proprietary scoring methodology
    - Branded PDF report generation
    - Report storage in Supabase Storage
    - HMAC-signed webhook callbacks
    - Retry logic with exponential backoff

    ## Integration
    This service is designed to integrate with your existing SaaS platform via webhooks.
    See the /docs endpoint for full API documentation.
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request body size limit middleware (50MB max for PDF uploads)
MAX_BODY_SIZE = 50 * 1024 * 1024  # 50MB


@app.middleware("http")
async def limit_request_body(request: Request, call_next):
    """Reject requests with body larger than MAX_BODY_SIZE"""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": f"Request body too large. Maximum size is {MAX_BODY_SIZE // (1024*1024)}MB"}
        )
    return await call_next(request)


# Include routers
app.include_router(webhook.router, prefix="/webhook", tags=["Webhooks"])
app.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API info"""
    return {
        "service": "Rhone Risk Policy Analysis API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
        "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY),
        "environment": settings.ENVIRONMENT,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
