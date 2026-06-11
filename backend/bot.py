"""Standalone bot runner (polling mode for local dev)"""
import os
import asyncio
from dotenv import load_dotenv
load_dotenv()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from telegram import Update
from telegram.ext import Application, CommandHandler, CallbackQueryHandler
from django.conf import settings as cfg


async def start(update: Update, context):
    await context.bot.send_game(
        chat_id=update.effective_chat.id,
        game_short_name=cfg.GAME_SHORT_NAME,
    )


async def button(update: Update, context):
    query = update.callback_query
    if not query.game_short_name:
        return
    user_id = query.from_user.id
    username = query.from_user.username or ''
    url = cfg.GAME_URL
    if query.inline_message_id:
        url += f"?uid={user_id}&uname={username}&imid={query.inline_message_id}"
    elif query.message:
        url += (f"?uid={user_id}&uname={username}"
                f"&cid={query.message.chat_id}&mid={query.message.message_id}")
    await query.answer(url=url)


async def run():
    app = Application.builder().token(cfg.BOT_TOKEN).build()
    app.add_handler(CommandHandler(['start', 'game'], start))
    app.add_handler(CallbackQueryHandler(button))
    print('Bot polling started...')
    async with app:
        await app.start()
        await app.updater.start_polling()
        await asyncio.Event().wait()  # держим до Ctrl+C


if __name__ == '__main__':
    asyncio.run(run())
