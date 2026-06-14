from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.models.document import Document
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.auth.dependencies import get_current_user
from app.config import settings
from app.middleware import limiter
from minio import Minio
from io import BytesIO
from datetime import timedelta
import hashlib
import uuid
import json

router = APIRouter(prefix="/documents", tags=["documents"])

def get_minio_client():
    return Minio(
        "minio:9000",
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=False
    )

def get_minio_public_client():
    return Minio(
        "localhost:9000",
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=False
    )

ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 МБ

class DocumentResponse(BaseModel):
    id: int
    original_filename: str
    mime_type: str
    file_size: int
    status: str
    doc_type: Optional[str] = None
    edu_level: Optional[str] = None
    reject_reason: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/upload", response_model=DocumentResponse, status_code=201)
@limiter.limit("5/minute")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form(None),
    edu_level: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Allowed: PDF, JPEG, PNG"
        )

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB"
        )

    sha256_hash = hashlib.sha256(contents).hexdigest()
    extension = file.filename.split(".")[-1]
    stored_filename = f"{uuid.uuid4()}.{extension}"

    minio_client = get_minio_client()
    if not minio_client.bucket_exists(settings.minio_bucket):
        minio_client.make_bucket(settings.minio_bucket)

    minio_client.put_object(
        settings.minio_bucket,
        stored_filename,
        BytesIO(contents),
        length=len(contents),
        content_type=file.content_type
    )

    document = Document(
        user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        mime_type=file.content_type,
        file_size=len(contents),
        sha256_hash=sha256_hash,
        doc_type=doc_type,
        edu_level=edu_level,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    log = AuditLog(
        user_id=current_user.id,
        event_type="DOCUMENT_UPLOADED",
        object_type="document",
        object_id=document.id,
        ip_address=request.client.host,
        details=json.dumps({
            "filename": file.filename,
            "size": len(contents),
            "hash": sha256_hash,
            "doc_type": doc_type,
            "edu_level": edu_level,
        })
    )
    db.add(log)
    db.commit()
    return document


@router.delete("/{document_id}", status_code=204)
@limiter.limit("10/minute")
def delete_document(
    request: Request,
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.user_id != current_user.id:
        log = AuditLog(
            user_id=current_user.id,
            event_type="IDOR_ATTEMPT",
            object_type="document",
            object_id=document_id,
            ip_address=request.client.host,
            details=json.dumps({
                "action": "delete",
                "attempted_document_id": document_id,
                "owner_id": document.user_id
            })
        )
        db.add(log)
        db.commit()
        raise HTTPException(status_code=403, detail="Access denied")

    # Удаляем файл из MinIO
    try:
        minio_client = get_minio_client()
        minio_client.remove_object(settings.minio_bucket, document.stored_filename)
    except Exception:
        pass  # если файла нет в MinIO — всё равно удаляем запись из БД

    log = AuditLog(
        user_id=current_user.id,
        event_type="DOCUMENT_DELETED",
        object_type="document",
        object_id=document_id,
        ip_address=request.client.host,
        details=json.dumps({"filename": document.original_filename})
    )
    db.add(log)
    db.commit()

    db.delete(document)
    db.commit()


@router.get("/me", response_model=List[DocumentResponse])
@limiter.limit("30/minute")
def get_my_documents(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Document).filter(
        Document.user_id == current_user.id
    ).order_by(Document.created_at.desc()).all()


@router.get("/user/{user_id}", response_model=List[DocumentResponse])
@limiter.limit("30/minute")
def get_user_documents(
    request: Request,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in (UserRole.operator, UserRole.admin):
        raise HTTPException(status_code=403, detail="Access denied")

    return db.query(Document).filter(
        Document.user_id == user_id
    ).order_by(Document.created_at.desc()).all()


class DocumentStatusUpdate(BaseModel):
    status: str  # accepted / rejected
    reject_reason: Optional[str] = None

@router.patch("/{document_id}/status", response_model=DocumentResponse)
@limiter.limit("30/minute")
def update_document_status(
    request: Request,
    document_id: int,
    body: DocumentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in (UserRole.operator, UserRole.admin):
        raise HTTPException(status_code=403, detail="Access denied")

    if body.status not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.status = body.status
    if body.reject_reason is not None:
        document.reject_reason = body.reject_reason

    log = AuditLog(
        user_id=current_user.id,
        event_type="DOCUMENT_STATUS_UPDATED",
        object_type="document",
        object_id=document_id,
        ip_address=request.client.host,
        details=json.dumps({"status": body.status, "reject_reason": body.reject_reason})
    )
    db.add(log)
    db.commit()
    db.refresh(document)
    return document


@router.get("/{document_id}/download")
@limiter.limit("30/minute")
def download_document(
    request: Request,
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

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

    minio_client = get_minio_client()
    url = minio_client.presigned_get_object(
        settings.minio_bucket,
        document.stored_filename,
        expires=timedelta(hours=1)
    )

    url = url.replace("http://minio:9000", "http://localhost/minio")
    return {"download_url": url}