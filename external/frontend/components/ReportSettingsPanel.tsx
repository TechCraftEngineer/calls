import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User } from '@/lib/auth';
import ReportSettingsFormBody from './ReportSettingsFormBody';

export default function ReportSettingsPanel({ user }: { user: User }) {
    const [form, setForm] = useState({
        email: '',
        email_daily_report: false,
        email_weekly_report: false,
        email_monthly_report: false,
        telegram_chat_id: '',
        telegram_daily_report: false,
        telegram_weekly_report: false,
        telegram_monthly_report: false,
        telegram_skip_weekends: false,
        report_include_call_summaries: false,
        report_detailed: false,
        report_include_avg_value: false,
        report_include_avg_rating: false,
        filter_exclude_answering_machine: false,
        filter_min_duration: 0,
        filter_min_replicas: 0,
        kpi_base_salary: 0,
        kpi_target_bonus: 0,
        kpi_target_talk_time_minutes: 0,
        report_daily_time: '18:00',
        report_weekly_day: 'fri',
        report_weekly_time: '18:10',
        report_monthly_day: 'last',
        report_monthly_time: '18:20',
        report_managed_user_ids: [] as number[]
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [loadedUser, setLoadedUser] = useState<{ first_name?: string; last_name?: string; internal_numbers?: string } | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [allUsers, setAllUsers] = useState<{ id: number; username: string; first_name?: string; last_name?: string }[]>([]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const [userRes, promptsRes] = await Promise.all([
                    api.get(`/users/${user.id}`),
                    api.get('/settings/prompts').catch(() => ({ data: [] }))
                ]);
                const u = userRes.data;
                setIsAdmin(u?.username === 'admin@mango' || u?.username === 'admin@gmail.com' || u?.internal_numbers === 'all');
                const promptsList = Array.isArray(promptsRes.data) ? promptsRes.data : [];
                const promptsMap: Record<string, string> = {};
                promptsList.forEach((p: { key: string; value?: string }) => { promptsMap[p.key] = p.value ?? ''; });
                setLoadedUser({
                    first_name: u.first_name,
                    last_name: u.last_name,
                    internal_numbers: u.internal_numbers
                });
                const bool = (v: unknown) => v === true || v === 1 || v === '1';
                const _normTime = (s: string) => { if (!s) return ''; const m = s.match(/(\d{1,2}):?(\d{0,2})/); return m ? `${m[1].padStart(2, '0')}:${(m[2] || '0').padStart(2, '0')}` : s; };
                let managedIds: number[] = [];
                try {
                    const raw = u.report_managed_user_ids;
                    if (Array.isArray(raw)) managedIds = raw.map(Number).filter(Boolean);
                    else if (typeof raw === 'string' && raw.trim()) managedIds = JSON.parse(raw).map(Number).filter(Boolean);
                } catch (_) { }
                setForm(prev => ({
                    ...prev,
                    report_managed_user_ids: managedIds,
                    email: u.email || '',
                    email_daily_report: bool(u.email_daily_report),
                    email_weekly_report: bool(u.email_weekly_report),
                    email_monthly_report: bool(u.email_monthly_report),
                    telegram_chat_id: u.telegram_chat_id || '',
                    telegram_daily_report: bool(u.telegram_daily_report),
                    telegram_weekly_report: bool(u.telegram_weekly_report),
                    telegram_monthly_report: bool(u.telegram_monthly_report),
                    telegram_skip_weekends: bool(u.telegram_skip_weekends),
                    report_include_call_summaries: bool(u.report_include_call_summaries),
                    report_detailed: bool(u.report_detailed),
                    report_include_avg_value: bool(u.report_include_avg_value),
                    report_include_avg_rating: bool(u.report_include_avg_rating),
                    filter_exclude_answering_machine: bool(u.filter_exclude_answering_machine),
                    filter_min_duration: Number(u.filter_min_duration) || 0,
                    filter_min_replicas: Number(u.filter_min_replicas) || 0,
                    kpi_base_salary: Number(u.kpi_base_salary) || 0,
                    kpi_target_bonus: Number(u.kpi_target_bonus) || 0,
                    kpi_target_talk_time_minutes: Number(u.kpi_target_talk_time_minutes) || 0,
                    report_daily_time: _normTime(promptsMap.report_daily_time) || '18:00',
                    report_weekly_day: (promptsMap.report_weekly_day || 'fri').toLowerCase(),
                    report_weekly_time: _normTime(promptsMap.report_weekly_time) || '18:10',
                    report_monthly_day: promptsMap.report_monthly_day || 'last',
                    report_monthly_time: _normTime(promptsMap.report_monthly_time) || '18:20'
                }));
            } catch (err) {
                console.error('Failed to fetch user settings', err);
            } finally {
                setLoading(false);
            }
        };
        if (user?.id) fetchUserData();
    }, [user]);

    useEffect(() => {
        if (!isAdmin || !user?.id) return;
        api.get('/users').then((res) => {
            const list = Array.isArray(res.data) ? res.data : [];
            setAllUsers(list.map((u: { id: number; username: string; first_name?: string; last_name?: string }) => ({
                id: u.id,
                username: u.username,
                first_name: u.first_name,
                last_name: u.last_name
            })));
        }).catch(() => { });
    }, [isAdmin, user?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            const payload = {
                first_name: loadedUser?.first_name ?? user.first_name ?? '',
                last_name: loadedUser?.last_name ?? user.last_name ?? '',
                internal_numbers: loadedUser?.internal_numbers ?? undefined,
                email: form.email.trim() || undefined,
                email_daily_report: form.email_daily_report,
                email_weekly_report: form.email_weekly_report,
                email_monthly_report: form.email_monthly_report,
                telegram_chat_id: form.telegram_chat_id.trim() || undefined,
                telegram_daily_report: form.telegram_daily_report,
                telegram_weekly_report: form.telegram_weekly_report,
                telegram_monthly_report: form.telegram_monthly_report,
                telegram_skip_weekends: form.telegram_skip_weekends,
                report_include_call_summaries: form.report_include_call_summaries,
                report_detailed: form.report_detailed,
                report_include_avg_value: form.report_include_avg_value,
                report_include_avg_rating: form.report_include_avg_rating,
                filter_exclude_answering_machine: form.filter_exclude_answering_machine,
                filter_min_duration: form.filter_min_duration,
                filter_min_replicas: form.filter_min_replicas,
                kpi_base_salary: form.kpi_base_salary,
                kpi_target_bonus: form.kpi_target_bonus,
                kpi_target_talk_time_minutes: form.kpi_target_talk_time_minutes,
                report_managed_user_ids: form.report_managed_user_ids ?? []
            };
            await api.put(`/users/${user.id}`, payload);
            if (isAdmin) {
                await api.put('/settings/prompts', {
                    prompts: {
                        report_daily_time: { value: form.report_daily_time || '18:00', description: 'Время ежедневного отчёта (ЧЧ:ММ)' },
                        report_weekly_day: { value: form.report_weekly_day || 'fri', description: 'День недели еженедельного' },
                        report_weekly_time: { value: form.report_weekly_time || '18:10', description: 'Время еженедельного отчёта' },
                        report_monthly_day: { value: form.report_monthly_day || 'last', description: 'День месяца (1-28 или last)' },
                        report_monthly_time: { value: form.report_monthly_time || '18:20', description: 'Время ежемесячного отчёта' }
                    }
                }).catch(() => { });
            }
            setMessage('Настройки успешно сохранены!');
            setTimeout(() => setMessage(''), 3000);
            // Перезагружаем данные с сервера, чтобы форма отображала сохранённые значения
            const userRes = await api.get(`/users/${user.id}`);
            const u = userRes.data;
            const bool = (v: unknown) => v === true || v === 1 || v === '1';
            setLoadedUser({ first_name: u.first_name, last_name: u.last_name, internal_numbers: u.internal_numbers });
            setForm(prev => ({
                ...prev,
                email: u.email || '',
                email_daily_report: bool(u.email_daily_report),
                email_weekly_report: bool(u.email_weekly_report),
                email_monthly_report: bool(u.email_monthly_report),
                telegram_chat_id: u.telegram_chat_id || '',
                telegram_daily_report: bool(u.telegram_daily_report),
                telegram_weekly_report: bool(u.telegram_weekly_report),
                telegram_monthly_report: bool(u.telegram_monthly_report),
                telegram_skip_weekends: bool(u.telegram_skip_weekends),
                report_include_call_summaries: bool(u.report_include_call_summaries),
                report_detailed: bool(u.report_detailed),
                report_include_avg_value: bool(u.report_include_avg_value),
                report_include_avg_rating: bool(u.report_include_avg_rating),
                filter_exclude_answering_machine: bool(u.filter_exclude_answering_machine),
                filter_min_duration: Number(u.filter_min_duration) || 0,
                filter_min_replicas: Number(u.filter_min_replicas) || 0,
                kpi_base_salary: Number(u.kpi_base_salary) || 0,
                kpi_target_bonus: Number(u.kpi_target_bonus) || 0,
                kpi_target_talk_time_minutes: Number(u.kpi_target_talk_time_minutes) || 0,
                report_managed_user_ids: (() => {
                    try {
                        const raw = u.report_managed_user_ids;
                        if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
                        if (typeof raw === 'string' && raw.trim()) return JSON.parse(raw).map(Number).filter(Boolean);
                    } catch (_) { }
                    return [];
                })()
            }));
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: unknown } } };
            const detail = e.response?.data?.detail;
            const msg = Array.isArray(detail)
                ? (detail as { msg?: string }[]).map((e) => e.msg).filter(Boolean).join('. ') || 'Ошибка валидации'
                : (typeof detail === 'string' ? detail : 'Ошибка при сохранении настроек.');
            setMessage(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Загрузка настроек...</div>;

    return (
        <ReportSettingsFormBody
            form={form}
            setForm={setForm}
            handleSubmit={handleSubmit}
            saving={saving}
            message={message}
            user={user}
            isAdmin={isAdmin}
            allUsers={allUsers}
        />
    );
}
