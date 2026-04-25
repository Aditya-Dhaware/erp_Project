import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.core import security
from app.models.admin import AdminUser
from app.db.session import AsyncSessionLocal
from sqlalchemy import select

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    async with engine.begin() as conn:
        # This will create tables if they don't exist. 
        # In production, you should use Alembic.
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Seeding admin user...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == settings.ADMIN_EMAIL)
        )
        admin = result.scalar_one_or_none()
        
        if not admin:
            hashed_password = security.get_password_hash(settings.ADMIN_PASSWORD)
            new_admin = AdminUser(
                email=settings.ADMIN_EMAIL,
                password_hash=hashed_password,
                name="Super Admin"
            )
            db.add(new_admin)
            await db.commit()
            logger.info(f"Admin seeded: {settings.ADMIN_EMAIL}")
        else:
            # Optionally update password if env changed
            if not security.verify_password(settings.ADMIN_PASSWORD, admin.password_hash):
                admin.password_hash = security.get_password_hash(settings.ADMIN_PASSWORD)
                await db.commit()
                logger.info(f"Admin password updated for: {settings.ADMIN_EMAIL}")
            else:
                logger.info(f"Admin user verified: {settings.ADMIN_EMAIL}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down...")
    await engine.dispose()

@app.get("/health")
async def health():
    # Basic health check to verify DB connection
    async with AsyncSessionLocal() as db:
        await db.execute(select(1))
    return {"status": "healthy", "database": "connected"}

@app.get("/")
async def root():
    return {"message": "Welcome to ERP Fees & Billing API", "docs": "/docs"}
