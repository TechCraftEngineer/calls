interface MetricsProps {
  metrics: {
    totalCalls: number;
    transcribed: number;
    avgDuration: number;
    lastSync?: string | null;
  };
}

export default function Metrics({ metrics }: MetricsProps) {
  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-label">Всего звонков</div>
        <div className="metric-value">{metrics.totalCalls}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Обработано AI</div>
        <div className="metric-value">{metrics.transcribed}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Среднее время</div>
        <div className="metric-value">{formatDuration(metrics.avgDuration)}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Транскрибировано</div>
        <div className="metric-value">
          {metrics.totalCalls > 0
            ? Math.round((metrics.transcribed / metrics.totalCalls) * 100)
            : 0}
          %
        </div>
      </div>
    </div>
  );
}
