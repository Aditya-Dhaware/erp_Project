from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import os

from app.db.session import get_db
from app.models.bill import Bill
from app.services import audit_service
from app.core.config import settings

router = APIRouter()

class BrochurePaymentRequest(BaseModel):
    user_id: str
    brochure_id: str
    brochure_fee_amount: float
    academic_year: str

class StudentAdmissionRequest(BaseModel):
    user_id: str
    academic_year: str
    program_name: str
    total_course_fees: float
    installments: int
    user_name: str
    user_email: str
    user_class: str

@router.get("/pay-brochure")
async def pay_brochure_auto_redirect(
    user_id: str, 
    amount: float, 
    academic_year: str = "2025-26",
    db: AsyncSession = Depends(get_db)
):
    """GET version: Instantly redirects the browser."""
    result = await db.execute(
        select(Bill).where(
            Bill.user_id == user_id, 
            Bill.bill_type == 'BROCHURE', 
            Bill.academic_year == academic_year
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        bill_id = existing.bill_id
    else:
        bill = Bill(
            user_id=user_id,
            academic_year=academic_year,
            program_name="Brochure",
            bill_type='BROCHURE',
            amount=amount,
            status='UNPAID'
        )
        db.add(bill)
        await db.flush()
        bill_id = bill.bill_id

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    redirect_url = f"{frontend_url}/pay/brochure?bill_id={bill_id}&user_id={user_id}"
    return RedirectResponse(url=redirect_url)

@router.post("/brochure-payment")
async def create_brochure_bill(
    req: BrochurePaymentRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Bill).where(
            Bill.user_id == req.user_id, 
            Bill.bill_type == 'BROCHURE', 
            Bill.academic_year == req.academic_year
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        bill_id = str(existing.bill_id)
        user_id = str(existing.user_id)
    else:
        bill = Bill(
            user_id=req.user_id,
            academic_year=req.academic_year,
            program_name='Brochure',
            bill_type='BROCHURE',
            amount=req.brochure_fee_amount,
            status='UNPAID'
        )
        db.add(bill)
        await db.flush()
        bill_id = str(bill.bill_id)
        user_id = str(bill.user_id)

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    redirect_url = f"{frontend_url}/pay/brochure?bill_id={bill_id}&user_id={user_id}"

    return {
        "status": "success",
        "bill_id": bill_id,
        "user_id": user_id,
        "brochure_id": req.brochure_id,
        "academic_year": req.academic_year,
        "amount": req.brochure_fee_amount,
        "redirect_url": redirect_url
    }

@router.post("/generate-bills")
async def generate_student_bills(
    req: StudentAdmissionRequest,
    db: AsyncSession = Depends(get_db)
):
    if req.installments < 1:
        raise HTTPException(status_code=400, detail="Installments must be at least 1")
    
    # Check for existing
    result = await db.execute(
        select(Bill).where(
            Bill.user_id == req.user_id, 
            Bill.bill_type == 'ACADEMIC', 
            Bill.academic_year == req.academic_year
        )
    )
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Academic bills already exist")

    per_installment = round(req.total_course_fees / req.installments, 2)
    remainder = round(req.total_course_fees - (per_installment * req.installments), 2)

    bills = []
    for i in range(1, req.installments + 1):
        amt = per_installment
        if i == req.installments and remainder != 0:
            amt = per_installment + remainder
        
        bill = Bill(
            user_id=req.user_id,
            academic_year=req.academic_year,
            user_name=req.user_name,
            user_email=req.user_email,
            program_name=req.program_name,
            user_class=req.user_class,
            bill_type='ACADEMIC',
            amount=amt,
            status='UNPAID',
            installment_number=i,
            total_installments=req.installments
        )
        db.add(bill)
        bills.append(bill)
    
    await db.flush()

    await audit_service.log_event(
        "BILLS_GENERATED", "SUCCESS",
        f"Generated {req.installments} academic bill(s) for user {req.user_id}",
        {
            "user_id": req.user_id, 
            "total_fees": req.total_course_fees, 
            "installments": req.installments, 
            "user_name": req.user_name
        },
        db=db
    )
    
    return {
        "total_fees": req.total_course_fees, 
        "installments": req.installments, 
        "per_installment": per_installment, 
        "bills": [
            {
                "bill_id": str(b.bill_id),
                "amount": float(b.amount),
                "status": b.status,
                "installment_number": b.installment_number
            } for b in bills
        ]
    }
