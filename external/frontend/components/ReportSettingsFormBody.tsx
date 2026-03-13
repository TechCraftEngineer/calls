import React, { useState } from 'react';
import api from '@/lib/api';
import { User } from '@/lib/auth';

interface ReportSettingsFormBodyProps {
    form: any;
    setForm: React.Dispatch<React.SetStateAction<any>>;
    handleSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    message: string;
    user: User;
    isAdmin: boolean;
    allUsers: any[];
}

export default function ReportSettingsFormBody({
    form,
    setForm,
    handleSubmit,
    saving,
    message,
    user,
    isAdmin,
    allUsers
}: ReportSettingsFormBodyProps) {
    const [sendTestLoading, setSendTestLoading] = useState(false);
    const [sendTestMessage, setSendTestMessage] = useState('');

    return (
        <div className="card" style={{ marginTop: '24px' }}>
            <h3 className="section-title" style={{ marginBottom: '20px' }}>Мои настройки отчетов</h3>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                    <div style={{ padding: '16px', background: '#f5f7fa', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>Telegram Отчеты</h4>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Telegram Chat ID</label>
                            <input
                                type="text"
                                value={form.telegram_chat_id}
                                onChange={(e) => setForm((f: any) => ({ ...f, telegram_chat_id: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
                                placeholder="Напишите боту /start чтобы узнать ID"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.telegram_daily_report} onChange={(e) => setForm((f: any) => ({ ...f, telegram_daily_report: e.target.checked }))} /> Ежедневный отчет
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.telegram_weekly_report} onChange={(e) => setForm((f: any) => ({ ...f, telegram_weekly_report: e.target.checked }))} /> Еженедельный отчет
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.telegram_monthly_report} onChange={(e) => setForm((f: any) => ({ ...f, telegram_monthly_report: e.target.checked }))} /> Ежемесячный отчет
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.telegram_skip_weekends} onChange={(e) => setForm((f: any) => ({ ...f, telegram_skip_weekends: e.target.checked }))} /> Не отправлять отчёты в Telegram в выходные
                            </label>
                        </div>
                        <div style={{ marginTop: '12px' }}>
                            <button
                                type="button"
                                disabled={!form.telegram_chat_id?.trim() || sendTestLoading}
                                onClick={async () => {
                                    setSendTestMessage('');
                                    setSendTestLoading(true);
                                    try {
                                        await api.post('/reports/send-test-telegram');
                                        setSendTestMessage('Отчёт отправлен в Telegram');
                                        setTimeout(() => setSendTestMessage(''), 4000);
                                    } catch (err: any) {
                                        const d = err.response?.data?.detail;
                                        setSendTestMessage(typeof d === 'string' ? d : 'Не удалось отправить. Укажите Telegram Chat ID.');
                                    } finally {
                                        setSendTestLoading(false);
                                    }
                                }}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: form.telegram_chat_id?.trim() && !sendTestLoading ? 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)' : '#ccc',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: form.telegram_chat_id?.trim() && !sendTestLoading ? 'pointer' : 'not-allowed',
                                    fontSize: '13px'
                                }}
                            >
                                {sendTestLoading ? 'Отправка...' : 'Отправить отчёт в Telegram'}
                            </button>
                            {sendTestMessage && (
                                <span style={{ marginLeft: '12px', color: sendTestMessage.includes('отправлен') ? '#4CAF50' : '#FF5252', fontSize: '13px' }}>
                                    {sendTestMessage}
                                </span>
                            )}
                        </div>
                        {isAdmin && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                                <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700 }}>Время отправки (для всех)</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                                    <label style={{ fontSize: '12px' }}>
                                        Ежедневно: <input type="time" value={form.report_daily_time} onChange={(e) => setForm((f: any) => ({ ...f, report_daily_time: e.target.value }))} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                    </label>
                                    <label style={{ fontSize: '12px' }}>
                                        Еженедельно: <select value={form.report_weekly_day} onChange={(e) => setForm((f: any) => ({ ...f, report_weekly_day: e.target.value }))} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => (<option key={d} value={d}>{d}</option>))}
                                        </select> <input type="time" value={form.report_weekly_time} onChange={(e) => setForm((f: any) => ({ ...f, report_weekly_time: e.target.value }))} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                    </label>
                                    <label style={{ fontSize: '12px' }}>
                                        Ежемесячно: <select value={form.report_monthly_day} onChange={(e) => setForm((f: any) => ({ ...f, report_monthly_day: e.target.value }))} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                            <option value="last">Последний день</option>
                                            {Array.from({ length: 28 }, (_, i) => i + 1).map(n => (<option key={n} value={String(n)}>{n}</option>))}
                                        </select> <input type="time" value={form.report_monthly_time} onChange={(e) => setForm((f: any) => ({ ...f, report_monthly_time: e.target.value }))} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <div style={{ padding: '16px', background: '#f5f7fa', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>Сводный отчёт по выбранным менеджерам</h4>
                            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#666' }}>
                                Выберите, по каким менеджерам включать данные в сводный отчёт в Telegram (опция «Получать отчеты по всем менеджерам» настраивается в Управлении пользователями). Если никого не выбрано — в сводку попадают все.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                                {allUsers.filter((u) => u.id !== user.id).map((u) => {
                                    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
                                    const checked = form.report_managed_user_ids?.includes(u.id) ?? false;
                                    return (
                                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    const ids: number[] = form.report_managed_user_ids ?? [];
                                                    setForm((f: any) => ({
                                                        ...f,
                                                        report_managed_user_ids: e.target.checked
                                                            ? [...ids, u.id]
                                                            : ids.filter((id) => id !== u.id)
                                                    }));
                                                }}
                                            />
                                            {name} ({u.username})
                                        </label>
                                    );
                                })}
                                {allUsers.length <= 1 && <span style={{ fontSize: '12px', color: '#999' }}>Нет других пользователей</span>}
                            </div>
                        </div>
                    )}

                    <div style={{ padding: '16px', background: '#f5f7fa', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>Email Отчеты</h4>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600 }}>Email адрес</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
                                placeholder="Ваш Email"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.email_daily_report} onChange={(e) => setForm((f: any) => ({ ...f, email_daily_report: e.target.checked }))} /> Ежедневный отчет
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.email_weekly_report} onChange={(e) => setForm((f: any) => ({ ...f, email_weekly_report: e.target.checked }))} /> Еженедельный отчет
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.email_monthly_report} onChange={(e) => setForm((f: any) => ({ ...f, email_monthly_report: e.target.checked }))} /> Ежемесячный отчет
                            </label>
                        </div>
                    </div>

                    <div style={{ padding: '16px', background: '#f5f7fa', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>Параметры отчетов</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.report_detailed} onChange={(e) => setForm((f: any) => ({ ...f, report_detailed: e.target.checked }))} /> Подробный формат
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.report_include_call_summaries} onChange={(e) => setForm((f: any) => ({ ...f, report_include_call_summaries: e.target.checked }))} /> ИИ-саммари вызовов (Email)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.report_include_avg_value} onChange={(e) => setForm((f: any) => ({ ...f, report_include_avg_value: e.target.checked }))} /> Средняя сумма сделки
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <input type="checkbox" checked={form.report_include_avg_rating} onChange={(e) => setForm((f: any) => ({ ...f, report_include_avg_rating: e.target.checked }))} /> Средняя оценка качества
                            </label>
                        </div>

                        <div style={{ marginTop: '16px', borderTop: '1px solid #ddd', paddingTop: '16px' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>Настройки KPI</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ fontSize: '13px' }}>Базовый оклад (₽): <input type="number" min={0} value={form.kpi_base_salary} onChange={e => setForm((f: any) => ({ ...f, kpi_base_salary: parseInt(e.target.value) || 0 }))} style={{ width: '100px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }} /></label>
                                <label style={{ fontSize: '13px' }}>Целевой бонус (₽): <input type="number" min={0} value={form.kpi_target_bonus} onChange={e => setForm((f: any) => ({ ...f, kpi_target_bonus: parseInt(e.target.value) || 0 }))} style={{ width: '100px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }} /></label>
                                <label style={{ fontSize: '13px' }}>Целевое время разговоров (мин): <input type="number" min={0} value={form.kpi_target_talk_time_minutes} onChange={e => setForm((f: any) => ({ ...f, kpi_target_talk_time_minutes: parseInt(e.target.value) || 0 }))} style={{ width: '80px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }} /></label>
                            </div>
                        </div>
                        <div style={{ marginTop: '16px', borderTop: '1px solid #ddd', paddingTop: '16px' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>Исключения (фильтры)</h4>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '8px' }}>
                                <input type="checkbox" checked={form.filter_exclude_answering_machine} onChange={(e) => setForm((f: any) => ({ ...f, filter_exclude_answering_machine: e.target.checked }))} /> Без автоответчиков
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px' }}>Короче (сек):</span>
                                <input type="number" value={form.filter_min_duration} onChange={e => setForm((f: any) => ({ ...f, filter_min_duration: parseInt(e.target.value) || 0 }))} style={{ width: '60px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button type="submit" disabled={saving} style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)', color: 'white', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                        {saving ? 'Сохранение...' : 'Сохранить настройки'}
                    </button>
                    {message && <span style={{ color: message.includes('Ошибка') ? '#FF5252' : '#4CAF50', fontSize: '14px', fontWeight: 500 }}>{message}</span>}
                </div>
            </form>
        </div>
    );
}
