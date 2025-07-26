from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, UserProfile, EmailVerification, PasswordReset
from django.utils import timezone
from datetime import timedelta
import uuid


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 'password', 
            'confirm_password', 'phone_number', 'address', 'city', 'state', 
            'zip_code', 'country'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'confirm_password': {'write_only': True},
        }
    
    def validate(self, attrs):
        """Validate registration data."""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate password strength
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError({'password': e.messages})
        
        # Check if email already exists
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'User with this email already exists'})
        
        # Check if username already exists
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({'username': 'User with this username already exists'})
        
        return attrs
    
    def create(self, validated_data):
        """Create a new user."""
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        
        # Create user profile
        UserProfile.objects.create(user=user)
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate login credentials."""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            
            if not user:
                raise serializers.ValidationError('Invalid email or password')
            
            if not user.is_active:
                raise serializers.ValidationError('Account is disabled')
            
            if user.is_account_locked():
                raise serializers.ValidationError('Account is temporarily locked due to multiple failed login attempts')
            
            # Reset failed login attempts on successful login
            user.reset_failed_login()
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include email and password')


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    
    class Meta:
        model = UserProfile
        fields = [
            'date_of_birth', 'gender', 'employer', 'job_title', 'annual_income',
            'preferred_currency', 'language', 'timezone', 'receive_email_notifications',
            'receive_sms_notifications', 'receive_marketing_emails'
        ]


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user information."""
    
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'phone_number', 'address', 'city', 'state', 'zip_code', 'country',
            'account_number', 'routing_number', 'balance', 'is_verified',
            'email_verified', 'phone_verified', 'two_factor_enabled',
            'created_at', 'last_activity', 'profile'
        ]
        read_only_fields = [
            'id', 'account_number', 'routing_number', 'balance', 'is_verified',
            'email_verified', 'phone_verified', 'created_at', 'last_activity'
        ]
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user information."""
    
    profile = UserProfileSerializer()
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone_number', 'address', 'city',
            'state', 'zip_code', 'country', 'profile'
        ]
    
    def update(self, instance, validated_data):
        """Update user and profile information."""
        profile_data = validated_data.pop('profile', {})
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update profile fields
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing password."""
    
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate password change data."""
        user = self.context['request'].user
        
        # Check current password
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': 'Current password is incorrect'})
        
        # Check if new passwords match
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': 'New passwords don\'t match'})
        
        # Validate new password strength
        try:
            validate_password(attrs['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})
        
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """Serializer for email verification."""
    
    token = serializers.CharField()
    
    def validate_token(self, value):
        """Validate verification token."""
        try:
            verification = EmailVerification.objects.get(token=value)
            
            if verification.is_used:
                raise serializers.ValidationError('Verification token has already been used')
            
            if verification.is_expired():
                raise serializers.ValidationError('Verification token has expired')
            
            return value
        except EmailVerification.DoesNotExist:
            raise serializers.ValidationError('Invalid verification token')


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset."""
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Validate email exists."""
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError('No user found with this email address')
        return value


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset."""
    
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate password reset data."""
        # Check if passwords match
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': 'Passwords don\'t match'})
        
        # Validate password strength
        try:
            validate_password(attrs['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})
        
        # Validate token
        try:
            reset = PasswordReset.objects.get(token=attrs['token'])
            
            if reset.is_used:
                raise serializers.ValidationError({'token': 'Reset token has already been used'})
            
            if reset.is_expired():
                raise serializers.ValidationError({'token': 'Reset token has expired'})
            
            attrs['reset'] = reset
            return attrs
        except PasswordReset.DoesNotExist:
            raise serializers.ValidationError({'token': 'Invalid reset token'})


class BalanceSerializer(serializers.Serializer):
    """Serializer for account balance."""
    
    balance = serializers.DecimalField(max_digits=15, decimal_places=2)
    currency = serializers.CharField(default='USD')
    last_updated = serializers.DateTimeField()


class TwoFactorSetupSerializer(serializers.Serializer):
    """Serializer for two-factor authentication setup."""
    
    enable = serializers.BooleanField()
    
    def validate(self, attrs):
        """Validate 2FA setup."""
        user = self.context['request'].user
        
        if attrs['enable'] and not user.phone_verified:
            raise serializers.ValidationError('Phone number must be verified to enable two-factor authentication')
        
        return attrs


class AccountStatusSerializer(serializers.Serializer):
    """Serializer for account status information."""
    
    is_verified = serializers.BooleanField()
    email_verified = serializers.BooleanField()
    phone_verified = serializers.BooleanField()
    two_factor_enabled = serializers.BooleanField()
    account_locked = serializers.BooleanField()
    failed_login_attempts = serializers.IntegerField()
    account_locked_until = serializers.DateTimeField(allow_null=True) 