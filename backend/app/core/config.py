import os
from pathlib import Path
from dotenv import load_dotenv
from typing import List

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "ERP Fees & Billing"
    API_V1_STR: str = "/api"
    
    SECRET_KEY: str = os.environ.get("JWT_SECRET", "secret")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    # Convert postgres:// to postgresql+asyncpg:// if necessary for SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    RAZORPAY_KEY_ID: str = os.environ.get("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.environ.get("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    
    CORS_ORIGINS: List[str] = [
        "https://thick-actors-dig.loca.lt",
        "https://eleven-masks-hope.loca.lt",
        "http://localhost:3000"
    ]
    
    ADMIN_EMAIL: str = os.environ.get("ADMIN_EMAIL", "admin@college.com")
    ADMIN_PASSWORD: str = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    
    ADMISSION_WEBHOOK_URL: str = os.environ.get(
        "ADMISSION_WEBHOOK_URL", 
        "http://localhost:8001/api/v1/payments/webhook/payment-success"
    )
    ADMISSION_INTEGRATION_SECRET: str = os.environ.get("ADMISSION_INTEGRATION_SECRET", "SUPER_SECRET_TOKEN")
    SIS_MODULE_URL: str = os.environ.get("SIS_MODULE_URL", "http://localhost:8002")

settings = Settings()
