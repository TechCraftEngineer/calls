import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.services.storage import SQLiteStorage
from app.services.telegram import TelegramService
from app.services.max_messenger import MaxService

logger = logging.getLogger(__name__)

class ReportGenerator:
    def __init__(self, storage: SQLiteStorage, telegram_service: TelegramService, max_service: Optional[MaxService] = None):
        self.storage = storage
        self.telegram = telegram_service
        self.max_service = max_service

    def _format_duration(self, seconds: int) -> str:
        """Форматирует длительность в чч:мм:сс."""
        if not seconds:
            return "0с"
        
        m, s = divmod(seconds, 60)
        h, m = divmod(m, 60)
        
        parts = []
        if h > 0:
            parts.append(f"{h}ч")
        if m > 0:
            parts.append(f"{m}м")
        if s > 0 or not parts:
            parts.append(f"{s}с")
            
        return " ".join(parts)

    def generate_period_stats(self, date_from: datetime, date_to: datetime) -> Dict[str, Any]:
        """
        Агрегирует статистику по звонкам за указанный период.
        Возвращает словарь: { user_id: { total_calls, total_duration, incoming, outgoing, missed, calls: [] } }
        """
        calls = self.storage.get_calls_in_range(date_from, date_to)
        
        # Получаем всех активных пользователей для маппинга номеров
        with self.storage._get_connection() as conn:
            cursor = conn.execute("""
                SELECT id, username, first_name, last_name, internal_numbers, mobile_numbers,
                       filter_exclude_answering_machine, filter_min_duration, filter_min_replicas
                FROM users WHERE is_active = 1
            """)
            users = [dict(zip([col[0] for col in cursor.description], row)) for row in cursor.fetchall()]
            
        # Создаем маппинг номеров на пользователей
        number_to_user = {}
        user_map = {} # id -> user dict
        
        for user in users:
            user_map[user['id']] = user
            
            # Обработка внутренних номеров
            if user['internal_numbers']:
                for num in user['internal_numbers'].split(','):
                    clean_num = num.strip()
                    if clean_num:
                        number_to_user[clean_num] = user['id']
            
            # Обработка мобильных номеров
            if user['mobile_numbers']:
                for num in user['mobile_numbers'].split(','):
                    clean_num = num.strip()
                    if clean_num:
                        # Нормализация мобильного номера (как в storage.py)
                        if clean_num.startswith('+'):
                            clean_num = clean_num[1:]
                        if clean_num.startswith('8') and len(clean_num) == 11:
                            clean_num = '7' + clean_num[1:]
                        number_to_user[clean_num] = user['id']

        stats = defaultdict(lambda: {
            "total_calls": 0, "total_duration": 0, 
            "incoming": 0, "outgoing": 0, "missed": 0,
            "user": None, "calls": []
        })
        
        # Заполняем stats пустыми структурами для всех пользователей
        for user in users:
            stats[user['id']]["user"] = user

        for call in calls:
            # Определяем, к какому пользователю относится звонок
            user_id = None
            
            # Сначала пробуем по internal_number из звонка
            if call.get('internal_number'):
                user_id = number_to_user.get(call['internal_number'])
            
            # Если не нашли, пробуем распарсить number/destination/source в зависимости от логики
            # Но у нас есть internal_number в базе, который должен быть заполнен импортером
            
            if user_id:
                user = user_map[user_id]
                
                # Фильтрация звонка
                
                # 1. По длительности
                min_duration = user.get('filter_min_duration', 0) or 0
                
                # Ensure duration is int
                call_duration = int(call.get("duration") or 0)
                if call_duration < min_duration:
                    continue

                # 2. По автоответчику
                exclude_am = user.get('filter_exclude_answering_machine', 0)
                if exclude_am:
                    # Проверяем customer_name, который заполняется в transcription.py
                    customer_name = call.get('customer_name')
                    # Также можно проверить статус, если есть специфичный статус
                    if customer_name == 'Автоответчик':
                        continue

                # 3. По количеству реплик (требует транскрипта)
                min_replicas = user.get('filter_min_replicas', 0) or 0
                if min_replicas > 0:
                    transcript = self.storage.get_transcript_by_call_id(call['id'])
                    if not transcript or not transcript.get('text'):
                        # Если нет транскрипта, считаем 0 реплик.
                        # Если фильтр > 0, то такой звонок пропускаем?
                        # Логично пропустить, если требуется диалог.
                        continue
                    
                    # Считаем количество непустых строк в тексте
                    # Формат: "Спикер: текст"
                    replicas_count = len([line for line in transcript['text'].split('\n') if line.strip()])
                    if replicas_count < min_replicas:
                        continue

                s = stats[user_id]
                s["total_calls"] += 1
                s["total_duration"] += call.get("duration", 0) or 0
                
                direction = call.get("direction", "").lower()
                status = call.get("status", "").lower()

                if direction in ("incoming", "inbound", "входящий"):
                    s["incoming"] += 1
                elif direction in ("outgoing", "outbound", "исходящий"):
                    s["outgoing"] += 1
                
                # Простая логика определения пропущенного
                if status != "success" and status != "ok" and call.get("duration", 0) == 0:
                     s["missed"] += 1
                
                s["calls"].append(call)

        return stats

    def generate_manager_report_text(self, stats_data: Dict[str, Any], date_str: str, user_pref: Dict[str, Any] = None) -> str:
        """Формирует текст отчета для менеджера.
        Использует настройки user_pref для добавления доп. параметров (detailed, summaries и т.д.)"""
        user = stats_data["user"]
        name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user['username']
        
        lines = [
            f"📊 <b>Отчет за {date_str}</b>",
            f"👤 {name}",
            "",
            f"📞 Всего звонков: {stats_data['total_calls']}",
            f"⏱ Общая длительность: {self._format_duration(stats_data['total_duration'])}",
            f"📥 Входящих: {stats_data['incoming']}",
            f"📤 Исходящих: {stats_data['outgoing']}",
            f"❌ Пропущенных/Неудачных: {stats_data['missed']}",
        ]
        
        if user_pref and user_pref.get('report_detailed'):
            lines.append(f"⏱ Средняя длительность: {self._format_duration(stats_data['total_duration'] // max(stats_data['total_calls'], 1))}")

        if user_pref and user_pref.get('report_include_call_summaries'):
            try:
                from app.services.deepseek import generate_report_summary
                ai_summary = generate_report_summary(stats_data.get('calls', []))
                if ai_summary:
                    lines.append("")
                    lines.append(f"💡 <b>Краткое саммари ИИ по звонкам за период:</b>")
                    lines.append(ai_summary)
            except Exception as e:
                logger.error(f"Error generating AI summary for report: {e}")

        return "\n".join(lines)

    def generate_supervisor_report_text(self, all_stats: Dict[int, Any], date_str: str) -> str:
        """Формирует сводный отчет для руководителя."""
        lines = [
            f"📈 <b>Сводный отчет за {date_str}</b>",
            ""
        ]
        
        total_calls_all = 0
        total_duration_all = 0
        
        # Сортируем по количеству звонков
        sorted_stats = sorted(all_stats.values(), key=lambda x: x['total_calls'], reverse=True)
        
        for s in sorted_stats:
            user = s["user"]
            if not user: continue
            
            name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or user['username']
            
            if s['total_calls'] > 0:
                lines.append(f"👤 <b>{name}</b>")
                lines.append(f"  📞 {s['total_calls']} зв. | ⏱ {self._format_duration(s['total_duration'])}")
                lines.append(f"  📥 {s['incoming']} | 📤 {s['outgoing']} | ❌ {s['missed']}")
                lines.append("")
                
                total_calls_all += s['total_calls']
                total_duration_all += s['total_duration']
        
        lines.append("---")
        lines.append(f"<b>ИТОГО ПО ОТДЕЛУ:</b>")
        lines.append(f"📞 Всего звонков: {total_calls_all}")
        lines.append(f"⏱ Общая длительность: {self._format_duration(total_duration_all)}")
        
        return "\n".join(lines)

    async def _dispatch_reports(self, period: str):
        """Generates and sends reports for a given period ('daily', 'weekly', 'monthly')."""
        logger.info(f"Начинаем рассылку отчетов ({period})...")
        
        today = datetime.now()
        end_of_day = today.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        if period == 'daily':
            start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
            date_str = today.strftime("%d.%m.%Y")
        elif period == 'weekly':
            start_date = (today - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            date_str = f"{(today - timedelta(days=7)).strftime('%d.%m.%Y')} - {today.strftime('%d.%m.%Y')}"
        elif period == 'monthly':
            start_date = (today - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
            date_str = f"{(today - timedelta(days=30)).strftime('%d.%m.%Y')} - {today.strftime('%d.%m.%Y')}"
        else:
            return
            
        stats = self.generate_period_stats(start_date, end_of_day)
        
        # Получаем пользователей с включенными отчетами
        users_with_report = self.storage.get_users_for_reports()
        if not users_with_report:
            logger.info("Нет пользователей с включенными отчетами. Пропускаем рассылку.")
            return
        
        # 1. Личные отчеты
        for user_pref in users_with_report:
            user_id = user_pref['id']
            
            # Статистика пользователя (может отсутствовать, если пользователь неактивен или нет звонков за период)
            user_stats = stats.get(user_id)
            if not user_stats:
                # Отправляем отчёт и при 0 звонков: формируем пустую статистику для пользователя
                user_stats = {
                    "total_calls": 0,
                    "total_duration": 0,
                    "incoming": 0,
                    "outgoing": 0,
                    "missed": 0,
                    "user": user_pref,
                    "calls": [],
                }
                logger.info("Пользователь %s (id=%s) без звонков за период — формируем отчёт «0 звонков»", user_pref.get('username'), user_id)

            report_text = self.generate_manager_report_text(user_stats, date_str, user_pref)

            # Отправка в Telegram (пропуск в выходные, если включено telegram_skip_weekends)
            send_telegram = user_pref.get(f'telegram_{period}_report', user_pref.get('telegram_daily_report') if period == 'daily' else False) and user_pref.get('telegram_chat_id')
            if send_telegram and user_pref.get('telegram_skip_weekends'):
                if today.weekday() >= 5:  # 5=суббота, 6=воскресенье
                    send_telegram = False
            if send_telegram:
                try:
                    await self.telegram.send_message(user_pref['telegram_chat_id'], report_text)
                except Exception as e:
                    logger.error(f"Error sending Telegram report to {user_id}: {e}")

            # Отправка в Email
            if user_pref.get(f'email_{period}_report') and user_pref.get('email'):
                try:
                    from app.services.email_service import EmailService
                    html_content = report_text.replace('\n', '<br>')
                    EmailService().send_html_email(user_pref['email'], f"Отчет по звонкам QBS ({date_str})", html_content)
                except Exception as e:
                    logger.error(f"Error sending Email report to {user_id}: {e}")

            # Отправка в MAX (только daily)
            if period == 'daily' and user_pref.get('max_daily_report') and user_pref.get('max_chat_id'):
                if self.max_service:
                    try:
                        await self.max_service.send_message(user_pref['max_chat_id'], report_text)
                    except Exception as e:
                        logger.error(f"Error sending MAX report to {user_id}: {e}")
                else:
                    logger.warning("MAX service not initialized, skipping MAX report")
        
        # 2. Отчеты руководителям (сводные); при наличии report_managed_user_ids — персональный свод по выбранным менеджерам
        if period == 'daily':
            supervisor_text_full = self.generate_supervisor_report_text(stats, date_str)
            for u in users_with_report:
                managed_ids_raw = u.get('report_managed_user_ids')
                try:
                    managed_ids = json.loads(managed_ids_raw) if managed_ids_raw else []
                except (json.JSONDecodeError, TypeError):
                    managed_ids = []
                if managed_ids:
                    filtered_stats = {k: v for k, v in stats.items() if k in managed_ids}
                    supervisor_text = self.generate_supervisor_report_text(filtered_stats, date_str)
                else:
                    supervisor_text = supervisor_text_full
                if u.get('telegram_manager_report') and u.get('telegram_chat_id'):
                    skip_supervisor = u.get('telegram_skip_weekends') and today.weekday() >= 5
                    if not skip_supervisor:
                        try:
                            await self.telegram.send_message(u['telegram_chat_id'], supervisor_text)
                        except Exception as e:
                            logger.error("Error sending supervisor Telegram report to %s: %s", u.get('id'), e)
                if u.get('max_manager_report') and u.get('max_chat_id') and self.max_service:
                    try:
                        await self.max_service.send_message(u['max_chat_id'], supervisor_text)
                    except Exception as e:
                        logger.error("Error sending supervisor MAX report to %s: %s", u.get('id'), e)
                    
        logger.info(f"Reports for {period} sent.")

    async def send_daily_reports(self):
        await self._dispatch_reports('daily')

    async def send_weekly_reports(self):
        await self._dispatch_reports('weekly')
        
    async def send_monthly_reports(self):
        await self._dispatch_reports('monthly')

    async def send_test_report_for_user(self, user_id: int) -> bool:
        """
        Отправляет текущему пользователю в Telegram его ежедневный отчёт за сегодня (для тестирования).
        """
        user_pref = self.storage.get_user(user_id)
        if not user_pref:
            return False
        chat_id = user_pref.get("telegram_chat_id")
        if not chat_id:
            return False
        today = datetime.now()
        start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = today.replace(hour=23, minute=59, second=59, microsecond=999999)
        date_str = today.strftime("%d.%m.%Y")
        stats = self.generate_period_stats(start_date, end_of_day)
        user_stats = stats.get(user_id)
        if not user_stats:
            user_stats = {
                "total_calls": 0,
                "total_duration": 0,
                "incoming": 0,
                "outgoing": 0,
                "missed": 0,
                "user": user_pref,
                "calls": [],
            }
        report_text = self.generate_manager_report_text(user_stats, date_str, user_pref)
        try:
            await self.telegram.send_message(chat_id, report_text)
            return True
        except Exception as e:
            logger.error("Error sending test report to user %s: %s", user_id, e)
            return False

    async def send_report_on_demand(self, chat_id: str) -> bool:
        """
        Отправляет отчёт по звонкам на указанный chat_id по запросу (команда /report в боте).
        Находит пользователя по telegram_chat_id и отправляет личный отчёт.
        Если у пользователя включен отчёт по менеджерам — также отправляет сводный.
        """
        today = datetime.now()
        date_str = today.strftime("%d.%m.%Y")
        stats = self.generate_daily_stats(today)

        with self.storage._get_connection() as conn:
            cursor = conn.execute(
                """SELECT id, username, first_name, last_name, telegram_chat_id,
                          telegram_daily_report, telegram_manager_report
                   FROM users WHERE is_active = 1 AND telegram_chat_id = ?""",
                (chat_id,)
            )
            row = cursor.fetchone()
        if not row:
            return False

        cols = ["id", "username", "first_name", "last_name",
                "telegram_chat_id", "telegram_daily_report", "telegram_manager_report"]
        user_pref = dict(zip(cols, row))
        user_id = user_pref["id"]

        user_stats = stats.get(user_id)
        if user_stats and user_stats.get("user"):
            report_text = self.generate_manager_report_text(user_stats, date_str)
        else:
            name = f"{user_pref.get('first_name', '')} {user_pref.get('last_name', '')}".strip() or user_pref.get("username", "")
            report_text = (
                f"📊 <b>Отчет за {date_str}</b>\n"
                f"👤 {name}\n\n"
                "📞 Звонков за сегодня: 0"
            )
        try:
            await self.telegram.send_message(chat_id, report_text)
        except Exception as e:
            logger.error("Error sending on-demand report to %s: %s", chat_id, e)
            return False

        if user_pref.get("telegram_manager_report"):
            supervisor_text = self.generate_supervisor_report_text(stats, date_str)
            try:
                await self.telegram.send_message(chat_id, supervisor_text)
            except Exception as e:
                logger.error("Error sending on-demand supervisor report to %s: %s", chat_id, e)

        return True
