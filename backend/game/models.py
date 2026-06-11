from django.db import models


class GameSession(models.Model):
    """One play session per user per inline_message"""
    tg_user_id = models.BigIntegerField(db_index=True)
    tg_username = models.CharField(max_length=128, blank=True)
    inline_message_id = models.CharField(max_length=256, blank=True)
    chat_id = models.BigIntegerField(null=True, blank=True)
    message_id = models.BigIntegerField(null=True, blank=True)
    score = models.IntegerField(default=0)
    level_reached = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-score']

    def __str__(self):
        return f'User {self.tg_user_id} score={self.score}'


class LeaderboardEntry(models.Model):
    """Best score per user per chat/inline context"""
    tg_user_id = models.BigIntegerField(db_index=True)
    tg_username = models.CharField(max_length=128, blank=True)
    chat_id = models.BigIntegerField(null=True, blank=True)
    best_score = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('tg_user_id', 'chat_id')]
        ordering = ['-best_score']

    def __str__(self):
        return f'LB: {self.tg_username} {self.best_score}'
