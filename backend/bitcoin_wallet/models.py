from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
import os
import uuid


def qr_code_upload_path(instance, filename):
    """Generate upload path for QR code images"""
    ext = filename.split('.')[-1]
    filename = f"{instance.user.username}_qr_code.{ext}"
    return os.path.join('bitcoin_qr_codes', filename)


class BitcoinWallet(models.Model):
    """Model for storing user's Bitcoin wallet information"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bitcoin_wallet')
    wallet_address = models.CharField(max_length=100, blank=True, help_text="Bitcoin wallet address")
    qr_code = models.ImageField(
        upload_to=qr_code_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['png', 'jpg', 'jpeg', 'gif'])],
        blank=True,
        null=True,
        help_text="QR code image for the wallet address"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bitcoin Wallet"
        verbose_name_plural = "Bitcoin Wallets"

    def __str__(self):
        return f"{self.user.username}'s Bitcoin Wallet"

    def get_qr_code_url(self):
        """Return the URL for the QR code image"""
        if self.qr_code:
            return self.qr_code.url
        return None


class IncomingBitcoinTransaction(models.Model):
    """Model for tracking incoming Bitcoin transactions"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='incoming_bitcoin_transactions')
    transaction_hash = models.CharField(max_length=100, unique=True, help_text="Bitcoin transaction hash")
    amount_btc = models.DecimalField(max_digits=18, decimal_places=8, help_text="Amount in Bitcoin")
    amount_usd = models.DecimalField(max_digits=12, decimal_places=2, help_text="Amount in USD")
    sender_address = models.CharField(max_length=100, help_text="Sender's Bitcoin address")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    confirmation_count = models.IntegerField(default=0, help_text="Number of blockchain confirmations")
    required_confirmations = models.IntegerField(default=3, help_text="Required confirmations for completion")
    block_height = models.IntegerField(null=True, blank=True, help_text="Block height when transaction was included")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Admin notes
    admin_notes = models.TextField(blank=True, help_text="Admin notes about this transaction")
    is_manually_approved = models.BooleanField(default=False, help_text="Whether admin manually approved this transaction")

    class Meta:
        verbose_name = "Incoming Bitcoin Transaction"
        verbose_name_plural = "Incoming Bitcoin Transactions"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.amount_btc} BTC - {self.status}"

    def is_confirmed(self):
        """Check if transaction has enough confirmations"""
        return self.confirmation_count >= self.required_confirmations

    def can_be_completed(self):
        """Check if transaction can be marked as completed"""
        return self.status == 'confirmed' and self.is_confirmed()

    def mark_as_completed(self):
        """Mark transaction as completed and update user's Bitcoin balance"""
        if self.can_be_completed():
            from django.utils import timezone
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.save()
            
            # Update user's Bitcoin balance
            try:
                bitcoin_balance = self.user.bitcoin_balance
                bitcoin_balance.balance += self.amount_btc
                bitcoin_balance.save()
            except:
                # Create Bitcoin balance if it doesn't exist
                from accounts.models import BitcoinBalance
                BitcoinBalance.objects.create(
                    user=self.user,
                    balance=self.amount_btc
                )
            
            return True
        return False