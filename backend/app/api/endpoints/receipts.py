from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, join
from typing import List, Optional
from uuid import UUID

from app.api import deps
from app.db.session import get_db
from app.models.receipt import Receipt
from app.models.bill import Bill
from app.schemas.receipt import Receipt as ReceiptSchema
from app.models.admin import AdminUser

router = APIRouter()

@router.get("/", response_model=List[ReceiptSchema])
async def list_receipts(
    academic_year: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    query = select(Receipt).join(Bill)
    if academic_year:
        query = query.where(Bill.academic_year == academic_year)
    
    query = query.order_by(Receipt.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/user/{user_id}", response_model=List[ReceiptSchema])
async def get_user_receipts(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Receipt)
        .where(Receipt.user_id == user_id)
        .order_by(Receipt.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{receipt_id}", response_model=ReceiptSchema)
async def get_receipt(
    receipt_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Receipt).where(Receipt.receipt_id == receipt_id))
    receipt = result.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt
