from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, applicants, applications

app = FastAPI(
    title="Applicant Portal API",
    version="0.1.0",
    docs_url="/docs" if settings.env == "development" else None,
    redoc_url=None,
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

@app.get("/health")
def health_check():
    return {"status": "ok", "env": settings.env}