# Generated manually for CurrencySwap model

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('bitcoin_wallet', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CurrencySwap',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('swap_type', models.CharField(choices=[('usd_to_btc', 'USD to Bitcoin'), ('btc_to_usd', 'Bitcoin to USD')], help_text='Type of currency swap', max_length=20)),
                ('amount_from', models.DecimalField(decimal_places=8, help_text='Amount being swapped from', max_digits=18)),
                ('amount_to', models.DecimalField(decimal_places=8, help_text='Amount being swapped to', max_digits=18)),
                ('exchange_rate', models.DecimalField(decimal_places=8, help_text='Exchange rate at time of swap', max_digits=20)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('transaction_id', models.CharField(blank=True, help_text='Unique transaction identifier', max_length=100, unique=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='currency_swaps', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Currency Swap',
                'verbose_name_plural': 'Currency Swaps',
                'ordering': ['-created_at'],
            },
        ),
    ] 