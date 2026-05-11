from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.audit_log import AuditLog
from app.auth.dependencies import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    event_type: str
    object_type: Optional[str] = None
    object_id: Optional[int] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    event_type: Optional[str] = Query(None, description="Фильтр по типу события"),
    user_id: Optional[int] = Query(None, description="Фильтр по пользователю"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    return query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/logs/idor", response_model=List[AuditLogResponse])
def get_idor_attempts(
    current_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Отдельный эндпоинт для быстрого просмотра IDOR попыток
    return db.query(AuditLog).filter(
        AuditLog.event_type == "IDOR_ATTEMPT"
    ).order_by(AuditLog.created_at.desc()).all()