from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_admin
from app.auth.security import hash_password
from app.middleware import limiter
import json

router = APIRouter(prefix="/admin", tags=["admin"])


# Схемы 

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


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.operator


class UserRoleUpdate(BaseModel):
    role: UserRole


# Журнал аудита

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    event_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
    current_user=Depends(get_current_admin),
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
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).filter(
        AuditLog.event_type == "IDOR_ATTEMPT"
    ).order_by(AuditLog.created_at.desc()).all()


# Управление пользователями 

@router.get("/users", response_model=List[UserResponse])
def get_users(
    role: Optional[str] = Query(None),
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Список всех пользователей."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.id.desc()).all()


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    request: Request,
    data: UserCreate,
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Создание нового пользователя (оператора или другого администратора)."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log = AuditLog(
        user_id=current_user.id,
        event_type="USER_CREATED_BY_ADMIN",
        object_type="user",
        object_id=user.id,
        ip_address=request.client.host,
        details=json.dumps({"email": data.email, "role": data.role})
    )
    db.add(log)
    db.commit()
    return user


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    request: Request,
    user_id: int,
    data: UserRoleUpdate,
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Изменение роли пользователя."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя изменить собственную роль")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    old_role = user.role
    user.role = data.role
    db.commit()
    db.refresh(user)

    log = AuditLog(
        user_id=current_user.id,
        event_type="USER_ROLE_CHANGED",
        object_type="user",
        object_id=user_id,
        ip_address=request.client.host,
        details=json.dumps({"old_role": old_role, "new_role": data.role, "email": user.email})
    )
    db.add(log)
    db.commit()
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    request: Request,
    user_id: int,
    current_user=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Удаление пользователя."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить собственный аккаунт")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    log = AuditLog(
        user_id=current_user.id,
        event_type="USER_DELETED_BY_ADMIN",
        object_type="user",
        object_id=user_id,
        ip_address=request.client.host,
        details=json.dumps({"email": user.email, "role": user.role})
    )
    db.add(log)
    db.commit()

    db.delete(user)
    db.commit()