from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta
import uuid
import random

from .models import User, UserProfile, EmailVerification, PasswordReset, BitcoinTransaction
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    UserUpdateSerializer, PasswordChangeSerializer, EmailVerificationSerializer,
    PasswordResetRequestSerializer, PasswordResetSerializer, BalanceSerializer,
    TwoFactorSetupSerializer, AccountStatusSerializer, BitcoinBalanceSerializer,
    BitcoinTransactionSerializer, BitcoinSendSerializer, BitcoinPriceSerializer
)
from api.services import trigger_account_created_notification
from .services import BitcoinService


class UserRegistrationView(APIView):
    """View for user registration."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Register a new user."""
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Create email verification code (6-digit)
            code = str(random.randint(100000, 999999))
            expires_at = timezone.now() + timedelta(minutes=10)  # 10 minutes expiry
            
            EmailVerification.objects.create(
                user=user,
                token=code,  # Store 6-digit code as token
                expires_at=expires_at
            )
            
            # Send verification email
            self.send_verification_email(user, code)
            
            # Trigger welcome notification
            trigger_account_created_notification(user)
            
            return Response({
                'message': 'User registered successfully. Please check your email to verify your account.',
                'user_id': user.id
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def send_verification_email(self, user, code):
        """Send verification email to user."""
        try:
            subject = 'Verify your PrimeTrust account'
            message = f"""
            Hello {user.first_name},
            
            Thank you for registering with PrimeTrust! Your verification code is:
            
            {code}
            
            This code will expire in 10 minutes.
            
            If you didn't create this account, please ignore this email.
            
            Best regards,
            The PrimeTrust Team
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            # Log the error but don't fail the registration
            print(f"Failed to send verification email: {e}")


class UserLoginView(APIView):
    """View for user login."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Authenticate user and return tokens."""
        serializer = UserLoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Update last login IP
            user.last_login_ip = self.get_client_ip(request)
            user.save()
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserLogoutView(APIView):
    """View for user logout."""
    
    permission_classes = [permissions.AllowAny]  # Allow logout even with expired tokens
    
    def post(self, request):
        """Logout user and blacklist refresh token."""
        print(f"Logout request received. Data: {request.data}")
        print(f"Headers: {request.headers}")
        
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                    print("Token blacklisted successfully")
                except Exception as e:
                    print(f"Token blacklist failed: {e}")
                    # Token might be invalid, but that's okay for logout
                    pass
            
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Logout exception: {e}")
            # Always return success for logout, even if token is invalid
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)


class EmailVerificationView(APIView):
    """View for email verification."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Verify user email with code."""
        # Handle both 'token' and 'code' fields for compatibility
        token = request.data.get('token') or request.data.get('code')
        email = request.data.get('email')
        
        if not token:
            return Response({'error': 'Verification code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Find verification by token/code
            verification = EmailVerification.objects.get(token=token)
            
            if verification.is_used:
                return Response({'error': 'Verification code has already been used'}, status=status.HTTP_400_BAD_REQUEST)
            
            if verification.is_expired():
                return Response({'error': 'Verification code has expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark email as verified
            user = verification.user
            user.email_verified = True
            user.save()
            
            # Mark verification as used
            verification.is_used = True
            verification.save()
            
            return Response({'message': 'Email verified successfully'}, status=status.HTTP_200_OK)
            
        except EmailVerification.DoesNotExist:
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """View for requesting password reset."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Send password reset email."""
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email=email)
                
                # Create reset token
                token = str(uuid.uuid4())
                expires_at = timezone.now() + timedelta(hours=1)
                
                PasswordReset.objects.create(
                    user=user,
                    token=token,
                    expires_at=expires_at
                )
                
                # Send reset email
                self.send_reset_email(user, token)
                
                return Response({
                    'message': 'Password reset email sent successfully'
                }, status=status.HTTP_200_OK)
                
            except User.DoesNotExist:
                # Don't reveal if user exists or not
                return Response({
                    'message': 'If an account with this email exists, a password reset link has been sent.'
                }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def send_reset_email(self, user, token):
        """Send password reset email."""
        try:
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            
            subject = 'Reset your PrimeTrust password'
            message = f"""
            Hello {user.first_name},
            
            You requested a password reset for your PrimeTrust account. Click the link below to reset your password:
            
            {reset_url}
            
            This link will expire in 1 hour.
            
            If you didn't request this reset, please ignore this email.
            
            Best regards,
            The PrimeTrust Team
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send reset email: {e}")


class PasswordResetView(APIView):
    """View for password reset."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Reset password with token."""
        serializer = PasswordResetSerializer(data=request.data)
        
        if serializer.is_valid():
            reset = serializer.validated_data['reset']
            new_password = serializer.validated_data['new_password']
            
            # Update password
            user = reset.user
            user.set_password(new_password)
            user.save()
            
            # Mark reset as used
            reset.is_used = True
            reset.save()
            
            return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """View for user profile."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user


class UserUpdateView(generics.UpdateAPIView):
    """View for updating user information."""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserUpdateSerializer
    
    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    """View for changing password."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Change user password."""
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = request.user
            new_password = serializer.validated_data['new_password']
            
            user.set_password(new_password)
            user.save()
            
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BalanceView(APIView):
    """View for account balance."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user account balance and basic info."""
        user = request.user
        
        # Ensure account number is generated if not exists
        if not user.account_number:
            user.save()  # This will trigger account number generation
        
        serializer = BalanceSerializer({
            'balance': user.balance,
            'currency': 'USD',
            'last_updated': user.updated_at
        })
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class AccountInfoView(APIView):
    """View for complete account information."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get complete user account information."""
        user = request.user
        
        # Ensure account number is generated if not exists
        if not user.account_number:
            user.save()  # This will trigger account number generation
        
        account_data = {
            'id': user.id,
            'account_number': user.account_number,
            'routing_number': user.routing_number,
            'balance': user.balance,
            'account_type': 'Savings',  # Default account type
            'status': 'Active',
            'currency': 'USD',
            'created_at': user.created_at,
            'last_updated': user.updated_at,
            'is_verified': user.is_verified,
            'email_verified': user.email_verified,
            'phone_verified': user.phone_verified,
        }
        
        return Response(account_data, status=status.HTTP_200_OK)


class TwoFactorSetupView(APIView):
    """View for two-factor authentication setup."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Enable or disable two-factor authentication."""
        serializer = TwoFactorSetupSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = request.user
            enable = serializer.validated_data['enable']
            
            user.two_factor_enabled = enable
            user.save()
            
            status_text = 'enabled' if enable else 'disabled'
            return Response({
                'message': f'Two-factor authentication {status_text} successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AccountStatusView(APIView):
    """View for account status information."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get account status information."""
        user = request.user
        
        serializer = AccountStatusSerializer({
            'is_verified': user.is_verified,
            'email_verified': user.email_verified,
            'phone_verified': user.phone_verified,
            'two_factor_enabled': user.two_factor_enabled,
            'account_locked': user.is_account_locked(),
            'failed_login_attempts': user.failed_login_attempts,
            'account_locked_until': user.account_locked_until
        })
        
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def resend_verification_email(request):
    """Resend verification email."""
    user = request.user
    
    if user.email_verified:
        return Response({'error': 'Email is already verified'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Delete existing verification tokens
    EmailVerification.objects.filter(user=user, is_used=False).delete()
    
    # Create new verification code (6-digit)
    code = str(random.randint(100000, 999999))
    expires_at = timezone.now() + timedelta(minutes=10)
    
    EmailVerification.objects.create(
        user=user,
        token=code,
        expires_at=expires_at
    )
    
    # Send verification email
    try:
        subject = 'Verify your PrimeTrust account'
        message = f"""
        Hello {user.first_name},
        
        Your new verification code is:
        
        {code}
        
        This code will expire in 10 minutes.
        
        Best regards,
        The PrimeTrust Team
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return Response({'message': 'Verification email sent successfully'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': 'Failed to send verification email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BitcoinBalanceView(APIView):
    """View for Bitcoin balance information."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's Bitcoin balance and current price."""
        user = request.user
        
        # Get real Bitcoin price from CoinGecko API
        price_data = BitcoinService.get_bitcoin_price()
        bitcoin_price_usd = price_data['price_usd']
        
        bitcoin_balance_usd = float(user.bitcoin_balance) * float(bitcoin_price_usd)
        
        serializer = BitcoinBalanceSerializer({
            'bitcoin_balance': user.bitcoin_balance,
            'bitcoin_wallet_address': user.bitcoin_wallet_address,
            'bitcoin_price_usd': bitcoin_price_usd,
            'bitcoin_balance_usd': bitcoin_balance_usd,
        })
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class BitcoinPriceView(APIView):
    """View for current Bitcoin price."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current Bitcoin price."""
        # Get real Bitcoin price from CoinGecko API
        price_data = BitcoinService.get_bitcoin_price()
        
        serializer = BitcoinPriceSerializer({
            'price_usd': price_data['price_usd'],
            'price_change_24h': price_data['price_change_24h'],
            'price_change_percentage_24h': price_data['price_change_percentage_24h'],
            'last_updated': timezone.now(),
        })
        return Response(serializer.data, status=status.HTTP_200_OK)


class BitcoinSendView(APIView):
    """View for sending Bitcoin."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Send Bitcoin transaction."""
        serializer = BitcoinSendSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = request.user
            data = serializer.validated_data
            
            # Validate recipient wallet address
            if not BitcoinService.validate_bitcoin_address(data['recipient_wallet_address']):
                return Response(
                    {'error': 'Invalid Bitcoin wallet address'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get real Bitcoin price
            price_data = BitcoinService.get_bitcoin_price()
            bitcoin_price_usd = price_data['price_usd']
            
            # Calculate amounts
            if data['balance_source'] == 'fiat':
                amount_usd = data['amount_usd']
                amount_btc = amount_usd / float(bitcoin_price_usd)
            else:
                amount_btc = data['amount_btc']
                amount_usd = amount_btc * float(bitcoin_price_usd)
            
            # Validate user has sufficient balance
            if data['balance_source'] == 'fiat':
                if user.balance < amount_usd:
                    return Response(
                        {'error': 'Insufficient fiat balance'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                if user.bitcoin_balance < amount_btc:
                    return Response(
                        {'error': 'Insufficient Bitcoin balance'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Estimate real transaction fee
            transaction_fee_btc = BitcoinService.estimate_transaction_fee(amount_btc)
            transaction_fee_usd = transaction_fee_btc * float(bitcoin_price_usd)
            
            # Create Bitcoin transaction record
            transaction = BitcoinTransaction.objects.create(
                user=user,
                transaction_type='send',
                balance_source=data['balance_source'],
                amount_usd=amount_usd,
                amount_btc=amount_btc,
                bitcoin_price_at_time=bitcoin_price_usd,
                recipient_wallet_address=data['recipient_wallet_address'],
                recipient_name=data.get('recipient_name', ''),
                transaction_fee=transaction_fee_usd,
                status='processing'
            )
            
            try:
                # Create actual blockchain transaction
                # Note: In production, you would use a proper wallet service
                if user.bitcoin_wallet_address:
                    blockchain_tx = BitcoinService.create_bitcoin_transaction(
                        from_address=user.bitcoin_wallet_address,
                        to_address=data['recipient_wallet_address'],
                        amount_btc=amount_btc
                    )
                    
                    if blockchain_tx:
                        transaction.blockchain_tx_id = blockchain_tx['tx_hash']
                        transaction.status = 'processing'
                    else:
                        transaction.status = 'failed'
                else:
                    # For users without wallet addresses, simulate the transaction
                    transaction.blockchain_tx_id = f"simulated_tx_{transaction.id}"
                    transaction.status = 'processing'
                
                # Update user balance immediately (in production, this would wait for confirmation)
                if data['balance_source'] == 'fiat':
                    user.balance -= amount_usd
                else:
                    user.bitcoin_balance -= amount_btc
                
                user.save()
                transaction.save()
                
                # Trigger notification
                from api.services import trigger_bitcoin_transaction_notification
                trigger_bitcoin_transaction_notification(user, transaction)
                
                return Response({
                    'message': 'Bitcoin transaction initiated successfully',
                    'transaction_id': transaction.id,
                    'status': transaction.status,
                    'blockchain_tx_id': transaction.blockchain_tx_id,
                    'transaction_fee': transaction_fee_usd
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                transaction.status = 'failed'
                transaction.save()
                return Response(
                    {'error': f'Transaction failed: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BitcoinTransactionListView(APIView):
    """View for listing Bitcoin transactions."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's Bitcoin transaction history."""
        user = request.user
        transactions = BitcoinTransaction.objects.filter(user=user)
        
        serializer = BitcoinTransactionSerializer(transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BitcoinTransactionDetailView(APIView):
    """View for Bitcoin transaction details."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, transaction_id):
        """Get specific Bitcoin transaction details."""
        try:
            transaction = BitcoinTransaction.objects.get(
                id=transaction_id, 
                user=request.user
            )
            serializer = BitcoinTransactionSerializer(transaction)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except BitcoinTransaction.DoesNotExist:
            return Response(
                {'error': 'Transaction not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )