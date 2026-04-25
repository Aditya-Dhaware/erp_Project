import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Integer, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class Bill(Base):
    __tablename__ = "bills"

    bill_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Text, nullable=False, index=True)
    academic_year = Column(String(20), nullable=False, index=True)
    user_name = Column(String(255))
    user_email = Column(String(255))
    program_name = Column(String(255))
    user_class = Column(String(50))
    bill_type = Column(String(50), nullable=False, server_default='ACADEMIC')
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, server_default='UNPAID', index=True)
    installment_number = Column(Integer)
    total_installments = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
