import { Input } from "@calls/ui";
import type React from "react";
import type { ReportSettingsForm } from "../report-settings-types";

interface ParamsSectionProps {
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}

export function ReportParamsSection({ form, setForm }: ParamsSectionProps) {
  return (
    <div className="p-4 bg-[#f5f7fa] rounded-lg">
      <h4 className="m-0 mb-3 text-sm font-bold">Параметры отчетов</h4>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.reportDetailed}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportDetailed: e.target.checked,
              }))
            }
          />{" "}
          Подробный формат
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.reportIncludeCallSummaries}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportIncludeCallSummaries: e.target.checked,
              }))
            }
          />{" "}
          ИИ-саммари вызовов (Email)
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.reportIncludeAvgValue}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportIncludeAvgValue: e.target.checked,
              }))
            }
          />{" "}
          Средняя сумма сделки
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={form.reportIncludeAvgRating}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reportIncludeAvgRating: e.target.checked,
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
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}) {
  return (
    <div className="mt-4 border-t border-[#ddd] pt-4">
      <h4 className="m-0 mb-3 text-sm font-bold">Настройки KPI</h4>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-[13px]">
          <span className="min-w-[180px]">Базовый оклад (₽):</span>
          <Input
            type="number"
            min={0}
            value={form.kpiBaseSalary}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kpiBaseSalary: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-[100px] py-1.5 px-2 border border-[#ddd] rounded"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <span className="min-w-[180px]">Целевой бонус (₽):</span>
          <Input
            type="number"
            min={0}
            value={form.kpiTargetBonus}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kpiTargetBonus: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-[100px] py-1.5 px-2 border border-[#ddd] rounded"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <span className="min-w-[180px]">
            Целевое время разговоров в месяц (мин):
          </span>
          <Input
            type="number"
            min={0}
            value={form.kpiTargetTalkTimeMinutes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kpiTargetTalkTimeMinutes: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-[100px] py-1.5 px-2 border border-[#ddd] rounded"
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
  form: ReportSettingsForm;
  setForm: React.Dispatch<React.SetStateAction<ReportSettingsForm>>;
}) {
  return (
    <div className="mt-4 border-t border-[#ddd] pt-4">
      <h4 className="m-0 mb-3 text-sm font-bold">Исключения (фильтры)</h4>
      <label className="flex items-center gap-2 text-[13px] mb-2">
        <input
          type="checkbox"
          checked={form.filterExcludeAnsweringMachine}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              filterExcludeAnsweringMachine: e.target.checked,
            }))
          }
        />{" "}
        Без автоответчиков
      </label>
      <div className="flex items-center gap-2">
        <span className="text-[13px]">Короче (сек):</span>
        <Input
          type="number"
          value={form.filterMinDuration}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              filterMinDuration: parseInt(e.target.value, 10) || 0,
            }))
          }
          className="w-[60px] py-1 px-2 border border-[#ddd] rounded"
        />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[13px]">Мин. реплик:</span>
        <Input
          type="number"
          value={form.filterMinReplicas}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              filterMinReplicas: parseInt(e.target.value, 10) || 0,
            }))
          }
          className="w-[60px] py-1 px-2 border border-[#ddd] rounded"
        />
      </div>
    </div>
  );
}
