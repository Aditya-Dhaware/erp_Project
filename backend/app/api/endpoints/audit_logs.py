from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.api import deps
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLog as AuditLogSchema
from app.models.admin import AdminUser

router = APIRouter()

@router.get("/", response_model=List[AuditLogSchema])
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(deps.get_current_admin)
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)
    )
    return result.scalars().all()
