"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "../lib/utils";

const DATE_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "dd.MM.yyyy";

function parseValue(value: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = parse(value, DATE_FORMAT, new Date());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatValue(date: Date | undefined): string {
  if (!date) return "";
  return format(date, DATE_FORMAT);
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Выберите дату",
  id,
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = parseValue(value);

  const handleSelect = React.useCallback(
    (d: Date | undefined) => {
      onChange(formatValue(d));
      setOpen(false);
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          data-empty={!date}
          className={cn(
            "w-full justify-between text-left font-normal min-w-[150px]",
            "data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="size-4 shrink-0 opacity-70" />
            {date ? (
              format(date, DISPLAY_FORMAT, { locale: ru })
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  );
}
