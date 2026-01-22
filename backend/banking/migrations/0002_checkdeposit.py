# Generated migration for CheckDeposit model
# NOTE: Model creation moved to 0004_alter_cardapplication_status_checkdeposit
# This migration kept as no-op to maintain dependency chain for 0005_merge

from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('banking', '0001_initial'),
    ]

    operations = [
        # No operations - CheckDeposit model created in migration 0004
    ]
