from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from uuid import UUID
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone

from app.api import deps
from app.db.session import get_db
from app.models.bill import Bill
from app.models.payment import Payment
from app.models.receipt import Receipt
from app.models.admin import AdminUser
from app.schemas.payment import Payment as PaymentSchema, VerifyPaymentRequest
from app.services import razorpay_service, webhook_service, audit_service
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/create-order")
async def create_payment_order(
    bill_id: UUID,
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill.status == 'PAID':
        raise HTTPException(status_code=400, detail="Bill is already paid")

    amount_paise = int(float(bill.amount) * 100)
    receipt_str = f"rcpt_{str(bill.bill_id)[:20]}"

    try:
        order = razorpay_service.razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt_str,
            "payment_capture": 1
        })
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

    payment = Payment(
        bill_id=bill.bill_id,
        user_id=bill.user_id,
        razorpay_order_id=order['id'],
        amount=bill.amount,
        status='PENDING'
    )
    db.add(payment)
    await db.flush()

    await audit_service.log_event(
        "PAYMENT_ORDER_CREATED", "SUCCESS",
        f"Created Razorpay order for bill {bill_id}",
        {"bill_id": str(bill_id), "user_id": user_id, "order_id": order['id'], "amount": amount_paise / 100},
        db=db
    )

    return {
        "order": order,
        "payment": {
            "payment_id": str(payment.payment_id),
            "bill_id": str(payment.bill_id),
            "user_id": payment.user_id,
            "razorpay_order_id": payment.razorpay_order_id,
            "amount": float(payment.amount),
            "status": payment.status,
            "created_at": payment.created_at.isoformat() if payment.created_at else None
        },
        "key_id": settings.RAZORPAY_KEY_ID
    }

@router.post("/verify")
async def verify_payment(
    req: VerifyPaymentRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    if not razorpay_service.verify_signature(
        req.razorpay_order_id, req.razorpay_payment_id, req.razorpay_signature
    ):
        raise HTTPException(status_code=400, detail="Payment verification failed")

    result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == req.razorpay_order_id)
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    result = await db.execute(select(Bill).where(Bill.bill_id == payment.bill_id))
    bill = result.scalar_one_or_none()
    
    if bill.status == 'PAID':
        raise HTTPException(status_code=400, detail="Bill already paid")

    payment.razorpay_payment_id = req.razorpay_payment_id
    payment.razorpay_signature = req.razorpay_signature
    payment.status = 'SUCCESS'
    
    bill.status = 'PAID'
    bill.updated_at = datetime.now(timezone.utc)

    receipt_num = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(payment.payment_id)[:8].upper()}"
    receipt = Receipt(
        payment_id=payment.payment_id,
        bill_id=payment.bill_id,
        user_id=payment.user_id,
        receipt_number=receipt_num,
        amount=payment.amount
    )
    db.add(receipt)

    # Webhook Payloads
    webhook_payload = {
        "event": "payment.success",
        "data": {
            "user_id": str(payment.user_id),
            "bill_id": str(payment.bill_id),
            "payment_id": str(payment.payment_id),
            "receipt_number": receipt_num,
            "amount": float(payment.amount),
            "bill_type": bill.bill_type
        }
    }
    
    if bill.bill_type == 'BROCHURE':
        background_tasks.add_task(webhook_service.send_payment_webhook, webhook_payload)

    if bill.bill_type == 'ACADEMIC':
        # Get fee summary for SIS update
        summary_result = await db.execute(
            select(Bill).where(and_(Bill.user_id == payment.user_id, Bill.bill_type == 'ACADEMIC'))
        )
        fee_summary = summary_result.scalars().all()
        total_paid = sum(float(r.amount) for r in fee_summary if r.status == 'PAID')
        total_pending = sum(float(r.amount) for r in fee_summary if r.status == 'UNPAID')
        background_tasks.add_task(
            webhook_service.send_sis_fee_update,
            str(payment.user_id),
            total_paid,
            total_pending
        )

    await audit_service.log_event(
        "PAYMENT_VERIFIED", "SUCCESS",
        f"Payment verified for bill {str(payment.bill_id)}",
        {
            "user_id": str(payment.user_id), 
            "bill_id": str(payment.bill_id), 
            "payment_id": str(payment.payment_id), 
            "receipt_number": receipt_num, 
            "amount": float(payment.amount), 
            "bill_type": bill.bill_type
        },
        db=db
    )

    return {
        "message": "Payment verified successfully", 
        "receipt": {
            "receipt_id": str(receipt.receipt_id),
            "payment_id": str(receipt.payment_id),
            "bill_id": str(receipt.bill_id),
            "user_id": receipt.user_id,
            "receipt_number": receipt.receipt_number,
            "amount": float(receipt.amount),
            "created_at": datetime.now(timezone.utc).isoformat() # Placeholder for newly created
        }
    }

@router.post("/razorpay-webhook")
async def razorpay_webhook(
    request: Request, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
    raw_body = await request.body()

    if webhook_secret:
        received_signature = request.headers.get('X-Razorpay-Signature', '')
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected_signature, received_signature):
            logger.warning("[RazorpayWebhook] Invalid signature")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_name = event.get('event')
    logger.info(f"[RazorpayWebhook] Received event: {event_name}")

    if event_name != 'payment.captured':
        return {"status": "ignored", "event": event_name}

    payment_entity = event.get('payload', {}).get('payment', {}).get('entity', {})
    razorpay_order_id = payment_entity.get('order_id')
    razorpay_payment_id = payment_entity.get('id')

    if not razorpay_order_id or not razorpay_payment_id:
        raise HTTPException(status_code=400, detail="Missing order_id or payment_id")

    result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        logger.warning(f"[RazorpayWebhook] No payment record for order {razorpay_order_id}")
        return {"status": "not_found"}

    result = await db.execute(select(Bill).where(Bill.bill_id == payment.bill_id))
    bill = result.scalar_one_or_none()

    if bill.status == 'PAID':
        return {"status": "already_paid"}

    payment.razorpay_payment_id = razorpay_payment_id
    payment.status = 'SUCCESS'
    bill.status = 'PAID'
    bill.updated_at = datetime.now(timezone.utc)

    receipt_num = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(payment.payment_id)[:8].upper()}"
    # Check for existing receipt to ensure idempotency
    existing_receipt = await db.execute(select(Receipt).where(Receipt.payment_id == payment.payment_id))
    if not existing_receipt.scalar_one_or_none():
        receipt = Receipt(
            payment_id=payment.payment_id,
            bill_id=payment.bill_id,
            user_id=payment.user_id,
            receipt_number=receipt_num,
            amount=payment.amount
        )
        db.add(receipt)

    # Webhooks
    webhook_payload = {
        "event": "payment.success",
        "data": {
            "user_id": str(payment.user_id),
            "bill_id": str(payment.bill_id),
            "payment_id": str(payment.payment_id),
            "receipt_number": receipt_num,
            "amount": float(payment.amount),
            "bill_type": bill.bill_type
        }
    }
    
    if bill.bill_type == 'BROCHURE':
        background_tasks.add_task(webhook_service.send_payment_webhook, webhook_payload)

    if bill.bill_type == 'ACADEMIC':
        summary_result = await db.execute(
            select(Bill).where(and_(Bill.user_id == payment.user_id, Bill.bill_type == 'ACADEMIC'))
        )
        fee_summary = summary_result.scalars().all()
        total_paid = sum(float(r.amount) for r in fee_summary if r.status == 'PAID')
        total_pending = sum(float(r.amount) for r in fee_summary if r.status == 'UNPAID')
        background_tasks.add_task(
            webhook_service.send_sis_fee_update, 
            str(payment.user_id), 
            total_paid, 
            total_pending
        )

    await audit_service.log_event(
        "RAZORPAY_WEBHOOK_PROCESSED", "SUCCESS",
        f"Webhook processed for order {razorpay_order_id}",
        {
            "razorpay_order_id": razorpay_order_id, 
            "razorpay_payment_id": razorpay_payment_id,
            "bill_id": str(payment.bill_id), 
            "bill_type": bill.bill_type
        },
        db=db
    )

    return {"status": "success"}

@router.get("/", response_model=List[PaymentSchema])
async def list_payments(
    academic_year: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    # Join with bills to filter by academic_year
    query = select(Payment).join(Bill)
    if academic_year:
        query = query.where(Bill.academic_year == academic_year)
    if user_id:
        query = query.where(Payment.user_id == user_id)
    
    query = query.order_by(Payment.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/user/{user_id}", response_model=List[PaymentSchema])
async def get_user_payments(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
    )
    return result.scalars().all()
