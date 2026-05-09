from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.models.document import Document
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user
from app.config import settings
from minio import Minio
from io import BytesIO
from datetime import timedelta
import hashlib
import uuid
import json

router = APIRouter(prefix="/documents", tags=["documents"])

# Клиент MinIO
def get_minio_client():
    return Minio(
        "minio:9000",
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=False
    )

# Разрешённые типы файлов
ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 МБ

class DocumentResponse(BaseModel):
    id: int
    original_filename: str
    mime_type: str
    file_size: int
    status: str

    class Config:
        from_attributes = True

@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Проверка типа файла
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Allowed: PDF, JPEG, PNG"
        )

    # Чтение файла
    contents = await file.read()

    # Проверка размера
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB"
        )

    # SHA-256 хэш для контроля целостности
    sha256_hash = hashlib.sha256(contents).hexdigest()

    # Генерация уникального имени файла
    extension = file.filename.split(".")[-1]
    stored_filename = f"{uuid.uuid4()}.{extension}"

    # Загрузка в MinIO
    minio_client = get_minio_client()

    # Создание bucket если не существует
    if not minio_client.bucket_exists(settings.minio_bucket):
        minio_client.make_bucket(settings.minio_bucket)

    minio_client.put_object(
        settings.minio_bucket,
        stored_filename,
        BytesIO(contents),
        length=len(contents),
        content_type=file.content_type
    )

    # Сохранение метаданных в БД
    document = Document(
        user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        mime_type=file.content_type,
        file_size=len(contents),
        sha256_hash=sha256_hash
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Логирование
    log = AuditLog(
        user_id=current_user.id,
        event_type="DOCUMENT_UPLOADED",
        object_type="document",
        object_id=document.id,
        ip_address=request.client.host,
        details=json.dumps({
            "filename": file.filename,
            "size": len(contents),
            "hash": sha256_hash
        })
    )
    db.add(log)
    db.commit()

    return document


@router.get("/me", response_model=List[DocumentResponse])
def get_my_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Document).filter(
        Document.user_id == current_user.id
    ).all()


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # IDOR защита
    if current_user.role == UserRole.applicant and document.user_id != current_user.id:
        log = AuditLog(
            user_id=current_user.id,
            event_type="IDOR_ATTEMPT",
            object_type="document",
            object_id=document_id,
            ip_address=request.client.host,
            details=json.dumps({
                "attempted_document_id": document_id,
                "owner_id": document.user_id
            })
        )
        db.add(log)
        db.commit()
        raise HTTPException(status_code=403, detail="Access denied")

    # Генерация временной ссылки на файл (действует 1 час)
    minio_client = get_minio_client()
    url = minio_client.presigned_get_object(
        settings.minio_bucket,
        document.stored_filename,
        expires=timedelta(hours=1)
    )

    return {"download_url": url}