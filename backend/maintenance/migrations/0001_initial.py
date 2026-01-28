# Generated migration for MaintenanceMode

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MaintenanceMode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_active', models.BooleanField(default=False, help_text='Enable/disable maintenance mode')),
                ('start_date', models.DateTimeField(blank=True, help_text='When maintenance starts', null=True)),
                ('end_date', models.DateTimeField(blank=True, help_text='When maintenance ends (7-14 days)', null=True)),
                ('message', models.TextField(default='The bank is currently under maintenance. All transactions will be on hold during this period.', help_text='Message shown to users')),
                ('estimated_duration', models.CharField(default='7-14 days', help_text='Estimated duration (e.g., 7-14 days)', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='maintenance_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Maintenance Mode',
                'db_table': 'maintenance_mode',
            },
        ),
    ]
