# Migration to add maintenance-related fields to Transaction

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0003_bill_account_number_bill_biller_category_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='held_due_to_maintenance',
            field=models.BooleanField(default=False, help_text='Transaction held due to bank maintenance'),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('completed', 'Completed'),
                    ('failed', 'Failed'),
                    ('cancelled', 'Cancelled'),
                    ('reversed', 'Reversed'),
                    ('on_hold', 'On Hold'),
                ],
                default='pending',
                max_length=20
            ),
        ),
    ]
