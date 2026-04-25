from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, distinct
from typing import List, Optional
import logging

from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.admin import AdminUser

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/stats")
async def get_dashboard_stats(
    academic_year: Optional[str] = None, 
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    year_filter = []
    if academic_year:
        year_filter.append(Bill.academic_year == academic_year)

    # Basic stats
    total_bills_res = await db.execute(select(func.count(Bill.bill_id)).where(*year_filter))
    total_bills = total_bills_res.scalar() or 0
    
    paid_bills_res = await db.execute(select(func.count(Bill.bill_id)).where(and_(Bill.status == 'PAID', *year_filter)))
    paid_bills = paid_bills_res.scalar() or 0
    
    unpaid_bills_res = await db.execute(select(func.count(Bill.bill_id)).where(and_(Bill.status == 'UNPAID', *year_filter)))
    unpaid_bills = unpaid_bills_res.scalar() or 0
    
    revenue_res = await db.execute(select(func.coalesce(func.sum(Bill.amount), 0)).where(and_(Bill.status == 'PAID', *year_filter)))
    total_revenue = revenue_res.scalar() or 0
    
    pending_res = await db.execute(select(func.coalesce(func.sum(Bill.amount), 0)).where(and_(Bill.status == 'UNPAID', *year_filter)))
    total_pending_amount = pending_res.scalar() or 0
    
    students_res = await db.execute(select(func.count(distinct(Bill.user_id))).where(*year_filter))
    total_students = students_res.scalar() or 0

    # Refund stats
    refund_filter = []
    if academic_year:
        refund_filter.append(Bill.academic_year == academic_year)
    
    refund_revenue_res = await db.execute(
        select(func.coalesce(func.sum(Refund.amount), 0))
        .join(Payment, Refund.payment_id == Payment.payment_id)
        .join(Bill, Payment.bill_id == Bill.bill_id)
        .where(and_(Refund.status == 'REFUNDED', *refund_filter))
    )
    total_refunds = refund_revenue_res.scalar() or 0
    
    pending_refunds_res = await db.execute(
        select(func.count(Refund.refund_id))
        .join(Payment, Refund.payment_id == Payment.payment_id)
        .join(Bill, Payment.bill_id == Bill.bill_id)
        .where(and_(Refund.status == 'PENDING', *refund_filter))
    )
    pending_refunds = pending_refunds_res.scalar() or 0

    # Program wise breakdown
    program_stats_res = await db.execute(
        select(
            Bill.program_name,
            func.count(Bill.bill_id).filter(Bill.status == 'PAID').label('paid'),
            func.count(Bill.bill_id).filter(Bill.status == 'UNPAID').label('unpaid'),
            func.coalesce(func.sum(Bill.amount).filter(Bill.status == 'PAID'), 0).label('collected'),
            func.coalesce(func.sum(Bill.amount).filter(Bill.status == 'UNPAID'), 0).label('pending')
        )
        .where(and_(Bill.bill_type == 'ACADEMIC', *year_filter))
        .group_by(Bill.program_name)
        .order_by(Bill.program_name)
    )
    program_stats = [
        {
            "program_name": r[0],
            "paid": r[1],
            "unpaid": r[2],
            "collected": float(r[3]),
            "pending": float(r[4])
        } for r in program_stats_res.all()
    ]

    # Monthly collection
    month_filter = []
    if academic_year:
        month_filter.append(Bill.academic_year == academic_year)
        
    monthly_res = await db.execute(
        select(
            func.to_char(Payment.created_at, 'YYYY-MM').label('month'),
            func.coalesce(func.sum(Payment.amount), 0).label('total')
        )
        .join(Bill, Payment.bill_id == Bill.bill_id)
        .where(and_(Payment.status == 'SUCCESS', *month_filter))
        .group_by('month')
        .order_by('month')
    )
    monthly_collection = [{"month": r[0], "total": float(r[1])} for r in monthly_res.all()]

    return {
        "total_bills": total_bills,
        "paid_bills": paid_bills,
        "unpaid_bills": unpaid_bills,
        "total_revenue": float(total_revenue),
        "total_pending_amount": float(total_pending_amount),
        "total_students": total_students,
        "total_refunds": float(total_refunds),
        "pending_refunds": pending_refunds,
        "program_stats": program_stats,
        "monthly_collection": monthly_collection
    }

@router.get("/academic-years")
async def get_academic_years(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(distinct(Bill.academic_year)).order_by(Bill.academic_year.desc())
    )
    return [r[0] for r in result.all()]
