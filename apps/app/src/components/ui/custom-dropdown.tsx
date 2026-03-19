"use client";

import { Button } from "@calls/ui";
import { useCallback, useEffect, useId, useRef, useState } from "react";

interface Manager {
  id: string;
  name: string;
}

interface DropdownProps {
  label: string;
  value: string | number[] | string[];
  onChange: (val: string | number[] | string[]) => void;
  type: "manager" | "value" | "operator";
  managerOptions?: string[];
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
  managerOptions = [],
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const instanceId = useId();
  const panelDomId = `${instanceId}-panel`;

  const managers: Manager[] =
    type === "manager"
      ? managerOptions.map((name) => ({
          id: name,
          name,
        }))
      : [];

  const closeMenu = useCallback((shouldReturnFocus = false) => {
    setIsOpen(false);
    if (shouldReturnFocus) {
      requestAnimationFrame(() => toggleRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeMenu(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeMenu]);

  const toggle = () => setIsOpen((v) => !v);

  useEffect(() => {
    if (!isOpen) return;

    const getFocusable = () => {
      const root = panelRef.current;
      if (!root) return [] as HTMLElement[];

      const selector =
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

      return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          el.getAttribute("aria-hidden") !== "true",
      );
    };

    // Автофокус первого элемента в раскрытой панели
    const focusables = getFocusable();
    focusables[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
        return;
      }

      if (e.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isOpen, closeMenu]);

  if (type === "manager") {
    const managerValue = typeof value === "string" ? value : "";
    const selectedManager = managers.find(
      (m) => m.id.toString() === managerValue,
    );
    const displayLabel = selectedManager ? selectedManager.name : "Выбрать";

    return (
      <div className="custom-dropdown" ref={dropdownRef}>
        <Button
          asChild
          type="button"
          variant="outline"
          className="dropdown-toggle w-full justify-between border-foreground/30 text-foreground hover:bg-muted"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={panelDomId}
        >
          <button ref={toggleRef} type="button">
            <span className="dropdown-label">{displayLabel}</span>
          </button>
        </Button>
        {isOpen && (
          <div id={panelDomId} ref={panelRef} className="dropdown-menu">
            <Button
              type="button"
              variant="ghost"
              className="dropdown-option w-full justify-start"
              onClick={() => {
                onChange("");
                closeMenu(true);
              }}
            >
              Все сотрудники
            </Button>
            {managers.map((m) => (
              <Button
                key={m.id}
                type="button"
                variant="ghost"
                className={`dropdown-option w-full justify-start ${managerValue === m.id.toString() ? "is-active" : ""}`}
                onClick={() => {
                  onChange(m.id.toString());
                  closeMenu(true);
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

  // Фильтр значений (1–5)
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
          asChild
          type="button"
          variant="outline"
          className="dropdown-toggle w-full justify-between border-foreground/30 text-foreground hover:bg-muted"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={panelDomId}
        >
          <button ref={toggleRef} type="button">
            <span className="dropdown-label">{getDisplayLabel()}</span>
          </button>
        </Button>
        {isOpen && (
          <div id={panelDomId} ref={panelRef} className="dropdown-menu">
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

  // Фильтр операторов (mango, megafon)
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
          asChild
          type="button"
          variant="outline"
          className="dropdown-toggle w-full justify-between border-foreground/30 text-foreground hover:bg-muted"
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls={panelDomId}
        >
          <button ref={toggleRef} type="button">
            <span className="dropdown-label">{getDisplayLabel()}</span>
          </button>
        </Button>
        {isOpen && (
          <div id={panelDomId} ref={panelRef} className="dropdown-menu">
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
