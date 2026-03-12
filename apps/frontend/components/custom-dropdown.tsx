"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

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
function isString(value: string | number[] | string[]): value is string {
  return typeof value === "string";
}

function isNumberArray(value: string | number[] | string[]): value is number[] {
  return (
    Array.isArray(value) && (value.length === 0 || typeof value[0] === "number")
  );
}

export default function CustomDropdown({
  label,
  value,
  onChange,
  type,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (type === "manager") {
      api.users.list().then((list: any) => {
        const arr = (Array.isArray(list) ? list : []) as {
          id: number;
          username?: string;
          name?: string;
        }[];
        setManagers(
          arr.map((u) => ({
            id: String(u.id),
            name: u.name || u.username || String(u.id),
          })),
        );
      });
    }
  }, [type]);

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
        <button type="button" className="dropdown-toggle" onClick={toggle}>
          <span className="dropdown-label">{displayLabel}</span>
        </button>
        {isOpen && (
          <div className="dropdown-menu">
            <button
              type="button"
              className="dropdown-option"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              Все менеджеры
            </button>
            {managers.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`dropdown-option ${managerValue === m.id.toString() ? "is-active" : ""}`}
                onClick={() => {
                  onChange(m.id.toString());
                  setIsOpen(false);
                }}
              >
                {m.name}
              </button>
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
        <button type="button" className="dropdown-toggle" onClick={toggle}>
          <span className="dropdown-label">{getDisplayLabel()}</span>
        </button>
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
        <button type="button" className="dropdown-toggle" onClick={toggle}>
          <span className="dropdown-label">{getDisplayLabel()}</span>
        </button>
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
