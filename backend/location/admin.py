from django.contrib import admin
from .models import State, City


@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('name', 'abbreviation')
    search_fields = ('name', 'abbreviation')
    ordering = ('name',)


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'state')
    list_filter = ('state',)
    search_fields = ('name', 'state__name', 'state__abbreviation')
    ordering = ('state__name', 'name') 