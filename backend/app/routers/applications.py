from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
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
    faculty: Optional[str] = None
    study_form: Optional[str] = None
    funding: Optional[str] = None

class ApplicationUpdate(BaseModel):
    direction: Optional[str] = None
    education_level: Optional[str] = None
    faculty: Optional[str] = None
    study_form: Optional[str] = None
    funding: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    direction: str
    education_level: str
    faculty: Optional[str] = None
    study_form: Optional[str] = None
    funding: Optional[str] = None
    status: str
    comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

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
        faculty=data.faculty,
        study_form=data.study_form,
        funding=data.funding,
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
        details=json.dumps({
            "direction": data.direction,
            "faculty": data.faculty,
            "study_form": data.study_form,
            "funding": data.funding,
        })
    )
    db.add(log)
    db.commit()
    return application


@router.patch("/{application_id}", response_model=ApplicationResponse)
@limiter.limit("10/minute")
def update_application(
    request: Request,
    application_id: int,
    data: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.user_id != current_user.id:
        log = AuditLog(
            user_id=current_user.id, event_type="IDOR_ATTEMPT",
            object_type="application", object_id=application_id,
            ip_address=request.client.host,
            details=json.dumps({"action": "update", "attempted_application_id": application_id, "owner_id": application.user_id})
        )
        db.add(log); db.commit()
        raise HTTPException(status_code=403, detail="Access denied")

    if application.status != ApplicationStatus.draft:
        raise HTTPException(status_code=400, detail="Only draft applications can be edited")

    if data.direction is not None: application.direction = data.direction
    if data.education_level is not None: application.education_level = data.education_level
    if data.faculty is not None: application.faculty = data.faculty
    if data.study_form is not None: application.study_form = data.study_form
    if data.funding is not None: application.funding = data.funding

    db.commit(); db.refresh(application)

    log = AuditLog(
        user_id=current_user.id, event_type="APPLICATION_UPDATED",
        object_type="application", object_id=application.id,
        ip_address=request.client.host,
        details=json.dumps({"direction": application.direction})
    )
    db.add(log); db.commit()
    return application


@router.delete("/{application_id}", status_code=204)
@limiter.limit("10/minute")
def delete_application(
    request: Request,
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.user_id != current_user.id:
        log = AuditLog(
            user_id=current_user.id, event_type="IDOR_ATTEMPT",
            object_type="application", object_id=application_id,
            ip_address=request.client.host,
            details=json.dumps({"action": "delete", "attempted_application_id": application_id, "owner_id": application.user_id})
        )
        db.add(log); db.commit()
        raise HTTPException(status_code=403, detail="Access denied")

    if application.status != ApplicationStatus.draft:
        raise HTTPException(status_code=400, detail="Only draft applications can be deleted")

    log = AuditLog(
        user_id=current_user.id, event_type="APPLICATION_DELETED",
        object_type="application", object_id=application_id,
        ip_address=request.client.host,
        details=json.dumps({"direction": application.direction})
    )
    db.add(log); db.commit()
    db.delete(application); db.commit()


@router.post("/{application_id}/submit", response_model=ApplicationResponse)
@limiter.limit("10/minute")
def submit_application(
    request: Request,
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.user_id != current_user.id:
        log = AuditLog(
            user_id=current_user.id, event_type="IDOR_ATTEMPT",
            object_type="application", object_id=application_id,
            ip_address=request.client.host,
            details=json.dumps({"action": "submit", "attempted_application_id": application_id, "owner_id": application.user_id})
        )
        db.add(log); db.commit()
        raise HTTPException(status_code=403, detail="Access denied")

    if application.status != ApplicationStatus.draft:
        raise HTTPException(status_code=400, detail=f"Cannot submit application with status '{application.status}'")

    application.status = ApplicationStatus.submitted
    db.commit(); db.refresh(application)

    log = AuditLog(
        user_id=current_user.id, event_type="APPLICATION_SUBMITTED",
        object_type="application", object_id=application.id,
        ip_address=request.client.host,
        details=json.dumps({"direction": application.direction})
    )
    db.add(log); db.commit()
    return application


@router.get("/all", response_model=List[ApplicationResponse])
@limiter.limit("30/minute")
def get_all_applications(
    request: Request,
    status: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """Все заявления — для операторов и администраторов."""
    query = db.query(Application)
    if status:
        query = query.filter(Application.status == status)
    if user_id:
        query = query.filter(Application.user_id == user_id)
    return query.order_by(Application.created_at.desc()).all()


@router.get("/me", response_model=List[ApplicationResponse])
@limiter.limit("30/minute")
def get_my_applications(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Application).filter(
        Application.user_id == current_user.id
    ).order_by(Application.created_at.desc()).all()


@router.get("/{application_id}", response_model=ApplicationResponse)
@limiter.limit("30/minute")
def get_application(
    request: Request,
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == UserRole.applicant and application.user_id != current_user.id:
        log = AuditLog(
            user_id=current_user.id, event_type="IDOR_ATTEMPT",
            object_type="application", object_id=application_id,
            ip_address=request.client.host,
            details=json.dumps({"attempted_application_id": application_id, "owner_id": application.user_id})
        )
        db.add(log); db.commit()
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
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = application.status
    application.status = data.status
    application.comment = data.comment
    db.commit(); db.refresh(application)

    log = AuditLog(
        user_id=current_user.id, event_type="APPLICATION_STATUS_CHANGED",
        object_type="application", object_id=application.id,
        ip_address=request.client.host,
        details=json.dumps({"old_status": old_status, "new_status": data.status, "comment": data.comment})
    )
    db.add(log); db.commit()
    return application