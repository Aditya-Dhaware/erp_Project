from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel

class AuditLogBase(BaseModel):
    event_name: str
    status: str
    description: Optional[str] = None
    log_metadata: Optional[Any] = None

class AuditLog(AuditLogBase):
    log_id: str
    created_at: datetime

    class Config:
        from_attributes = True
