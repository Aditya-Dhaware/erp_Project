from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

class ReceiptBase(BaseModel):
    payment_id: UUID
    bill_id: UUID
    user_id: str
    receipt_number: str
    amount: Decimal

class Receipt(ReceiptBase):
    receipt_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
