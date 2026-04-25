from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from uuid import UUID
import logging

from app.api import deps
from app.db.session import get_db
from app.models.refund import Refund
from app.models.payment import Payment
from app.models.bill import Bill
from app.schemas.refund import (
    Refund as RefundSchema, 
    CreateRefundRequest, 
    UpdateRefundStatusRequest
)
from app.models.admin import AdminUser
from app.services import razorpay_service, audit_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=RefundSchema)
async def create_refund(
    req: CreateRefundRequest, 
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    result = await db.execute(
        select(Payment).where(and_(Payment.payment_id == req.payment_id, Payment.status == 'SUCCESS'))
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Successful payment not found")
    
    if req.amount > payment.amount:
        raise HTTPException(status_code=400, detail="Refund amount exceeds payment amount")
    
    # Check existing refunds
    existing_result = await db.execute(
        select(func.coalesce(func.sum(Refund.amount), 0))
        .where(and_(Refund.payment_id == req.payment_id, Refund.status != 'REJECTED'))
    )
    total_existing = existing_result.scalar()
    
    if total_existing + req.amount > payment.amount:
        raise HTTPException(status_code=400, detail="Total refunds would exceed payment amount")
    
    refund = Refund(
        payment_id=req.payment_id,
        user_id=payment.user_id,
        amount=req.amount,
        reason=req.reason,
        status='PENDING'
    )
    db.add(refund)
    await db.flush()

    await audit_service.log_event(
        "REFUND_CREATED", "SUCCESS",
        f"Refund request created for payment {req.payment_id}",
        {
            "payment_id": str(req.payment_id), 
            "amount": float(req.amount), 
            "reason": req.reason, 
            "refund_id": str(refund.refund_id)
        },
        db=db
    )
    return refund

@router.put("/{refund_id}", response_model=RefundSchema)
async def update_refund(
    refund_id: UUID, 
    req: UpdateRefundStatusRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    if req.status not in ('REFUNDED', 'REJECTED'):
        raise HTTPException(status_code=400, detail="Status must be REFUNDED or REJECTED")
    
    result = await db.execute(select(Refund).where(Refund.refund_id == refund_id))
    refund = result.scalar_one_or_none()
    
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")

    if req.status == 'REFUNDED' and refund.status != 'REFUNDED':
        # Integrate Razorpay refund
        pay_result = await db.execute(select(Payment).where(Payment.payment_id == refund.payment_id))
        payment = pay_result.scalar_one_or_none()
        
        if not payment or not payment.razorpay_payment_id:
            raise HTTPException(status_code=400, detail="Associated Razorpay payment not found or uncaptured")
        
        try:
            razorpay_service.razorpay_client.refund.create({
                "payment_id": payment.razorpay_payment_id,
                "amount": int(float(refund.amount) * 100),
                "notes": {
                    "reason": refund.reason
                }
            })
        except Exception as e:
            logger.error(f"Razorpay refund failed: {e}")
            raise HTTPException(status_code=500, detail=f"Razorpay refund creation failed: {str(e)}")

    refund.status = req.status
    await db.flush()

    await audit_service.log_event(
        "REFUND_UPDATED", "SUCCESS",
        f"Refund {refund_id} status updated to {req.status}",
        {"refund_id": str(refund_id), "new_status": req.status, "amount": float(refund.amount)},
        db=db
    )
    return refund

@router.get("/", response_model=List[RefundSchema])
async def list_refunds(
    academic_year: Optional[str] = None, 
    status: Optional[str] = None, 
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    # Join with bills to filter by academic_year
    query = select(Refund).join(Payment).join(Bill)
    if academic_year:
        query = query.where(Bill.academic_year == academic_year)
    if status:
        query = query.where(Refund.status == status)
    
    query = query.order_by(Refund.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/user/{user_id}", response_model=List[RefundSchema])
async def get_user_refunds(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Refund)
        .where(Refund.user_id == user_id)
        .order_by(Refund.created_at.desc())
    )
    return result.scalars().all()
