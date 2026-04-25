from uuid import UUID
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel

class BillBase(BaseModel):
    user_id: str
    academic_year: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    program_name: Optional[str] = None
    user_class: Optional[str] = None
    bill_type: str = "ACADEMIC"
    amount: Decimal
    status: str = "UNPAID"
    installment_number: Optional[int] = None
    total_installments: Optional[int] = None

class BillCreate(BillBase):
    pass

class Bill(BillBase):
    bill_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PendingBillsResponse(BaseModel):
    bills: list[Bill]
    total_pending: float
    count: int
