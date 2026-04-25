from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.models.payment import Payment
from app.models.admin import AdminUser

router = APIRouter()

@router.get("/")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    # Total revenue from SUCCESS payments
    revenue_result = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.status == 'SUCCESS')
    )
    total_revenue = revenue_result.scalar() or 0
    
    # Total pending from UNPAID bills
    pending_result = await db.execute(
        select(func.sum(Bill.amount)).where(Bill.status == 'UNPAID')
    )
    total_pending = pending_result.scalar() or 0
    
    # Paid vs Pending counts
    paid_count_result = await db.execute(select(func.count(Bill.bill_id)).where(Bill.status == 'PAID'))
    unpaid_count_result = await db.execute(select(func.count(Bill.bill_id)).where(Bill.status == 'UNPAID'))
    
    paid_count = paid_count_result.scalar() or 0
    unpaid_count = unpaid_count_result.scalar() or 0
    
    return {
        "total_revenue": float(total_revenue),
        "total_pending": float(total_pending),
        "paid_bills": paid_count,
        "unpaid_bills": unpaid_count,
        "total_bills": paid_count + unpaid_count
    }
