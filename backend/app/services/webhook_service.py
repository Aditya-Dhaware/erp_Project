import httpx
import logging
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_payment_webhook(payload: dict):
    webhook_url = settings.ADMISSION_WEBHOOK_URL
    secret = settings.ADMISSION_INTEGRATION_SECRET
    headers = {
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(webhook_url, json=payload, headers=headers, timeout=5.0)
            logger.info(f"[Webhook] Sent payload to {webhook_url}. Response: {resp.status_code}")
    except Exception as e:
        logger.error(f"[Webhook] Failed to send webhook to {webhook_url}: {e}")

async def send_sis_fee_update(user_id: str, total_paid: float, total_pending: float):
    sis_base_url = settings.SIS_MODULE_URL
    patch_url = f"{sis_base_url}/api/students/{user_id}/fees"
    payload = {
        "user_id": user_id,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.patch(patch_url, json=payload, timeout=5.0)
            logger.info(f"[SIS PATCH] Sent fee update to {patch_url}. Response: {resp.status_code}")
            if resp.status_code >= 400:
                logger.error(f"[SIS PATCH] Error response body: {resp.text}")
    except Exception as e:
        logger.error(f"[SIS PATCH] Failed to send fee update to {patch_url}: {e}")
