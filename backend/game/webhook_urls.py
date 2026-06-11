from django.urls import path
from .webhook_view import WebhookView

urlpatterns = [
    path('', WebhookView.as_view(), name='webhook'),
]
