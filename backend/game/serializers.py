from rest_framework import serializers
from .models import LeaderboardEntry


class ScoreSubmitSerializer(serializers.Serializer):
    tg_user_id = serializers.IntegerField()
    tg_username = serializers.CharField(max_length=128, default='')
    score = serializers.IntegerField(min_value=0, max_value=999999)
    level_reached = serializers.IntegerField(min_value=0)
    session_seconds = serializers.IntegerField(min_value=0)
    inline_message_id = serializers.CharField(required=False, default='')
    chat_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    message_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    hmac = serializers.CharField(max_length=128)


class LeaderboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaderboardEntry
        fields = ['tg_user_id', 'tg_username', 'best_score', 'updated_at']
