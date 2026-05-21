from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.auth.security import hash_password, verify_password, create_access_token
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.middleware import limiter
import json

router = APIRouter(prefix="/auth", tags=["auth"])

# Схемы запросов/ответов

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

# Эндпоинты

@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    # Проверяем что email не занят
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Создаём пользователя
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.applicant
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Логируем событие
    log = AuditLog(
        user_id=user.id,
        event_type="REGISTER",
        ip_address=request.client.host,
        details=json.dumps({"email": user.email})
    )
    db.add(log)
    db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    # Намеренно одинаковая ошибка для несуществующего юзера и неверного пароля чтобы нельзя было угадать существует ли email
    if not user or not verify_password(data.password, user.hashed_password):
        # Логируем неудачную попытку
        log = AuditLog(
            user_id=user.id if user else None,
            event_type="LOGIN_FAIL",
            ip_address=request.client.host,
            details=json.dumps({"email": data.email})
        )
        db.add(log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован"
        )

    # Логируем успешный вход
    log = AuditLog(
        user_id=user.id,
        event_type="LOGIN_SUCCESS",
        ip_address=request.client.host,
        details=json.dumps({"email": user.email})
    )
    db.add(log)
    db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role)
