import razorpay
import os
from app.core.config import settings

razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

def verify_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        return True
    except Exception:
        return False
