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

from .models import User, UserProfile, EmailVerification, PasswordReset
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    UserUpdateSerializer, PasswordChangeSerializer, EmailVerificationSerializer,
    PasswordResetRequestSerializer, PasswordResetSerializer, BalanceSerializer,
    TwoFactorSetupSerializer, AccountStatusSerializer
)


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
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Logout user and blacklist refresh token."""
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


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
        """Get user account balance."""
        user = request.user
        
        serializer = BalanceSerializer({
            'balance': user.balance,
            'currency': 'USD',
            'last_updated': user.updated_at
        })
        
        return Response(serializer.data, status=status.HTTP_200_OK)


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
