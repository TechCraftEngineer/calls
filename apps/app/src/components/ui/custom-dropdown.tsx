"use client";

import { Button } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useORPC } from "@/orpc/react";

interface Manager {
  id: string;
  name: string;
}

interface DropdownProps {
  label: string;
  value: string | number[] | string[];
  onChange: (val: string | number[] | string[]) => void;
  type: "manager" | "value" | "operator";
}

// Type guards для правильной типизации
function _isString(value: string | number[] | string[]): value is string {
  return typeof value === "string";
}

function isNumberArray(value: string | number[] | string[]): value is number[] {
  return (
    Array.isArray(value) && (value.length === 0 || typeof value[0] === "number")
  );
}

export default function CustomDropdown({
  label: _label,
  value,
  onChange,
  type,
}: DropdownProps) {
  const orpc = useORPC();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: managersList = [] } = useQuery({
    ...orpc.users.list.queryOptions(),
    enabled: type === "manager",
  });

  const managers: Manager[] =
    type === "manager"
      ? (managersList as { id: string; name?: string; email?: string }[]).map(
          (u) => ({
            id: String(u.id),
            name: u.name || u.email || String(u.id),
          }),
        )
      : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggle = () => setIsOpen(!isOpen);

  if (type === "manager") {
    const managerValue = typeof value === "string" ? value : "";
    const selectedManager = managers.find(
      (m) => m.id.toString() === managerValue,
    );
    const displayLabel = selectedManager ? selectedManager.name : "Выбрать";

    return (
      <div className="custom-dropdown" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          className="dropdown-toggle w-full justify-between border-primary text-primary hover:bg-primary/10 hover:text-primary"
          onClick={toggle}
        >
          <span className="dropdown-label">{displayLabel}</span>
        </Button>
        {isOpen && (
          <div className="dropdown-menu">
            <Button
              type="button"
              variant="ghost"
              className="dropdown-option w-full justify-start"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              Все менеджеры
            </Button>
            {managers.map((m) => (
              <Button
                key={m.id}
                type="button"
                variant="ghost"
                className={`dropdown-option w-full justify-start ${managerValue === m.id.toString() ? "is-active" : ""}`}
                onClick={() => {
                  onChange(m.id.toString());
                  setIsOpen(false);
                }}
              >
                {m.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Value filter (1-5)
  if (type === "value") {
    const selectedValues: number[] =
      Array.isArray(value) && isNumberArray(value) ? value : [];
    const valueOptions = [1, 2, 3, 4, 5];

    const handleValueChange = (val: number, checked: boolean) => {
      let newValues: number[];
      if (checked) {
        newValues = [...selectedValues, val];
      } else {
        newValues = selectedValues.filter((v) => v !== val);
      }
      onChange(newValues);
    };

    const getDisplayLabel = () => {
      if (selectedValues.length === 0) return "Ценность (Любая)";
      if (selectedValues.length === 1) return `Ценность (${selectedValues[0]})`;
      if (selectedValues.length <= 3)
        return `Ценность (${selectedValues.join(", ")})`;
      return `Ценность (${selectedValues.length} выбрано)`;
    };

    return (
      <div className="custom-dropdown" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          className="dropdown-toggle w-full justify-between border-primary text-primary hover:bg-primary/10 hover:text-primary"
          onClick={toggle}
        >
          <span className="dropdown-label">{getDisplayLabel()}</span>
        </Button>
        {isOpen && (
          <div className="dropdown-menu">
            {valueOptions.map((val) => (
              <label
                key={val}
                className="dropdown-option cursor-pointer flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(val)}
                  onChange={(e) => handleValueChange(val, e.target.checked)}
                  className="cursor-pointer"
                />
                <span>{val}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Operator filter (mango, megafon)
  if (type === "operator") {
    const selectedOperators: string[] =
      Array.isArray(value) && !isNumberArray(value) ? (value as string[]) : [];
    const operatorOptions = [
      { value: "mango", label: "Манго" },
      { value: "megafon", label: "Мегафон" },
    ];

    const handleOperatorChange = (val: string, checked: boolean) => {
      let newValues: string[];
      if (checked) {
        newValues = [...selectedOperators, val];
      } else {
        newValues = selectedOperators.filter((v) => v !== val);
      }
      onChange(newValues);
    };

    const getDisplayLabel = () => {
      if (selectedOperators.length === 0) return "Оператор (Все)";
      if (selectedOperators.length === 1) {
        const op = operatorOptions.find(
          (o) => o.value === selectedOperators[0],
        );
        return `Оператор (${op?.label || selectedOperators[0]})`;
      }
      return `Оператор (${selectedOperators.length} выбрано)`;
    };

    return (
      <div className="custom-dropdown" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          className="dropdown-toggle w-full justify-between border-primary text-primary hover:bg-primary/10 hover:text-primary"
          onClick={toggle}
        >
          <span className="dropdown-label">{getDisplayLabel()}</span>
        </Button>
        {isOpen && (
          <div className="dropdown-menu">
            {operatorOptions.map((op) => (
              <label
                key={op.value}
                className="dropdown-option cursor-pointer flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={selectedOperators.includes(op.value)}
                  onChange={(e) =>
                    handleOperatorChange(op.value, e.target.checked)
                  }
                  className="cursor-pointer"
                />
                <span>{op.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
