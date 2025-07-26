from django.db import models


class State(models.Model):
    """Model for US states."""
    
    name = models.CharField(max_length=100, unique=True)
    abbreviation = models.CharField(max_length=2, unique=True)
    
    class Meta:
        db_table = 'states'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.abbreviation})"


class City(models.Model):
    """Model for cities."""
    
    name = models.CharField(max_length=100)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='cities')
    
    class Meta:
        db_table = 'cities'
        ordering = ['name']
        unique_together = ['name', 'state']
    
    def __str__(self):
        return f"{self.name}, {self.state.abbreviation}" 