from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, UserProfile, EmailVerification, PasswordReset, BitcoinTransaction
from django.utils import timezone
from datetime import timedelta
import uuid


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    date_of_birth = serializers.DateField(required=True)
    gender = serializers.ChoiceField(choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ], required=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 'password', 
            'confirm_password', 'phone_number', 'address', 'city', 'state', 
            'zip_code', 'country', 'date_of_birth', 'gender'
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
        # Extract profile data
        date_of_birth = validated_data.pop('date_of_birth')
        gender = validated_data.pop('gender')
        validated_data.pop('confirm_password')
        
        user = User.objects.create_user(**validated_data)
        
        # Ensure account number is generated
        if not user.account_number:
            user.save()  # This will trigger account number generation
        
        # Create user profile with DOB and gender
        UserProfile.objects.create(
            user=user,
            date_of_birth=date_of_birth,
            gender=gender
        )
        
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
            
            # Note: Account lock check is handled in the view to provide detailed error response
            
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
    is_account_locked = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'phone_number', 'address', 'city', 'state', 'zip_code', 'country',
            'account_number', 'routing_number', 'balance', 'bitcoin_balance', 'is_verified',
            'email_verified', 'phone_verified', 'two_factor_enabled',
            'is_staff', 'is_superuser', 'is_active', 'date_joined', 'last_login',
            'created_at', 'last_activity', 'profile', 'is_account_locked',
            'account_locked_until', 'account_lock_reason', 'unlock_request_pending'
        ]
        read_only_fields = [
            'id', 'account_number', 'routing_number', 'balance', 'is_verified',
            'email_verified', 'phone_verified', 'created_at', 'last_activity',
            'is_account_locked', 'account_locked_until', 'account_lock_reason', 'unlock_request_pending'
        ]
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
    def get_is_account_locked(self, obj):
        return obj.is_account_locked()


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


class TwoFactorInitiateSerializer(serializers.Serializer):
    """Serializer for initiating 2FA setup."""
    
    def validate(self, attrs):
        """Validate 2FA initiation."""
        user = self.context['request'].user
        
        if user.two_factor_enabled:
            raise serializers.ValidationError('Two-factor authentication is already enabled')
        
        if not user.email_verified:
            raise serializers.ValidationError('Email must be verified before setting up 2FA')
        
        return attrs


class TwoFactorVerifySerializer(serializers.Serializer):
    """Serializer for verifying 2FA setup."""
    
    code = serializers.CharField(min_length=6, max_length=6)
    
    def validate_code(self, value):
        """Validate TOTP code format."""
        if not value.isdigit():
            raise serializers.ValidationError('Code must contain only digits')
        return value


class TwoFactorLoginSerializer(serializers.Serializer):
    """Serializer for 2FA login verification."""
    
    code = serializers.CharField(min_length=6, max_length=6)
    backup_code = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate 2FA login."""
        code = attrs.get('code')
        backup_code = attrs.get('backup_code')
        
        if not code and not backup_code:
            raise serializers.ValidationError('Either TOTP code or backup code is required')
        
        if code and not code.isdigit():
            raise serializers.ValidationError('TOTP code must contain only digits')
        
        return attrs


class TransferPinSetupSerializer(serializers.Serializer):
    """Serializer for transfer PIN setup."""
    
    pin = serializers.CharField(min_length=4, max_length=4)
    confirm_pin = serializers.CharField(min_length=4, max_length=4)
    
    def validate_pin(self, value):
        """Validate PIN format and rules."""
        from .utils import validate_pin
        is_valid, error_message = validate_pin(value)
        if not is_valid:
            raise serializers.ValidationError(error_message)
        return value
    
    def validate(self, attrs):
        """Validate PIN confirmation."""
        pin = attrs.get('pin')
        confirm_pin = attrs.get('confirm_pin')
        
        if pin != confirm_pin:
            raise serializers.ValidationError('PINs do not match')
        
        return attrs


class TransferPinVerifySerializer(serializers.Serializer):
    """Serializer for transfer PIN verification."""
    
    pin = serializers.CharField(min_length=4, max_length=4)
    
    def validate_pin(self, value):
        """Validate PIN format."""
        if not value.isdigit():
            raise serializers.ValidationError('PIN must contain only digits')
        return value


class AccountStatusSerializer(serializers.Serializer):
    """Serializer for account status information."""
    
    is_verified = serializers.BooleanField()
    email_verified = serializers.BooleanField()
    phone_verified = serializers.BooleanField()
    two_factor_enabled = serializers.BooleanField()
    account_locked = serializers.BooleanField()
    failed_login_attempts = serializers.IntegerField()
    account_locked_until = serializers.DateTimeField(allow_null=True) 


class BitcoinBalanceSerializer(serializers.Serializer):
    """Serializer for Bitcoin balance information."""
    
    bitcoin_balance = serializers.DecimalField(max_digits=20, decimal_places=8)
    bitcoin_wallet_address = serializers.CharField(allow_blank=True)
    bitcoin_price_usd = serializers.DecimalField(max_digits=15, decimal_places=2)
    bitcoin_balance_usd = serializers.DecimalField(max_digits=15, decimal_places=2)


class BitcoinTransactionSerializer(serializers.ModelSerializer):
    """Serializer for Bitcoin transactions."""
    
    class Meta:
        model = BitcoinTransaction
        fields = [
            'id', 'transaction_type', 'balance_source', 'amount_usd', 'amount_btc',
            'bitcoin_price_at_time', 'recipient_wallet_address', 'recipient_name',
            'transaction_fee', 'status', 'blockchain_tx_id', 'confirmation_count',
            'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'bitcoin_price_at_time', 'status', 'blockchain_tx_id',
            'confirmation_count', 'created_at', 'updated_at', 'completed_at'
        ]


class BitcoinSendSerializer(serializers.Serializer):
    """Serializer for sending Bitcoin."""
    
    balance_source = serializers.ChoiceField(choices=[('fiat', 'Fiat Balance'), ('bitcoin', 'Bitcoin Balance')])
    amount_usd = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    amount_btc = serializers.DecimalField(max_digits=20, decimal_places=8, required=False)
    recipient_wallet_address = serializers.CharField(max_length=100)
    recipient_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    transaction_pin = serializers.CharField(max_length=10, min_length=4)
    
    def validate(self, attrs):
        """Validate the Bitcoin send transaction."""
        balance_source = attrs.get('balance_source')
        amount_usd = attrs.get('amount_usd')
        amount_btc = attrs.get('amount_btc')
        
        # Ensure at least one amount is provided
        if not amount_usd and not amount_btc:
            raise serializers.ValidationError("Either amount_usd or amount_btc must be provided")
        
        # Validate based on balance source
        if balance_source == 'fiat':
            if not amount_usd:
                raise serializers.ValidationError("USD amount is required when using fiat balance")
            if amount_usd > 100000:
                raise serializers.ValidationError("Maximum transfer limit is $100,000")
        else:  # bitcoin balance
            if not amount_btc:
                raise serializers.ValidationError("BTC amount is required when using bitcoin balance")
        
        # Validate transaction PIN
        user = self.context['request'].user
        if attrs.get('transaction_pin') != user.transaction_pin:
            raise serializers.ValidationError("Invalid transaction PIN")
        
        return attrs


class BitcoinPriceSerializer(serializers.Serializer):
    """Serializer for Bitcoin price information."""
    
    price_usd = serializers.DecimalField(max_digits=15, decimal_places=2)
    price_change_24h = serializers.DecimalField(max_digits=10, decimal_places=2)
    price_change_percentage_24h = serializers.DecimalField(max_digits=10, decimal_places=2)
    last_updated = serializers.DateTimeField() 