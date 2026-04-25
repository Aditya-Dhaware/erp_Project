from uuid import UUID
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel

class PaymentBase(BaseModel):
    bill_id: UUID
    user_id: str
    amount: Decimal
    status: str = "PENDING"

class PaymentCreate(PaymentBase):
    razorpay_order_id: str

class Payment(PaymentBase):
    payment_id: UUID
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
