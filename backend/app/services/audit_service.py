import uuid
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

async def log_event(
    event_name: str, 
    status: str, 
    description: str = None, 
    metadata: dict = None,
    db: AsyncSession = None
):
    """Insert an audit log entry into the audit_logs table."""
    log_entry = AuditLog(
        log_id=str(uuid.uuid4()),
        event_name=event_name,
        status=status,
        description=description,
        log_metadata=metadata
    )
    
    if db:
        db.add(log_entry)
        await db.flush()
    else:
        async with AsyncSessionLocal() as session:
            session.add(log_entry)
            await session.commit()
