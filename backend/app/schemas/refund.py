from uuid import UUID
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel

class RefundBase(BaseModel):
    payment_id: UUID
    user_id: str
    amount: Decimal
    reason: Optional[str] = None
    status: str = "PENDING"

class Refund(RefundBase):
    refund_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class CreateRefundRequest(BaseModel):
    payment_id: UUID
    amount: Decimal
    reason: str

class UpdateRefundStatusRequest(BaseModel):
    status: str
