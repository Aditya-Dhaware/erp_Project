import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Text, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bill_id = Column(UUID(as_uuid=True), ForeignKey("bills.bill_id"), nullable=False, index=True)
    user_id = Column(Text, nullable=False, index=True)
    razorpay_order_id = Column(String(255))
    razorpay_payment_id = Column(String(255))
    razorpay_signature = Column(String(255))
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, server_default='PENDING')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
