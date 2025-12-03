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
            
            # Send real-time notification
            from socketio_app.utils import notify_bitcoin_transaction, send_notification
            notify_bitcoin_transaction(self.user.id, self.id, self.status, 'incoming')
            send_notification(
                self.user.id,
                'Bitcoin Received',
                f'Received {self.amount_btc} BTC (${self.amount_usd}) from {self.sender_address[:12]}...',
                'success'
            )
            
            return True
        return False

class OutgoingBitcoinTransaction(models.Model):
    """Model for tracking outgoing Bitcoin transactions (sending Bitcoin)"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    BALANCE_SOURCE_CHOICES = [
        ('fiat', 'Fiat Balance'),
        ('bitcoin', 'Bitcoin Balance'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='outgoing_bitcoin_transactions')
    balance_source = models.CharField(max_length=10, choices=BALANCE_SOURCE_CHOICES, default='fiat', help_text="Source of funds")
    recipient_wallet_address = models.CharField(max_length=100, help_text="Recipient's Bitcoin address")
    amount_btc = models.DecimalField(max_digits=18, decimal_places=8, help_text="Amount in Bitcoin")
    amount_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Amount in USD (if paid from fiat)")
    bitcoin_price_at_time = models.DecimalField(max_digits=12, decimal_places=2, help_text="Bitcoin price at transaction time")
    transaction_fee = models.DecimalField(max_digits=18, decimal_places=8, default=0.00001, help_text="Network transaction fee in BTC")
    transaction_hash = models.CharField(max_length=100, unique=True, blank=False, null=False, help_text="Bitcoin transaction hash")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Admin notes
    admin_notes = models.TextField(blank=True, help_text="Admin notes about this transaction")

    class Meta:
        verbose_name = "Outgoing Bitcoin Transaction"
        verbose_name_plural = "Outgoing Bitcoin Transactions"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} -> {self.recipient_wallet_address[:10]}... - {self.amount_btc} BTC - {self.status}"

    def save(self, *args, **kwargs):
        # Generate transaction hash if not exists
        if not self.transaction_hash:
            self.transaction_hash = self.generate_transaction_hash()
        super().save(*args, **kwargs)

    def generate_transaction_hash(self):
        """Generate a unique transaction hash"""
        import hashlib
        import uuid
        unique_id = uuid.uuid4()
        data = f"{self.user.id}{self.recipient_wallet_address}{self.amount_btc}{unique_id}"
        return hashlib.sha256(data.encode()).hexdigest()

    def process_transaction(self):
        """Process the outgoing Bitcoin transaction"""
        from django.utils import timezone
        from django.db import transaction
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        try:
            with transaction.atomic():
                # Lock the user row to prevent concurrent balance modifications
                user = User.objects.select_for_update().get(pk=self.user.pk)
                
                # Update status to processing
                self.status = 'processing'
                self.save()
                
                if self.balance_source == 'fiat':
                    # Check if amount_usd is None
                    if self.amount_usd is None:
                        self.status = 'failed'
                        self.admin_notes = 'Missing amount_usd for fiat withdrawal'
                        self.save()
                        return False
                    
                    # Re-check balance after acquiring lock
                    if user.balance < self.amount_usd:
                        self.status = 'failed'
                        self.admin_notes = 'Insufficient fiat balance'
                        self.save()
                        return False
                    
                    # Deduct USD from user's account
                    user.balance -= self.amount_usd
                    user.save(update_fields=['balance'])
                    
                elif self.balance_source == 'bitcoin':
                    # Re-check Bitcoin balance after acquiring lock
                    current_btc_balance = user.bitcoin_balance or 0
                    total_btc_needed = self.amount_btc + self.transaction_fee
                    
                    if current_btc_balance < total_btc_needed:
                        self.status = 'failed'
                        self.admin_notes = 'Insufficient Bitcoin balance'
                        self.save()
                        return False
                    
                    # Deduct Bitcoin from user's balance
                    user.bitcoin_balance = current_btc_balance - total_btc_needed
                    user.save(update_fields=['bitcoin_balance'])
                
                # Mark as completed
                self.status = 'completed'
                self.completed_at = timezone.now()
                self.save()
                
                # Send real-time notification
                from socketio_app.utils import notify_bitcoin_transaction, send_notification
                notify_bitcoin_transaction(user.id, self.id, self.status, 'outgoing')
                send_notification(
                    user.id,
                    'Bitcoin Sent',
                    f'Successfully sent {self.amount_btc} BTC to {self.recipient_wallet_address[:12]}...',
                    'success'
                )
                
                return True
            
        except Exception as e:
            self.status = 'failed'
            self.admin_notes = str(e)
            self.save()
            return False


class CurrencySwap(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    SWAP_TYPE_CHOICES = [
        ('usd_to_btc', 'USD to Bitcoin'),
        ('btc_to_usd', 'Bitcoin to USD'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet_currency_swaps')
    swap_type = models.CharField(max_length=20, choices=SWAP_TYPE_CHOICES, help_text="Type of currency swap")
    amount_from = models.DecimalField(max_digits=18, decimal_places=8, help_text="Amount being swapped from")
    amount_to = models.DecimalField(max_digits=18, decimal_places=8, help_text="Amount being swapped to")
    exchange_rate = models.DecimalField(max_digits=20, decimal_places=8, help_text="Exchange rate at time of swap")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    transaction_id = models.CharField(max_length=100, unique=True, blank=True, help_text="Unique transaction identifier")

    class Meta:
        verbose_name = "Currency Swap"
        verbose_name_plural = "Currency Swaps"
        db_table = 'wallet_currency_swaps'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.get_swap_type_display()} - {self.status}"

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            self.transaction_id = f"SWAP_{uuid.uuid4().hex[:16].upper()}"
        super().save(*args, **kwargs)

    def process_swap(self):
        """Process the swap and update balances"""
        from django.utils import timezone
        
        try:
            if self.swap_type == 'usd_to_btc':
                # Deduct USD from user's account
                self.user.balance -= self.amount_from
                self.user.save()
                
                # Add Bitcoin to user's balance (handle None case)
                current_btc_balance = self.user.bitcoin_balance or 0
                self.user.bitcoin_balance = current_btc_balance + self.amount_to
                self.user.save()
                    
            elif self.swap_type == 'btc_to_usd':
                # Deduct Bitcoin from user's balance (handle None case)
                current_btc_balance = self.user.bitcoin_balance or 0
                if current_btc_balance < self.amount_from:
                    return False
                
                self.user.bitcoin_balance = current_btc_balance - self.amount_from
                self.user.save()
                
                # Add USD to user's account
                self.user.balance += self.amount_to
                self.user.save()
            
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.save()
            return True
            
        except Exception as e:
            self.status = 'failed'
            self.save()
            return False