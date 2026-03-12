import { useState, useEffect } from 'react';
import { restGet } from '@/lib/api';

interface KpiRow {
    user_id: number;
    name: string;
    username: string;
    base_salary: number;
    target_bonus: number;
    target_talk_time_minutes: number;
    period_target_talk_time_minutes: number;
    actual_talk_time_minutes: number;
    kpi_completion_percentage: number;
    calculated_bonus: number;
    total_calculated_salary: number;
    total_calls: number;
    incoming: number;
    outgoing: number;
    missed: number;
}

export default function KpiTable({ dateFrom, dateTo }: { dateFrom: string, dateTo: string }) {
    const [data, setData] = useState<KpiRow[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const d_from = dateFrom || new Date().toISOString().split('T')[0];
                const d_to = dateTo || new Date().toISOString().split('T')[0];
                const res = await restGet<KpiRow[]>(`/v1/kpi/?start_date=${d_from}&end_date=${d_to}`);
                setData(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error("Failed to load KPI data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [dateFrom, dateTo]);

    if (loading) return <div>Загрузка таблиц KPI...</div>;

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '24px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEE' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Расчет KPI сотрудников</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="op-table">
                    <thead>
                        <tr>
                            <th>Сотрудник</th>
                            <th>Оклад (руб)</th>
                            <th>Бонус (руб)</th>
                            <th>Цель (мин) / Мес.</th>
                            <th>План (мин) / Пер.</th>
                            <th>Факт (мин)</th>
                            <th>Выполнение (%)</th>
                            <th>Бонус за период</th>
                            <th>ИТОГО Выплата</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(row => (
                            <tr key={row.user_id}>
                                <td style={{ fontWeight: 600 }}>{row.name} <br /><small style={{ color: '#999' }}>{row.username}</small></td>
                                <td>{row.base_salary.toLocaleString()} ₽</td>
                                <td>{row.target_bonus.toLocaleString()} ₽</td>
                                <td>{row.target_talk_time_minutes}</td>
                                <td>{row.period_target_talk_time_minutes}</td>
                                <td style={{ color: row.actual_talk_time_minutes >= row.period_target_talk_time_minutes ? 'var(--status-success)' : 'var(--status-warning)' }}>
                                    {row.actual_talk_time_minutes}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ flex: 1, background: '#EEE', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${row.kpi_completion_percentage}%`, background: row.kpi_completion_percentage >= 100 ? 'var(--status-success)' : 'var(--status-warning)', height: '100%' }} />
                                        </div>
                                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{row.kpi_completion_percentage}%</span>
                                    </div>
                                </td>
                                <td style={{ fontWeight: 600 }}>{row.calculated_bonus.toLocaleString()} ₽</td>
                                <td style={{ fontWeight: 'bold', color: 'var(--brand-primary)' }}>{row.total_calculated_salary.toLocaleString()} ₽</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>Нет данных для отображения</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
