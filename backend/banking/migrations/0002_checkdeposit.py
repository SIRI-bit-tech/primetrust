# Generated migration for CheckDeposit model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('banking', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CheckDeposit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('check_number', models.CharField(blank=True, max_length=50)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('front_image', models.ImageField(upload_to='check_deposits/front/')),
                ('back_image', models.ImageField(upload_to='check_deposits/back/')),
                ('payer_name', models.CharField(blank=True, max_length=200)),
                ('memo', models.CharField(blank=True, max_length=200)),
                ('ocr_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True)),
                ('ocr_check_number', models.CharField(blank=True, max_length=50)),
                ('ocr_confidence', models.FloatField(default=0.0)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('completed', 'Completed')], default='pending', max_length=20)),
                ('admin_notes', models.TextField(blank=True)),
                ('hold_until', models.DateTimeField(blank=True, null=True)),
                ('requires_admin_approval', models.BooleanField(default=True)),
                ('admin_approved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('admin_approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_check_deposits', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='check_deposits', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'check_deposits',
                'ordering': ['-created_at'],
            },
        ),
    ]
