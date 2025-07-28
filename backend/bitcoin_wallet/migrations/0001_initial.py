# Generated manually for Bitcoin Wallet app

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='BitcoinWallet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('wallet_address', models.CharField(blank=True, help_text='Bitcoin wallet address', max_length=100)),
                ('qr_code', models.ImageField(blank=True, help_text='QR code image for the wallet address', null=True, upload_to='bitcoin_qr_codes', validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['png', 'jpg', 'jpeg', 'gif'])])),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='bitcoin_wallet', to='auth.user')),
            ],
            options={
                'verbose_name': 'Bitcoin Wallet',
                'verbose_name_plural': 'Bitcoin Wallets',
            },
        ),
        migrations.CreateModel(
            name='IncomingBitcoinTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transaction_hash', models.CharField(help_text='Bitcoin transaction hash', max_length=100, unique=True)),
                ('amount_btc', models.DecimalField(decimal_places=8, help_text='Amount in Bitcoin', max_digits=18)),
                ('amount_usd', models.DecimalField(decimal_places=2, help_text='Amount in USD', max_digits=12)),
                ('sender_address', models.CharField(help_text="Sender's Bitcoin address", max_length=100)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('confirmation_count', models.IntegerField(default=0, help_text='Number of blockchain confirmations')),
                ('required_confirmations', models.IntegerField(default=3, help_text='Required confirmations for completion')),
                ('block_height', models.IntegerField(blank=True, help_text='Block height when transaction was included', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('admin_notes', models.TextField(blank=True, help_text='Admin notes about this transaction')),
                ('is_manually_approved', models.BooleanField(default=False, help_text='Whether admin manually approved this transaction')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='incoming_bitcoin_transactions', to='auth.user')),
            ],
            options={
                'verbose_name': 'Incoming Bitcoin Transaction',
                'verbose_name_plural': 'Incoming Bitcoin Transactions',
                'ordering': ['-created_at'],
            },
        ),
    ] 