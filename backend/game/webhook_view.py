import json
import asyncio
from django.conf import settings
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from telegram import Bot, Update
from telegram.ext import Application


@method_decorator(csrf_exempt, name='dispatch')
class WebhookView(View):
    async def post(self, request):
        data = json.loads(request.body)
        bot = Bot(token=settings.BOT_TOKEN)
        update = Update.de_json(data, bot)

        if update.callback_query and update.callback_query.game_short_name:
            # User pressed Play button
            query = update.callback_query
            game_url = settings.GAME_URL

            # Pass context to frontend via URL params
            user_id = query.from_user.id
            username = query.from_user.username or ''

            if query.inline_message_id:
                url = f"{game_url}?uid={user_id}&uname={username}&imid={query.inline_message_id}"
            elif query.message:
                url = (f"{game_url}?uid={user_id}&uname={username}"
                       f"&cid={query.message.chat_id}&mid={query.message.message_id}")
            else:
                url = f"{game_url}?uid={user_id}&uname={username}"

            await query.answer(url=url)

        elif update.message:
            msg = update.message
            if msg.text in ['/start', '/game']:
                await bot.send_game(
                    chat_id=msg.chat_id,
                    game_short_name=settings.GAME_SHORT_NAME,
                )

        return JsonResponse({'ok': True})
