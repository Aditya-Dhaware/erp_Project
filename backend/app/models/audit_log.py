from sqlalchemy import Column, String, DateTime, Text, JSON, text
from sqlalchemy.sql import func
from app.db.base_class import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(String(50), primary_key=True)
    event_name = Column(String(100), nullable=False, index=True)
    status = Column(String(50), nullable=False)
    description = Column(Text)
    log_metadata = Column("metadata", JSON)  # Maps to the 'metadata' column in DB
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
