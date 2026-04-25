from typing import Generator
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from app.db.session import get_db
from app.core.config import settings
from app.core import security
from app.models.admin import AdminUser
from sqlalchemy import select

async def get_current_admin(
    db: AsyncSession = Depends(get_db),
    request: Request = None
) -> AdminUser:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
