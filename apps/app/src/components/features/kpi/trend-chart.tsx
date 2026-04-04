"use client";

import type { DailyKpiRow } from "@calls/shared";
import { Card, Skeleton } from "@calls/ui";
import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getColorByPercentage } from "@/lib/kpi-utils";

interface TrendChartProps {
  data: DailyKpiRow[];
  loading: boolean;
}

// Skeleton для загрузки
function ChartSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-[400px] w-full" />
    </Card>
  );
}

// Утилита для получения HSL цвета по проценту выполнения
function getHslColor(percentage: number): string {
  const color = getColorByPercentage(percentage);
  if (color === "green") return "hsl(142, 76%, 36%)";
  if (color === "yellow") return "hsl(48, 96%, 53%)";
  return "hsl(0, 84%, 60%)";
}

// Русские названия месяцев для ручного форматирования (без зависимости от таймзоны)
const RUSSIAN_MONTH_NAMES = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const RUSSIAN_MONTH_NAMES_SHORT = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

// Утилита для форматирования даты из YYYY-MM-DD в русский формат без timezone сдвигов
function formatRussianDate(dateStr: string, shortMonth = false): string {
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  const month = Number.parseInt(dateStr.slice(5, 7), 10);
  const day = Number.parseInt(dateStr.slice(8, 10), 10);

  const paddedDay = day.toString().padStart(2, "0");

  if (shortMonth) {
    const monthShort = RUSSIAN_MONTH_NAMES_SHORT[month - 1] ?? String(month).padStart(2, "0");
    return `${paddedDay}.${monthShort}`;
  }

  const monthName = RUSSIAN_MONTH_NAMES[month - 1] ?? String(month);
  return `${paddedDay} ${monthName} ${year}`;
}

// Кастомный tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: {
      date: string;
      actualTalkTimeMinutes: number;
      targetTalkTimeMinutes: number;
      completionPercentage: number;
    };
  }>;
}

const CustomTooltip = React.memo(function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  // Используем ручное форматирование без timezone сдвигов
  const displayDate = formatRussianDate(data.date, false);

  return (
    <Card className="border-border bg-background p-3 shadow-lg">
      <div className="space-y-2">
        <p className="text-sm font-semibold">{displayDate}</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Фактическое время:</span>
            <span className="font-medium">{data.actualTalkTimeMinutes} мин</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Целевое время:</span>
            <span className="font-medium">{data.targetTalkTimeMinutes} мин</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Выполнение:</span>
            <span
              className="font-semibold"
              style={{
                color: getHslColor(data.completionPercentage),
              }}
            >
              {data.completionPercentage}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});

// Кастомная точка с цветовым кодированием
interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: {
    completionPercentage: number;
  };
}

const CustomDot = React.memo(function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;

  const fillColor = getHslColor(payload.completionPercentage);

  return <circle cx={cx} cy={cy} r={4} fill={fillColor} stroke="white" strokeWidth={2} />;
});

export const TrendChart = React.memo(function TrendChart({ data, loading }: TrendChartProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  // Определяем мобильное устройство
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Подготовка данных для графика - useMemo должен быть до условных return
  const chartData = React.useMemo(
    () =>
      data?.map((row) => {
        return {
          date: row.date,
          actualTalkTimeMinutes: row.actualTalkTimeMinutes,
          targetTalkTimeMinutes: row.targetTalkTimeMinutes,
          completionPercentage: row.completionPercentage,
          // Форматированная дата для оси X (ручное форматирование без timezone)
          formattedDate: formatRussianDate(row.date, true),
        };
      }) || [],
    [data],
  );

  if (loading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const chartHeight = isMobile ? 300 : 400;

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-semibold">Динамика времени разговоров</h3>
        <p className="text-muted-foreground text-xs md:text-sm">
          Фактическое время разговоров и целевые показатели по дням
        </p>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: isMobile ? 10 : 30,
            left: isMobile ? 0 : 20,
            bottom: 5,
          }}
          aria-label="График динамики времени разговоров"
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="formattedDate"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
            aria-label="Дата"
            interval={isMobile ? "preserveStartEnd" : "preserveEnd"}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
            label={
              isMobile
                ? undefined
                : {
                    value: "Минуты",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "hsl(var(--muted-foreground))" },
                  }
            }
            aria-label="Время в минутах"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: "20px",
            }}
          />
          <Line
            type="monotone"
            dataKey="targetTalkTimeMinutes"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Целевое время"
            dot={false}
            aria-label="Линия целевого времени"
          />
          <Line
            type="monotone"
            dataKey="actualTalkTimeMinutes"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Фактическое время"
            dot={<CustomDot />}
            aria-label="Линия фактического времени"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
});
