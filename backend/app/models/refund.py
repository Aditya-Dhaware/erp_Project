import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Text, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class Refund(Base):
    __tablename__ = "refunds"

    refund_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.payment_id"), nullable=False)
    user_id = Column(Text, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    reason = Column(Text)
    status = Column(String(20), nullable=False, server_default='PENDING')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
