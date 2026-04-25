import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Text, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class Receipt(Base):
    __tablename__ = "receipts"

    receipt_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.payment_id"), nullable=False)
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.bill_id"), nullable=False)
    user_id = Column(Text, nullable=False, index=True)
    receipt_number = Column(String(50), unique=True, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
