import asyncio
import logging
import time
import os
import json
from aiohttp import web # Для Render
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, StateFilter
from aiogram.types import LabeledPrice, PreCheckoutQuery, CallbackQuery, ReplyKeyboardRemove, WebAppInfo
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder

# Подключаем наш файл с текстами
from messages import (
    START_TEXT, HELP_TEXT, UPDATE_TEXT, 
    DONATE_TEXT, DONATE_THANKS, 
    REPORT_INSTRUCTION, REPORT_SPAM_WARNING, 
    REPORT_ERROR_TYPE, REPORT_ERROR_SHORT, REPORT_ERROR_CAPS, REPORT_SUCCESS,
    REPORT_CANCEL, CANCEL_BUTTON_TEXT,
    BANNED_MESSAGE, WARN_MESSAGE,
    ADMIN_BAN_SUCCESS, ADMIN_UNBAN_SUCCESS, ADMIN_WARN_SUCCESS, ADMIN_AUTO_BAN, ADMIN_ERROR_ID
)

# === НАСТРОЙКИ ===
TOKEN = "7895981650:AAGo3SPl8TfB4PRupO33dtZOVnJjOIKo_jI"
ADMIN_ID = 8409659794
DB_FILE = "users_db.json" # Файл для хранения банов
# =================

logging.basicConfig(level=logging.INFO)
bot = Bot(token=TOKEN)
dp = Dispatcher()

user_last_report_time = {}

# === РАБОТА С БАЗОЙ ДАННЫХ (JSON) ===
def load_db():
    if not os.path.exists(DB_FILE):
        return {"banned": [], "warnings": {}}
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"banned": [], "warnings": {}}

def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

class ReportState(StatesGroup):
    waiting_for_report = State()

# === КЛАВИАТУРЫ ===
def get_main_keyboard():
    builder = ReplyKeyboardBuilder()
    
    # 1. Большая кнопка (будет на всю ширину)
    builder.button(text="🎅 Запустить игру", web_app=WebAppInfo(url="https://dimitriev55konstatin55-cell.github.io/Fruit-crash-v.-8.5-/"))
    
    # 2. Остальные кнопки
    builder.button(text="📄 Что нового")
    builder.button(text="💸 Поддержать")
    builder.button(text="🐛 Баг-репорт")
    builder.button(text="ℹ️ Помощь")
    
    # Сетка: 1 кнопка в первом ряду, по 2 кнопки в следующих
    builder.adjust(1, 2)
    return builder.as_markup(resize_keyboard=True)

def get_cancel_keyboard():
    builder = ReplyKeyboardBuilder()
    builder.button(text=CANCEL_BUTTON_TEXT)
    return builder.as_markup(resize_keyboard=True)

@dp.message(Command("start"))
async def start(message: types.Message):
    await message.answer(START_TEXT, reply_markup=get_main_keyboard(), parse_mode="Markdown")

@dp.message(F.text == "ℹ️ Помощь")
@dp.message(Command("help"))
async def help_command(message: types.Message):
    await message.answer(HELP_TEXT, parse_mode="Markdown", reply_markup=get_main_keyboard())

@dp.message(F.text == "📄 Что нового")
@dp.message(Command("update"))
@dp.message(Command("last_update_info"))
async def update(message: types.Message):
    await message.answer(UPDATE_TEXT, parse_mode="Markdown", reply_markup=get_main_keyboard())

# === АДМИН КОМАНДЫ (BAN/WARN) ===
def extract_id(message: types.Message):
    try:
        return int(message.text.split()[1])
    except (IndexError, ValueError):
        return None

@dp.message(Command("ban"))
async def cmd_ban(message: types.Message):
    if message.from_user.id != ADMIN_ID: return
    
    target_id = extract_id(message)
    if not target_id:
        await message.answer(ADMIN_ERROR_ID)
        return

    db = load_db()
    if target_id not in db["banned"]:
        db["banned"].append(target_id)
        save_db(db)
        await message.answer(ADMIN_BAN_SUCCESS.format(user_id=target_id))
        try:
            await bot.send_message(target_id, BANNED_MESSAGE)
        except:
            pass 
    else:
        await message.answer(f"Пользователь {target_id} уже в бане.")

@dp.message(Command("unban"))
async def cmd_unban(message: types.Message):
    if message.from_user.id != ADMIN_ID: return
    
    target_id = extract_id(message)
    if not target_id:
        await message.answer(ADMIN_ERROR_ID)
        return

    db = load_db()
    if target_id in db["banned"]:
        db["banned"].remove(target_id)
        # Сбрасываем варны при разбане
        str_id = str(target_id)
        if str_id in db["warnings"]:
            del db["warnings"][str_id]
            
        save_db(db)
        await message.answer(ADMIN_UNBAN_SUCCESS.format(user_id=target_id))
        try:
            await bot.send_message(target_id, "✅ Бан снят. Вы снова можете отправлять репорты.")
        except:
            pass
    else:
        await message.answer(f"Пользователь {target_id} не был забанен.")

@dp.message(Command("warn"))
async def cmd_warn(message: types.Message):
    if message.from_user.id != ADMIN_ID: return
    
    target_id = extract_id(message)
    if not target_id:
        await message.answer(ADMIN_ERROR_ID)
        return

    db = load_db()
    str_id = str(target_id)
    
    # Добавляем варн
    current_warns = db["warnings"].get(str_id, 0) + 1
    db["warnings"][str_id] = current_warns
    
    # Проверка на автобан
    if current_warns >= 3:
        if target_id not in db["banned"]:
            db["banned"].append(target_id)
        save_db(db)
        await message.answer(ADMIN_AUTO_BAN.format(user_id=target_id))
        try:
            await bot.send_message(target_id, BANNED_MESSAGE)
        except:
            pass
    else:
        save_db(db)
        await message.answer(ADMIN_WARN_SUCCESS.format(user_id=target_id, current=current_warns))
        try:
            await bot.send_message(target_id, WARN_MESSAGE.format(current=current_warns))
        except:
            pass

# === ДОНАТЫ ===
@dp.message(F.text == "💸 Поддержать")
@dp.message(Command("support"))
async def support(message: types.Message):
    builder = InlineKeyboardBuilder()
    for amount in [10, 25, 100, 500, 1000]:
        builder.button(text=f"{amount} ⭐️", callback_data=f"donate_{amount}")
    builder.adjust(2)
    await message.answer(DONATE_TEXT, reply_markup=builder.as_markup())

@dp.callback_query(F.data.startswith("donate_"))
async def process_donation(callback: CallbackQuery):
    amount = int(callback.data.split("_")[1])
    await callback.message.answer_invoice(
        title="Поддержка Fruit Crash",
        description=f"Добровольный взнос: {amount} звезд.",
        payload="fruit_support",
        currency="XTR",
        prices=[LabeledPrice(label="Звезды", amount=amount)],
    )
    await callback.answer()

@dp.pre_checkout_query()
async def checkout(query: PreCheckoutQuery):
    await query.answer(ok=True)

@dp.message(F.successful_payment)
async def paid(message: types.Message):
    await message.answer(DONATE_THANKS)

# === РЕПОРТЫ ===
@dp.message(F.text == "🐛 Баг-репорт")
@dp.message(Command("report"))
async def report_start(message: types.Message, state: FSMContext):
    user_id = message.from_user.id
    
    # 1. ПРОВЕРКА НА БАН
    db = load_db()
    if user_id in db["banned"]:
        await message.answer(BANNED_MESSAGE, parse_mode="Markdown")
        return

    current_time = time.time()
    
    # Анти-спам таймер (5 минут)
    if user_id in user_last_report_time:
        if (current_time - user_last_report_time[user_id]) < 300:
            await message.answer(REPORT_SPAM_WARNING, parse_mode="Markdown")
            return

    await message.answer(REPORT_INSTRUCTION, reply_markup=get_cancel_keyboard(), parse_mode="Markdown")
    await state.set_state(ReportState.waiting_for_report)

# Обработка кнопки ОТМЕНА
@dp.message(StateFilter(ReportState.waiting_for_report), F.text == CANCEL_BUTTON_TEXT)
async def report_cancel(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer(REPORT_CANCEL, reply_markup=get_main_keyboard())

@dp.message(StateFilter(ReportState.waiting_for_report))
async def report_finish(message: types.Message, state: FSMContext):
    if message.sticker or message.animation or message.dice or message.voice:
        await message.answer(REPORT_ERROR_TYPE)
        return 

    content_text = message.text or message.caption or ""
    has_media = message.photo or message.video or message.document

    if not has_media and len(content_text.strip()) < 10:
        await message.answer(REPORT_ERROR_SHORT)
        return 

    # Анти-Капс
    letters = [c for c in content_text if c.isalpha()]
    if len(letters) > 5:
        if sum(1 for c in letters if c.isupper()) / len(letters) > 0.7:
             await message.answer(REPORT_ERROR_CAPS)
             return

    if ADMIN_ID:
        try:
            user_info = f"@{message.from_user.username}" if message.from_user.username else f"ID: {message.from_user.id}"
            
            # Сообщение админу с ID и кнопками
            admin_text = (
                f"🚨 **НОВЫЙ РЕПОРТ**\n"
                f"От: {user_info}\n"
                f"ID: `{message.from_user.id}`\n\n"
                f"Для бана: `/ban {message.from_user.id}`\n"
                f"Для варна: `/warn {message.from_user.id}`"
            )
            await bot.send_message(ADMIN_ID, admin_text, parse_mode="Markdown")
            await message.copy_to(ADMIN_ID)
            user_last_report_time[message.from_user.id] = time.time()
        except Exception as e:
            logging.error(f"Ошибка: {e}")

    await message.answer(REPORT_SUCCESS, reply_markup=get_main_keyboard())
    await state.clear()

# === SERVER FOR RENDER ===
async def keep_alive(request):
    return web.Response(text="Bot is alive")

async def start_server():
    app = web.Application()
    app.add_routes([web.get('/', keep_alive)])
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.environ.get("PORT", 10000))
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()

async def main():
    print("Бот запущен!")
    await start_server()
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
