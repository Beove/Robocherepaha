from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.middleware import limiter
from app.routers import auth, applicants, applications, documents, admin, ai, ws

app = FastAPI(
    title="Applicant Portal API",
    version="0.1.0",
    docs_url="/docs" if settings.env == "development" else None,
    redoc_url=None,
)

# Rate limiting
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Слишком много запросов. Попробуйте позже."}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(applicants.router)
app.include_router(applications.router)
app.include_router(documents.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(ws.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "env": settings.env}