import hmac
import hashlib
import asyncio
from datetime import datetime, timezone

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from telegram import Bot

from .models import GameSession, LeaderboardEntry
from .serializers import ScoreSubmitSerializer, LeaderboardSerializer


def _verify_hmac(tg_user_id: int, score: int, level: int, secret: str, received: str) -> bool:
    """Prevent trivial score spoofing: sign user_id|score|level"""
    payload = f"{tg_user_id}|{score}|{level}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)


class SubmitScoreView(APIView):
    def post(self, request):
        ser = ScoreSubmitSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        d = ser.validated_data

        # Anti-cheat: HMAC check
        if not _verify_hmac(
            d['tg_user_id'], d['score'], d['level_reached'],
            settings.SCORE_HMAC_SECRET, d['hmac']
        ):
            return Response({'error': 'invalid signature'}, status=status.HTTP_403_FORBIDDEN)

        # Anti-cheat: min session time
        if d['session_seconds'] < settings.MIN_SESSION_SECONDS:
            return Response({'error': 'session too short'}, status=status.HTTP_400_BAD_REQUEST)

        # Save session
        GameSession.objects.create(
            tg_user_id=d['tg_user_id'],
            tg_username=d['tg_username'],
            inline_message_id=d['inline_message_id'],
            chat_id=d['chat_id'],
            message_id=d['message_id'],
            score=d['score'],
            level_reached=d['level_reached'],
            finished_at=datetime.now(timezone.utc),
        )

        # Update leaderboard
        entry, _ = LeaderboardEntry.objects.get_or_create(
            tg_user_id=d['tg_user_id'],
            chat_id=d['chat_id'],
            defaults={'tg_username': d['tg_username']}
        )
        if d['score'] > entry.best_score:
            entry.best_score = d['score']
            entry.tg_username = d['tg_username']
            entry.save()

            # Push to Telegram leaderboard
            asyncio.run(_push_tg_score(d))

        return Response({'status': 'ok', 'best': entry.best_score})


async def _push_tg_score(d: dict):
    bot = Bot(token=settings.BOT_TOKEN)
    try:
        if d.get('inline_message_id'):
            await bot.set_game_score(
                user_id=d['tg_user_id'],
                score=d['score'],
                inline_message_id=d['inline_message_id'],
                force=False,
            )
        elif d.get('chat_id') and d.get('message_id'):
            await bot.set_game_score(
                user_id=d['tg_user_id'],
                score=d['score'],
                chat_id=d['chat_id'],
                message_id=d['message_id'],
                force=False,
            )
    except Exception as e:
        print(f'[TG score] error: {e}')


class LeaderboardView(APIView):
    def get(self, request):
        chat_id = request.query_params.get('chat_id')
        qs = LeaderboardEntry.objects.all()[:20]
        if chat_id:
            qs = LeaderboardEntry.objects.filter(chat_id=chat_id)[:20]
        return Response(LeaderboardSerializer(qs, many=True).data)
