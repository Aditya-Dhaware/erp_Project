import asyncpg
import os
import logging

logger = logging.getLogger(__name__)

pool = None

async def get_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(
            dsn=os.environ['DATABASE_URL'],
            min_size=2,
            max_size=10
        )
    return pool

async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None

async def init_db():
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute('''
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";

            CREATE TABLE IF NOT EXISTS admin_users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS bills (
                bill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                academic_year VARCHAR(20) NOT NULL,
                program_name VARCHAR(255),
                bill_type VARCHAR(50) NOT NULL DEFAULT 'TUITION',
                amount NUMERIC(12, 2) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
                installment_number INTEGER,
                total_installments INTEGER,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS payments (
                payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bill_id UUID NOT NULL REFERENCES bills(bill_id),
                user_id UUID NOT NULL,
                razorpay_order_id VARCHAR(255),
                razorpay_payment_id VARCHAR(255),
                razorpay_signature VARCHAR(255),
                amount NUMERIC(12, 2) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS receipts (
                receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                payment_id UUID NOT NULL REFERENCES payments(payment_id),
                bill_id UUID NOT NULL REFERENCES bills(bill_id),
                user_id UUID NOT NULL,
                receipt_number VARCHAR(50) UNIQUE NOT NULL,
                amount NUMERIC(12, 2) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS refunds (
                refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                payment_id UUID NOT NULL REFERENCES payments(payment_id),
                user_id UUID NOT NULL,
                amount NUMERIC(12, 2) NOT NULL,
                reason TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
            CREATE INDEX IF NOT EXISTS idx_bills_academic_year ON bills(academic_year);
            CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
            CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
            CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
            CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
            CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
        ''')
    logger.info("Database tables initialized successfully")
