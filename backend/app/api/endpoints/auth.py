from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.api import deps
from app.core import security
from app.db.session import get_db
from app.models.admin import AdminUser
from app.schemas.admin import LoginRequest, AdminUser as AdminUserSchema
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/login")
async def login(
    req: LoginRequest, 
    db: AsyncSession = Depends(get_db)
):
    email = req.email.lower().strip()
    logger.info(f"Login attempt: email='{email}'")
    
    result = await db.execute(select(AdminUser).where(AdminUser.email == email))
    admin = result.scalar_one_or_none()
    
    if not admin:
        logger.warning(f"Login FAILED: User '{email}' NOT FOUND.")
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not security.verify_password(req.password, admin.password_hash):
        logger.warning(f"Login FAILED: Password MISMATCH for user '{email}'")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    logger.info(f"Login SUCCESS: User '{email}' authenticated.")
    token = security.create_access_token(admin.id, admin.email)
    
    return {
        "token": token, 
        "user": {
            "id": str(admin.id), 
            "email": admin.email, 
            "name": admin.name
        }
    }

@router.post("/logout")
async def logout(response: Response):
    # For token based auth, logout is usually handled on frontend by clearing token.
    # But we can provide an endpoint for completeness.
    return {"message": "Logged out"}

@router.get("/me", response_model=AdminUserSchema)
async def get_me(admin: AdminUser = Depends(deps.get_current_admin)):
    return admin
