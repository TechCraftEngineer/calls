"use client";

import {
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@calls/ui";
import { Funnel, Search, X } from "lucide-react";

export type DirectionFilter = "inbound" | "outbound";
export type StatusFilter = "missed" | "answered" | "technical_error";

export interface CallsFiltersState {
  q: string;
  dateFrom: string;
  dateTo: string;
  direction: DirectionFilter[];
  manager: string[];
  status: StatusFilter[];
  value: number[];
}

export interface ManagerOption {
  id: string;
  name: string;
}

interface CallsFiltersProps {
  filters: CallsFiltersState;
  managerOptions: ManagerOption[];
  updateFilters: (updater: (prev: CallsFiltersState) => CallsFiltersState) => void;
  onReset: () => void;
  onSubmit: () => void;
}

const directionOptions = [
  { value: "all", label: "Все" },
  { value: "inbound", label: "Входящие" },
  { value: "outbound", label: "Исходящие" },
] as const;

const statusOptions = [
  { value: "all", label: "Все" },
  { value: "missed", label: "Не принятые" },
  { value: "answered", label: "Принятые" },
  { value: "technical_error", label: "Ошибки" },
] as const;

const valueOptions = [1, 2, 3, 4, 5] as const;

export function CallsFilters({
  filters,
  managerOptions,
  updateFilters,
  onReset,
  onSubmit,
}: CallsFiltersProps) {
  const selectedDirectionLabel =
    filters.direction.length === 0
      ? "Все"
      : filters.direction
          .map((value) => directionOptions.find((o) => o.value === value)?.label)
          .filter(Boolean)
          .join(", ");

  const selectedStatusLabel =
    filters.status.length === 0
      ? "Все"
      : filters.status
          .map((value) => statusOptions.find((o) => o.value === value)?.label)
          .filter(Boolean)
          .join(", ");

  const selectedValueCount = filters.value.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-105">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            id="calls-search"
            placeholder="Поиск по номеру, сотруднику, клиенту"
            aria-label="Поиск по номеру, сотруднику или клиенту"
            value={filters.q}
            onChange={(e) =>
              updateFilters((prev) => ({
                ...prev,
                q: e.target.value,
              }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            className="h-9 pl-9 pr-9"
          />
          {filters.q.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 size-7"
              onClick={() => updateFilters((prev) => ({ ...prev, q: "" }))}
              aria-label="Очистить поиск"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9">
              <Funnel className="size-4" />
              Направление: {selectedDirectionLabel}
              {filters.direction.length > 0 && (
                <Badge variant="secondary">{filters.direction.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 space-y-3">
            {directionOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`direction-${option.value}`}
                  checked={
                    option.value === "all"
                      ? filters.direction.length === 0
                      : filters.direction.includes(option.value)
                  }
                  onCheckedChange={(checked) => {
                    if (option.value === "all" && checked === true) {
                      updateFilters((prev) => ({ ...prev, direction: [] }));
                      return;
                    }
                    if (option.value === "all") return;
                    if (checked === true) {
                      updateFilters((prev) => ({
                        ...prev,
                        direction: [...prev.direction, option.value],
                      }));
                    } else {
                      updateFilters((prev) => ({
                        ...prev,
                        direction: prev.direction.filter((v) => v !== option.value),
                      }));
                    }
                  }}
                />
                <Label htmlFor={`direction-${option.value}`} className="font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9">
              <Funnel className="size-4" />
              Статус: {selectedStatusLabel}
              {filters.status.length > 0 && (
                <Badge variant="secondary">{filters.status.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 space-y-3">
            {statusOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={
                    option.value === "all"
                      ? filters.status.length === 0
                      : filters.status.includes(option.value)
                  }
                  onCheckedChange={(checked) => {
                    if (option.value === "all" && checked === true) {
                      updateFilters((prev) => ({ ...prev, status: [] }));
                      return;
                    }
                    if (option.value === "all") return;
                    if (checked === true) {
                      updateFilters((prev) => ({
                        ...prev,
                        status: [...prev.status, option.value],
                      }));
                    } else {
                      updateFilters((prev) => ({
                        ...prev,
                        status: prev.status.filter((v) => v !== option.value),
                      }));
                    }
                  }}
                />
                <Label htmlFor={`status-${option.value}`} className="font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9">
              <Funnel className="size-4" />
              Сотрудники
              {filters.manager.length > 0 && (
                <Badge variant="secondary">{filters.manager.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="h-8 w-full justify-start px-2"
                onClick={() => updateFilters((prev) => ({ ...prev, manager: [] }))}
              >
                {managerOptions.length === 1 ? "Мои звонки" : "Все сотрудники"}
              </Button>
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {managerOptions.map((manager) => (
                  <div key={manager.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`manager-${manager.id}`}
                      checked={filters.manager.includes(manager.id)}
                      onCheckedChange={(checked) =>
                        updateFilters((prev) => ({
                          ...prev,
                          manager:
                            checked === true
                              ? [...prev.manager, manager.id]
                              : prev.manager.filter((v) => v !== manager.id),
                        }))
                      }
                    />
                    <Label htmlFor={`manager-${manager.id}`} className="font-normal">
                      {manager.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9">
              <Funnel className="size-4" />
              Ценность
              {selectedValueCount > 0 && <Badge variant="secondary">{selectedValueCount}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 space-y-3">
            {valueOptions.map((value) => (
              <div key={value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`value-${value}`}
                  checked={filters.value.includes(value)}
                  onCheckedChange={(checked) =>
                    updateFilters((prev) => ({
                      ...prev,
                      value:
                        checked === true
                          ? [...prev.value, value]
                          : prev.value.filter((v) => v !== value),
                    }))
                  }
                />
                <Label htmlFor={`value-${value}`} className="font-normal">
                  {value}
                </Label>
              </div>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9">
              <Funnel className="size-4" />
              Период
              {(filters.dateFrom || filters.dateTo) && <Badge variant="secondary">1</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Дата от</Label>
              <DatePicker
                value={filters.dateFrom}
                onChange={(v) => updateFilters((prev) => ({ ...prev, dateFrom: v }))}
                placeholder="Выберите дату"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Дата до</Label>
              <DatePicker
                value={filters.dateTo}
                onChange={(v) => updateFilters((prev) => ({ ...prev, dateTo: v }))}
                placeholder="Выберите дату"
              />
            </div>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={onReset} className="h-9">
            Сбросить
          </Button>
          <Button className="h-9" onClick={onSubmit}>
            Найти
          </Button>
        </div>
      </div>
    </div>
  );
}
