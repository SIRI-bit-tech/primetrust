from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def ensure_account_number(sender, instance, created, **kwargs):
    """Ensure user has an account number after creation."""
    if created and not instance.account_number:
        instance.save()  # This will trigger account number generation in the save method 