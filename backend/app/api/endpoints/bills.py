from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from uuid import UUID

from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.schemas.bill import Bill as BillSchema, PendingBillsResponse
from app.models.admin import AdminUser

router = APIRouter()

@router.get("/", response_model=List[BillSchema])
async def list_bills(
    academic_year: Optional[str] = None,
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    query = select(Bill)
    filters = []
    if academic_year:
        filters.append(Bill.academic_year == academic_year)
    if status:
        filters.append(Bill.status == status)
    if user_id:
        filters.append(Bill.user_id == user_id)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.order_by(Bill.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/pending", response_model=PendingBillsResponse)
async def get_pending_bills(
    user_id: Optional[str] = None,
    academic_year: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Bill).where(Bill.status == 'UNPAID')
    if user_id:
        query = query.where(Bill.user_id == user_id)
    if academic_year:
        query = query.where(Bill.academic_year == academic_year)
    
    query = query.order_by(Bill.installment_number.asc(), Bill.created_at.asc())
    result = await db.execute(query)
    bills = result.scalars().all()
    
    total_pending = sum(float(b.amount) for b in bills)
    return {
        "bills": bills,
        "total_pending": total_pending,
        "count": len(bills)
    }

@router.get("/user/{user_id}", response_model=List[BillSchema])
async def get_user_bills(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Bill)
        .where(Bill.user_id == user_id)
        .order_by(Bill.academic_year.desc(), Bill.installment_number.asc())
    )
    return result.scalars().all()

@router.get("/{bill_id}", response_model=BillSchema)
async def get_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill
