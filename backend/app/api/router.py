from fastapi import APIRouter
from app.api.endpoints import (
    auth, 
    bills, 
    payments, 
    receipts, 
    refunds, 
    admission, 
    stats, 
    audit_logs,
    dashboard
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(bills.router, prefix="/bills", tags=["bills"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["receipts"])
api_router.include_router(refunds.router, prefix="/refunds", tags=["refunds"])
api_router.include_router(admission.router, prefix="/admission", tags=["admission"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
