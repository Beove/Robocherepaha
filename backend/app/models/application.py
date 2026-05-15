from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class ApplicationStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    direction = Column(String, nullable=False)
    education_level = Column(String, nullable=False)
    faculty = Column(String, nullable=True)
    study_form = Column(String, nullable=True)
    funding = Column(String, nullable=True)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.draft)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="applications")