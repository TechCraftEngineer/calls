import { Input } from "@calls/ui";
import type React from "react";

interface ParamsSectionProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export function ReportParamsSection({ form, setForm }: ParamsSectionProps) {
  return (
    <div className="p-4 bg-[#f5f7fa] rounded-lg">
      <h4 className="m-0 mb-3 text-sm font-bold">Параметры отчетов</h4>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.report_detailed}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_detailed: e.target.checked,
              }))
            }
          />{" "}
          Подробный формат
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.report_include_call_summaries}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_include_call_summaries: e.target.checked,
              }))
            }
          />{" "}
          ИИ-саммари вызовов (Email)
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.report_include_avg_value}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_include_avg_value: e.target.checked,
              }))
            }
          />{" "}
          Средняя сумма сделки
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.report_include_avg_rating}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                report_include_avg_rating: e.target.checked,
              }))
            }
          />{" "}
          Средняя оценка качества
        </label>
      </div>

      <KpiSettings form={form} setForm={setForm} />
      <FilterExclusions form={form} setForm={setForm} />
    </div>
  );
}

function KpiSettings({
  form,
  setForm,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}) {
  return (
    <div className="mt-4 border-t border-[#ddd] pt-4">
      <h4 className="m-0 mb-3 text-sm font-bold">Настройки KPI</h4>
      <div className="flex flex-wrap gap-3 items-center mb-3">
        <label className="text-[13px]">
          Базовый оклад (₽):{" "}
          <Input
            type="number"
            min={0}
            value={form.kpi_base_salary}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                kpi_base_salary: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-[100px] py-1.5 px-2 border border-[#ddd] rounded"
          />
        </label>
        <label className="text-[13px]">
          Целевой бонус (₽):{" "}
          <Input
            type="number"
            min={0}
            value={form.kpi_target_bonus}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                kpi_target_bonus: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-[100px] py-1.5 px-2 border border-[#ddd] rounded"
          />
        </label>
        <label className="text-[13px]">
          Целевое время разговоров (мин):{" "}
          <Input
            type="number"
            min={0}
            value={form.kpi_target_talk_time_minutes}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                kpi_target_talk_time_minutes: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-[80px] py-1.5 px-2 border border-[#ddd] rounded"
          />
        </label>
      </div>
    </div>
  );
}

function FilterExclusions({
  form,
  setForm,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}) {
  return (
    <div className="mt-4 border-t border-[#ddd] pt-4">
      <h4 className="m-0 mb-3 text-sm font-bold">Исключения (фильтры)</h4>
      <label className="flex items-center gap-2 text-[13px] mb-2">
        <input
          type="checkbox"
          checked={form.filter_exclude_answering_machine}
          onChange={(e) =>
            setForm((f: any) => ({
              ...f,
              filter_exclude_answering_machine: e.target.checked,
            }))
          }
        />{" "}
        Без автоответчиков
      </label>
      <div className="flex items-center gap-2">
        <span className="text-[13px]">Короче (сек):</span>
        <Input
          type="number"
          value={form.filter_min_duration}
          onChange={(e) =>
            setForm((f: any) => ({
              ...f,
              filter_min_duration: parseInt(e.target.value, 10) || 0,
            }))
          }
          className="w-[60px] py-1 px-2 border border-[#ddd] rounded"
        />
      </div>
    </div>
  );
}
