from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/applicants", tags=["applicants"])

class ProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.full_name is not None:
        current_user.full_name = data.full_name

    db.commit()
    db.refresh(current_user)
    return current_user