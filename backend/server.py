from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import uuid
import math
import hmac
import hashlib
import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
import bcrypt
import httpx

async def send_payment_webhook(payload: dict):
    webhook_url = os.environ.get(
        'ADMISSION_WEBHOOK_URL',
        'http://localhost:8001/api/v1/payments/webhook/payment-success'
    )
    secret = os.environ.get('ADMISSION_INTEGRATION_SECRET', 'SUPER_SECRET_TOKEN')
    headers = {
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(webhook_url, json=payload, headers=headers, timeout=5.0)
            print(f"[Webhook] Sent payload to {webhook_url}. Response: {resp.status_code}")
    except Exception as e:
        print(f"[Webhook] Failed to send webhook to {webhook_url}: {e}")

async def send_sis_fee_update(user_id: str, total_paid: float, total_pending: float):
    """Send a PATCH request to the SIS module with updated fee totals after a successful payment."""
    sis_base_url = os.environ.get('SIS_MODULE_URL', 'http://localhost:8002')
    patch_url = f"{sis_base_url}/api/students/{user_id}/fees"
    payload = {
        "user_id": user_id,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.patch(patch_url, json=payload, timeout=5.0)
            print(f"[SIS PATCH] Sent fee update to {patch_url}. Response: {resp.status_code}")
            if resp.status_code >= 400:
                print(f"[SIS PATCH] Error response body: {resp.text}")
    except Exception as e:
        print(f"[SIS PATCH] Failed to send fee update to {patch_url}: {e}")

import jwt
import razorpay

from database import get_pool, close_pool, init_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")

razorpay_client = razorpay.Client(auth=(os.environ['RAZORPAY_KEY_ID'], os.environ['RAZORPAY_KEY_SECRET']))

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

# ── Helpers ──

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, uuid.UUID):
            d[k] = str(v)
        elif isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, Decimal):
            d[k] = float(v)
    return d

def rows_to_list(rows):
    return [row_to_dict(r) for r in rows]

async def log_event(event_name: str, status: str, description: str = None, metadata: dict = None):
    """Insert an audit log entry into the audit_logs table."""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO audit_logs (log_id, event_name, status, description, metadata)
                   VALUES ($1, $2, $3, $4, $5)""",
                str(uuid.uuid4()), event_name, status, description,
                json.dumps(metadata) if metadata else None
            )
    except Exception as e:
        logger.error(f"[AuditLog] Failed to log event '{event_name}': {e}")

async def get_current_admin(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        pool = await get_pool()
        async with pool.acquire() as conn:
            admin = await conn.fetchrow("SELECT id, email, name FROM admin_users WHERE id = $1", uuid.UUID(payload["sub"]))
        if not admin:
            raise HTTPException(status_code=401, detail="User not found")
        return row_to_dict(admin)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Seed Admin ──

async def seed_admin():
    pool = await get_pool()
    email = os.environ.get("ADMIN_EMAIL", "admin@college.com")
    password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id, password_hash FROM admin_users WHERE email = $1", email)
        if existing is None:
            hashed = hash_password(password)
            await conn.execute(
                "INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)",
                email, hashed, "Super Admin"
            )
            logger.info(f"Admin seeded: {email}")
        elif not verify_password(password, existing['password_hash']):
            hashed = hash_password(password)
            await conn.execute("UPDATE admin_users SET password_hash = $1 WHERE email = $2", hashed, email)
            logger.info(f"Admin password updated: {email}")

# ── Seed Sample Data ──

async def seed_sample_data():
    pool = await get_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM bills")
        if count > 0:
            return

        users = [
            (uuid.UUID("a1111111-1111-1111-1111-111111111111"), "2024-25", "B.Sc Computer Science"),
            (uuid.UUID("a2222222-2222-2222-2222-222222222222"), "2024-25", "B.Com"),
            (uuid.UUID("a3333333-3333-3333-3333-333333333333"), "2024-25", "B.A English"),
            (uuid.UUID("a4444444-4444-4444-4444-444444444444"), "2023-24", "B.Sc Computer Science"),
            (uuid.UUID("a5555555-5555-5555-5555-555555555555"), "2023-24", "B.Com"),
        ]

        for uid, ay, prog in users:
            # Brochure bill
            await conn.execute(
                """INSERT INTO bills (user_id, academic_year, program_name, bill_type, amount, status, installment_number, total_installments)
                   VALUES ($1, $2, $3, 'BROCHURE', 200, 'PAID', NULL, NULL)""",
                uid, ay, prog
            )

        fee_configs = [
            (users[0], 60000, 3),
            (users[1], 45000, 2),
            (users[2], 30000, 2),
            (users[3], 60000, 3),
            (users[4], 45000, 2),
        ]

        for (uid, ay, prog), total, inst in fee_configs:
            per_inst = total / inst
            for i in range(1, inst + 1):
                status = 'PAID' if i == 1 else 'UNPAID'
                await conn.execute(
                    """INSERT INTO bills (user_id, academic_year, program_name, bill_type, amount, status, installment_number, total_installments)
                       VALUES ($1, $2, $3, 'ACADEMIC', $4, $5, $6, $7)""",
                    uid, ay, prog, per_inst, status, i, inst
                )

        # Create payments + receipts for PAID bills
        paid_bills = await conn.fetch("SELECT bill_id, user_id, amount FROM bills WHERE status = 'PAID'")
        for bill in paid_bills:
            pid = uuid.uuid4()
            await conn.execute(
                """INSERT INTO payments (payment_id, bill_id, user_id, razorpay_order_id, razorpay_payment_id, amount, status)
                   VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS')""",
                pid, bill['bill_id'], bill['user_id'], f"order_seed_{str(pid)[:8]}", f"pay_seed_{str(pid)[:8]}", bill['amount']
            )
            receipt_num = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(pid)[:8].upper()}"
            await conn.execute(
                """INSERT INTO receipts (payment_id, bill_id, user_id, receipt_number, amount)
                   VALUES ($1, $2, $3, $4, $5)""",
                pid, bill['bill_id'], bill['user_id'], receipt_num, bill['amount']
            )

        # Sample refund
        first_payment = await conn.fetchrow("SELECT payment_id, user_id, amount FROM payments LIMIT 1")
        if first_payment:
            await conn.execute(
                """INSERT INTO refunds (payment_id, user_id, amount, reason, status)
                   VALUES ($1, $2, $3, $4, 'REFUNDED')""",
                first_payment['payment_id'], first_payment['user_id'], 200, "Brochure fee refund - duplicate payment"
            )

        logger.info("Sample data seeded successfully")

# ── Startup / Shutdown ──

@app.on_event("startup")
async def startup():
    await init_db()
    await seed_admin()
    await seed_sample_data()

@app.on_event("shutdown")
async def shutdown():
    await close_pool()

# ── Auth Routes ──

class LoginRequest(BaseModel):
    email: str
    password: str

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    pool = await get_pool()
    async with pool.acquire() as conn:
        admin = await conn.fetchrow("SELECT id, email, name, password_hash FROM admin_users WHERE email = $1", req.email.lower().strip())
    if not admin or not verify_password(req.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(admin['id']), admin['email'])
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return {"token": token, "user": {"id": str(admin['id']), "email": admin['email'], "name": admin['name']}}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(admin=Depends(get_current_admin)):
    return admin

# ── Mock Admission Module ──

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

@api_router.post("/admission/brochure-payment")
async def create_brochure_bill(req: BrochurePaymentRequest):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT bill_id FROM bills WHERE user_id = $1 AND bill_type = 'BROCHURE' AND academic_year = $2",
            uuid.UUID(req.user_id), req.academic_year
        )
        if existing:
            raise HTTPException(status_code=400, detail="Brochure bill already exists for this user and year")
        bill = await conn.fetchrow(
            """INSERT INTO bills (user_id, academic_year, program_name, bill_type, amount, status)
               VALUES ($1, $2, $3, 'BROCHURE', $4, 'UNPAID')
               RETURNING bill_id, user_id, academic_year, program_name, bill_type, amount, status, created_at""",
            uuid.UUID(req.user_id), req.academic_year, "Brochure", req.brochure_fee_amount
        )
    bill_data = row_to_dict(bill)
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    bill_data["redirect_url"] = f"{frontend_url}/pay/brochure?bill_id={bill_data['bill_id']}&user_id={bill_data['user_id']}"
    return bill_data

@api_router.post("/admission/generate-bills")
async def generate_student_bills(req: StudentAdmissionRequest):
    if req.installments < 1:
        raise HTTPException(status_code=400, detail="Installments must be at least 1")
    pool = await get_pool()
    per_installment = round(req.total_course_fees / req.installments, 2)
    remainder = round(req.total_course_fees - (per_installment * req.installments), 2)

    bills = []
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            "SELECT COUNT(*) FROM bills WHERE user_id = $1 AND bill_type = 'ACADEMIC' AND academic_year = $2",
            uuid.UUID(req.user_id), req.academic_year
        )
        if existing > 0:
            raise HTTPException(status_code=400, detail="Academic bills already exist for this user and year")
        for i in range(1, req.installments + 1):
            amt = per_installment
            if i == req.installments and remainder != 0:
                amt = per_installment + remainder
            bill = await conn.fetchrow(
                """INSERT INTO bills (user_id, academic_year, user_name, user_email, program_name, user_class, bill_type, amount, status, installment_number, total_installments)
                   VALUES ($1, $2, $3, $4, $5, $6, 'ACADEMIC', $7, 'UNPAID', $8, $9)
                   RETURNING bill_id, user_id, academic_year, user_name, user_email, program_name, user_class, bill_type, amount, status, installment_number, total_installments, created_at""",
                uuid.UUID(req.user_id), req.academic_year, req.user_name, req.user_email, req.program_name, req.user_class, amt, i, req.installments
            )
            bills.append(row_to_dict(bill))

    await log_event(
        "BILLS_GENERATED", "SUCCESS",
        f"Generated {req.installments} academic bill(s) for user {req.user_id}",
        {"user_id": req.user_id, "total_fees": req.total_course_fees, "installments": req.installments, "user_name": req.user_name}
    )
    return {"total_fees": req.total_course_fees, "installments": req.installments, "per_installment": per_installment, "bills": bills}

# ── Bills Routes ──

@api_router.get("/bills")
async def list_bills(academic_year: Optional[str] = None, status: Optional[str] = None, user_id: Optional[str] = None, admin=Depends(get_current_admin)):
    pool = await get_pool()
    query = "SELECT * FROM bills WHERE 1=1"
    params = []
    idx = 1
    if academic_year:
        query += f" AND academic_year = ${idx}"
        params.append(academic_year)
        idx += 1
    if status:
        query += f" AND status = ${idx}"
        params.append(status)
        idx += 1
    if user_id:
        query += f" AND user_id = ${idx}"
        params.append(uuid.UUID(user_id))
        idx += 1
    query += " ORDER BY created_at DESC"
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    return rows_to_list(rows)

@api_router.get("/bills/pending")
async def get_pending_bills(user_id: Optional[str] = None, academic_year: Optional[str] = None):
    pool = await get_pool()
    query = "SELECT * FROM bills WHERE status = 'UNPAID'"
    params = []
    idx = 1
    if user_id:
        query += f" AND user_id = ${idx}"
        params.append(uuid.UUID(user_id))
        idx += 1
    if academic_year:
        query += f" AND academic_year = ${idx}"
        params.append(academic_year)
        idx += 1
    query += " ORDER BY installment_number ASC, created_at ASC"
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    bills = rows_to_list(rows)
    total_pending = sum(b['amount'] for b in bills)
    return {"bills": bills, "total_pending": total_pending, "count": len(bills)}

@api_router.get("/bills/user/{user_id}")
async def get_user_bills(user_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM bills WHERE user_id = $1 ORDER BY academic_year DESC, installment_number ASC", uuid.UUID(user_id))
    return rows_to_list(rows)

@api_router.get("/sis/fees/user/{user_id}")
async def get_sis_user_fees(user_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM bills WHERE user_id = $1 AND bill_type = 'ACADEMIC'", uuid.UUID(user_id))
    
    bills = rows_to_list(rows)
    total_paid = sum(b['amount'] for b in bills if b['status'] == 'PAID')
    total_pending = sum(b['amount'] for b in bills if b['status'] == 'UNPAID')
    
    return {
        "user_id": user_id,
        "total_paid": total_paid,
        "total_pending": total_pending
    }

@api_router.get("/bills/{bill_id}")
async def get_bill(bill_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        bill = await conn.fetchrow("SELECT * FROM bills WHERE bill_id = $1", uuid.UUID(bill_id))
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return row_to_dict(bill)

# ── Payment Routes ──

@api_router.post("/payments/create-order")
async def create_payment_order(bill_id: str = None, user_id: str = None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        bill = await conn.fetchrow("SELECT * FROM bills WHERE bill_id = $1", uuid.UUID(bill_id))
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if bill['status'] == 'PAID':
        raise HTTPException(status_code=400, detail="Bill is already paid")

    amount_paise = int(float(bill['amount']) * 100)
    receipt_str = f"rcpt_{str(bill['bill_id'])[:20]}"

    try:
        order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt_str,
            "payment_capture": 1
        })
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

    async with pool.acquire() as conn:
        payment = await conn.fetchrow(
            """INSERT INTO payments (bill_id, user_id, razorpay_order_id, amount, status)
               VALUES ($1, $2, $3, $4, 'PENDING')
               RETURNING payment_id, bill_id, user_id, razorpay_order_id, amount, status, created_at""",
            bill['bill_id'], bill['user_id'], order['id'], bill['amount']
        )

    await log_event(
        "PAYMENT_ORDER_CREATED", "SUCCESS",
        f"Created Razorpay order for bill {bill_id}",
        {"bill_id": bill_id, "user_id": user_id, "order_id": order['id'], "amount": amount_paise / 100}
    )

    return {
        "order": order,
        "payment": row_to_dict(payment),
        "key_id": os.environ['RAZORPAY_KEY_ID']
    }

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@api_router.post("/payments/verify")
async def verify_payment(req: VerifyPaymentRequest, background_tasks: BackgroundTasks):
    # Verify signature
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': req.razorpay_order_id,
            'razorpay_payment_id': req.razorpay_payment_id,
            'razorpay_signature': req.razorpay_signature
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    pool = await get_pool()
    async with pool.acquire() as conn:
        payment = await conn.fetchrow(
            "SELECT * FROM payments WHERE razorpay_order_id = $1", req.razorpay_order_id
        )
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        bill = await conn.fetchrow("SELECT * FROM bills WHERE bill_id = $1", payment['bill_id'])
        if bill['status'] == 'PAID':
            raise HTTPException(status_code=400, detail="Bill already paid")

        await conn.execute(
            "UPDATE payments SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'SUCCESS' WHERE payment_id = $3",
            req.razorpay_payment_id, req.razorpay_signature, payment['payment_id']
        )
        await conn.execute(
            "UPDATE bills SET status = 'PAID', updated_at = NOW() WHERE bill_id = $1",
            payment['bill_id']
        )

        receipt_num = f"REC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(payment['payment_id'])[:8].upper()}"
        receipt = await conn.fetchrow(
            """INSERT INTO receipts (payment_id, bill_id, user_id, receipt_number, amount)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING receipt_id, payment_id, bill_id, user_id, receipt_number, amount, created_at""",
            payment['payment_id'], payment['bill_id'], payment['user_id'], receipt_num, payment['amount']
        )

        # Fire a webhook to the Admission module if this is a brochure payment or in general
        webhook_payload = {
            "event": "payment.success",
            "data": {
                "user_id": str(payment['user_id']),
                "bill_id": str(payment['bill_id']),
                "payment_id": str(payment['payment_id']),
                "receipt_number": receipt_num,
                "amount": float(payment['amount']),
                "bill_type": bill['bill_type']
            }
        }
        background_tasks.add_task(send_payment_webhook, webhook_payload)

        # Fire a PATCH to the SIS module with aggregated fee totals for this student
        if bill['bill_type'] == 'ACADEMIC':
            fee_summary = await conn.fetch(
                "SELECT status, amount FROM bills WHERE user_id = $1 AND bill_type = 'ACADEMIC'",
                payment['user_id']
            )
            total_paid = sum(float(r['amount']) for r in fee_summary if r['status'] == 'PAID')
            total_pending = sum(float(r['amount']) for r in fee_summary if r['status'] == 'UNPAID')
            background_tasks.add_task(
                send_sis_fee_update,
                str(payment['user_id']),
                total_paid,
                total_pending
            )

    await log_event(
        "PAYMENT_VERIFIED", "SUCCESS",
        f"Payment verified for bill {str(payment['bill_id'])}",
        {"user_id": str(payment['user_id']), "bill_id": str(payment['bill_id']), "payment_id": str(payment['payment_id']), "receipt_number": receipt_num, "amount": float(payment['amount']), "bill_type": bill['bill_type']}
    )

    return {"message": "Payment verified successfully", "receipt": row_to_dict(receipt)}

@api_router.get("/payments")
async def list_payments(academic_year: Optional[str] = None, user_id: Optional[str] = None, admin=Depends(get_current_admin)):
    pool = await get_pool()
    query = """SELECT p.*, b.academic_year, b.program_name, b.bill_type, b.installment_number
               FROM payments p JOIN bills b ON p.bill_id = b.bill_id WHERE 1=1"""
    params = []
    idx = 1
    if academic_year:
        query += f" AND b.academic_year = ${idx}"
        params.append(academic_year)
        idx += 1
    if user_id:
        query += f" AND p.user_id = ${idx}"
        params.append(uuid.UUID(user_id))
        idx += 1
    query += " ORDER BY p.created_at DESC"
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    return rows_to_list(rows)

@api_router.get("/payments/user/{user_id}")
async def get_user_payments(user_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT p.*, b.academic_year, b.program_name, b.bill_type, b.installment_number
               FROM payments p JOIN bills b ON p.bill_id = b.bill_id WHERE p.user_id = $1 ORDER BY p.created_at DESC""",
            uuid.UUID(user_id)
        )
    return rows_to_list(rows)

# ── Receipt Routes ──

@api_router.get("/receipts")
async def list_receipts(academic_year: Optional[str] = None, admin=Depends(get_current_admin)):
    pool = await get_pool()
    query = """SELECT r.*, b.academic_year, b.program_name, b.bill_type, b.installment_number
               FROM receipts r JOIN bills b ON r.bill_id = b.bill_id WHERE 1=1"""
    params = []
    idx = 1
    if academic_year:
        query += f" AND b.academic_year = ${idx}"
        params.append(academic_year)
        idx += 1
    query += " ORDER BY r.created_at DESC"
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    return rows_to_list(rows)

@api_router.get("/receipts/user/{user_id}")
async def get_user_receipts(user_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT r.*, b.academic_year, b.program_name, b.bill_type, b.installment_number
               FROM receipts r JOIN bills b ON r.bill_id = b.bill_id WHERE r.user_id = $1 ORDER BY r.created_at DESC""",
            uuid.UUID(user_id)
        )
    return rows_to_list(rows)

@api_router.get("/receipts/{receipt_id}")
async def get_receipt(receipt_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        receipt = await conn.fetchrow(
            """SELECT r.*, b.academic_year, b.program_name, b.bill_type, b.installment_number, b.amount as bill_amount
               FROM receipts r JOIN bills b ON r.bill_id = b.bill_id WHERE r.receipt_id = $1""",
            uuid.UUID(receipt_id)
        )
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return row_to_dict(receipt)

# ── Refund Routes ──

class CreateRefundRequest(BaseModel):
    payment_id: str
    amount: float
    reason: str

class UpdateRefundStatusRequest(BaseModel):
    status: str

@api_router.post("/refunds")
async def create_refund(req: CreateRefundRequest, admin=Depends(get_current_admin)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        payment = await conn.fetchrow("SELECT * FROM payments WHERE payment_id = $1 AND status = 'SUCCESS'", uuid.UUID(req.payment_id))
        if not payment:
            raise HTTPException(status_code=404, detail="Successful payment not found")
        if req.amount > float(payment['amount']):
            raise HTTPException(status_code=400, detail="Refund amount exceeds payment amount")
        existing = await conn.fetchval("SELECT COALESCE(SUM(amount), 0) FROM refunds WHERE payment_id = $1 AND status != 'REJECTED'", uuid.UUID(req.payment_id))
        if float(existing) + req.amount > float(payment['amount']):
            raise HTTPException(status_code=400, detail="Total refunds would exceed payment amount")
        refund = await conn.fetchrow(
            """INSERT INTO refunds (payment_id, user_id, amount, reason, status)
               VALUES ($1, $2, $3, $4, 'PENDING')
               RETURNING refund_id, payment_id, user_id, amount, reason, status, created_at""",
            uuid.UUID(req.payment_id), payment['user_id'], req.amount, req.reason
        )

    await log_event(
        "REFUND_CREATED", "SUCCESS",
        f"Refund request created for payment {req.payment_id}",
        {"payment_id": req.payment_id, "amount": req.amount, "reason": req.reason, "refund_id": str(refund['refund_id'])}
    )
    return row_to_dict(refund)

@api_router.put("/refunds/{refund_id}")
async def update_refund(refund_id: str, req: UpdateRefundStatusRequest):
    if req.status not in ('REFUNDED', 'REJECTED'):
        raise HTTPException(status_code=400, detail="Status must be REFUNDED or REJECTED")
    pool = await get_pool()
    async with pool.acquire() as conn:
        refund = await conn.fetchrow("SELECT * FROM refunds WHERE refund_id = $1", uuid.UUID(refund_id))
        if not refund:
            raise HTTPException(status_code=404, detail="Refund not found")

        if req.status == 'REFUNDED' and refund['status'] != 'REFUNDED':
            # Integrate Razorpay refund
            payment = await conn.fetchrow("SELECT razorpay_payment_id FROM payments WHERE payment_id = $1", refund['payment_id'])
            if not payment or not payment['razorpay_payment_id']:
                raise HTTPException(status_code=400, detail="Associated Razorpay payment not found or uncaptured")
            try:
                razorpay_client.refund.create({
                    "payment_id": payment['razorpay_payment_id'],
                    "amount": int(float(refund['amount']) * 100),
                    "notes": {
                        "reason": refund['reason']
                    }
                })
            except Exception as e:
                logger.error(f"Razorpay refund failed: {e}")
                raise HTTPException(status_code=500, detail=f"Razorpay refund creation failed: {str(e)}")

        await conn.execute("UPDATE refunds SET status = $1 WHERE refund_id = $2", req.status, uuid.UUID(refund_id))
        updated = await conn.fetchrow("SELECT * FROM refunds WHERE refund_id = $1", uuid.UUID(refund_id))

    await log_event(
        "REFUND_UPDATED", "SUCCESS",
        f"Refund {refund_id} status updated to {req.status}",
        {"refund_id": refund_id, "new_status": req.status, "amount": float(refund['amount'])}
    )
    return row_to_dict(updated)

@api_router.get("/refunds")
async def list_refunds(academic_year: Optional[str] = None, status: Optional[str] = None, admin=Depends(get_current_admin)):
    pool = await get_pool()
    query = """SELECT ref.*, b.academic_year, b.program_name
               FROM refunds ref JOIN payments p ON ref.payment_id = p.payment_id
               JOIN bills b ON p.bill_id = b.bill_id WHERE 1=1"""
    params = []
    idx = 1
    if academic_year:
        query += f" AND b.academic_year = ${idx}"
        params.append(academic_year)
        idx += 1
    if status:
        query += f" AND ref.status = ${idx}"
        params.append(status)
        idx += 1
    query += " ORDER BY ref.created_at DESC"
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
    return rows_to_list(rows)

# ── Dashboard Stats ──

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(academic_year: Optional[str] = None, admin=Depends(get_current_admin)):
    pool = await get_pool()
    year_filter = ""
    params = []
    idx = 1
    if academic_year:
        year_filter = f" AND academic_year = ${idx}"
        params.append(academic_year)

    async with pool.acquire() as conn:
        total_bills = await conn.fetchval(f"SELECT COUNT(*) FROM bills WHERE 1=1{year_filter}", *params)
        paid_bills = await conn.fetchval(f"SELECT COUNT(*) FROM bills WHERE status = 'PAID'{year_filter}", *params)
        unpaid_bills = await conn.fetchval(f"SELECT COUNT(*) FROM bills WHERE status = 'UNPAID'{year_filter}", *params)
        total_revenue = await conn.fetchval(f"SELECT COALESCE(SUM(amount), 0) FROM bills WHERE status = 'PAID'{year_filter}", *params)
        total_pending_amount = await conn.fetchval(f"SELECT COALESCE(SUM(amount), 0) FROM bills WHERE status = 'UNPAID'{year_filter}", *params)
        total_students = await conn.fetchval(f"SELECT COUNT(DISTINCT user_id) FROM bills WHERE 1=1{year_filter}", *params)

        refund_filter = ""
        refund_params = []
        if academic_year:
            refund_filter = " AND b.academic_year = $1"
            refund_params = [academic_year]
        total_refunds = await conn.fetchval(
            f"""SELECT COALESCE(SUM(ref.amount), 0) FROM refunds ref
                JOIN payments p ON ref.payment_id = p.payment_id
                JOIN bills b ON p.bill_id = b.bill_id WHERE ref.status = 'REFUNDED'{refund_filter}""",
            *refund_params
        )
        pending_refunds = await conn.fetchval(
            f"""SELECT COUNT(*) FROM refunds ref
                JOIN payments p ON ref.payment_id = p.payment_id
                JOIN bills b ON p.bill_id = b.bill_id WHERE ref.status = 'PENDING'{refund_filter}""",
            *refund_params
        )

        # Program wise breakdown
        program_stats = await conn.fetch(
            f"""SELECT program_name,
                       COUNT(*) FILTER (WHERE status = 'PAID') as paid,
                       COUNT(*) FILTER (WHERE status = 'UNPAID') as unpaid,
                       COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) as collected,
                       COALESCE(SUM(amount) FILTER (WHERE status = 'UNPAID'), 0) as pending
                FROM bills WHERE bill_type = 'ACADEMIC'{year_filter}
                GROUP BY program_name ORDER BY program_name""",
            *params
        )

        # Monthly collection
        monthly_collection = await conn.fetch(
            f"""SELECT TO_CHAR(p.created_at, 'YYYY-MM') as month,
                       COALESCE(SUM(p.amount), 0) as total
                FROM payments p JOIN bills b ON p.bill_id = b.bill_id
                WHERE p.status = 'SUCCESS'{year_filter.replace('academic_year', 'b.academic_year')}
                GROUP BY month ORDER BY month""",
            *params
        )

    # Academic years for dropdown
    async with pool.acquire() as conn:
        years = await conn.fetch("SELECT DISTINCT academic_year FROM bills ORDER BY academic_year DESC")

    return {
        "total_bills": total_bills,
        "paid_bills": paid_bills,
        "unpaid_bills": unpaid_bills,
        "total_revenue": float(total_revenue),
        "total_pending_amount": float(total_pending_amount),
        "total_students": total_students,
        "total_refunds": float(total_refunds),
        "pending_refunds": pending_refunds,
        "program_stats": rows_to_list(program_stats),
        "monthly_collection": rows_to_list(monthly_collection),
        "academic_years": [r['academic_year'] for r in years]
    }

@api_router.get("/dashboard/academic-years")
async def get_academic_years():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT DISTINCT academic_year FROM bills ORDER BY academic_year DESC")
    return [r['academic_year'] for r in rows]

# ── Health ──

@api_router.get("/")
async def root():
    return {"message": "College ERP - Fees & Billing Module API", "status": "running"}

@api_router.get("/health")
async def health():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.fetchval("SELECT 1")
    return {"status": "healthy", "database": "connected"}

# ── Include Router & CORS ──

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
