from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.application import Application, ApplicationStatus
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user, get_current_operator
from app.middleware import limiter
import json

router = APIRouter(prefix="/applications", tags=["applications"])

class ApplicationCreate(BaseModel):
    direction: str
    education_level: str

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    direction: str
    education_level: str
    status: str
    comment: Optional[str] = None

    class Config:
        from_attributes = True

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    comment: Optional[str] = None

@router.post("", response_model=ApplicationResponse, status_code=201)
@limiter.limit("10/minute")
def create_application(
    request: Request,
    data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = Application(
        user_id=current_user.id,
        direction=data.direction,
        education_level=data.education_level,
        status=ApplicationStatus.draft
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    log = AuditLog(
        user_id=current_user.id,
        event_type="APPLICATION_CREATED",
        object_type="application",
        object_id=application.id,
        ip_address=request.client.host,
        details=json.dumps({"direction": data.direction})
    )
    db.add(log)
    db.commit()
    return application

@router.get("/me", response_model=List[ApplicationResponse])
@limiter.limit("30/minute")
def get_my_applications(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Application).filter(
        Application.user_id == current_user.id
    ).all()

@router.get("/{application_id}", response_model=ApplicationResponse)
@limiter.limit("30/minute")
def get_application(
    request: Request,
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.id == application_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == UserRole.applicant and application.user_id != current_user.id:
        log = AuditLog(
            user_id=current_user.id,
            event_type="IDOR_ATTEMPT",
            object_type="application",
            object_id=application_id,
            ip_address=request.client.host,
            details=json.dumps({
                "attempted_application_id": application_id,
                "owner_id": application.user_id
            })
        )
        db.add(log)
        db.commit()
        raise HTTPException(status_code=403, detail="Access denied")

    return application

@router.put("/{application_id}/status", response_model=ApplicationResponse)
@limiter.limit("10/minute")
def update_application_status(
    request: Request,
    application_id: int,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.id == application_id
    ).first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = application.status
    application.status = data.status
    application.comment = data.comment
    db.commit()
    db.refresh(application)

    log = AuditLog(
        user_id=current_user.id,
        event_type="APPLICATION_STATUS_CHANGED",
        object_type="application",
        object_id=application.id,
        ip_address=request.client.host,
        details=json.dumps({
            "old_status": old_status,
            "new_status": data.status,
            "comment": data.comment
        })
    )
    db.add(log)
    db.commit()
    return application