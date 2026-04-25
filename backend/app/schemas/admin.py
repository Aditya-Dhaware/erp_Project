from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class AdminUserBase(BaseModel):
    email: EmailStr
    name: str

class AdminUserCreate(AdminUserBase):
    password: str

class AdminUserUpdate(AdminUserBase):
    password: Optional[str] = None

class AdminUser(AdminUserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
