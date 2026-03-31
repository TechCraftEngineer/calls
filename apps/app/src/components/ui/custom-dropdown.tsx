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
  label,
  value,
  onChange,
  type,
  managerOptions = [],
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelDivRef = useRef<HTMLDivElement | null>(null);
  const panelFieldsetRef = useRef<HTMLFieldSetElement | null>(null);
  const instanceId = useId();
  const panelDomId = `${instanceId}-panel`;
  const triggerLabelId = `${instanceId}-trigger-label`;
  const srTriggerLabelId = `${instanceId}-sr-trigger-label`;
  const panelLabelId = `${instanceId}-panel-label`;
  const popupRole = type === "manager" ? "listbox" : undefined;

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
      const root = panelDivRef.current ?? panelFieldsetRef.current;
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

      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Home" ||
        e.key === "End"
      ) {
        const items = getFocusable();
        if (items.length === 0) return;
        e.preventDefault();
        const active = document.activeElement as HTMLElement | null;
        const currentIndex = active ? items.indexOf(active) : -1;

        if (e.key === "Home") {
          items[0]?.focus();
          return;
        }
        if (e.key === "End") {
          items[items.length - 1]?.focus();
          return;
        }

        if (e.key === "ArrowDown") {
          const nextIndex =
            currentIndex >= 0 ? (currentIndex + 1) % items.length : 0;
          items[nextIndex]?.focus();
          return;
        }

        const prevIndex =
          currentIndex >= 0
            ? (currentIndex - 1 + items.length) % items.length
            : items.length - 1;
        items[prevIndex]?.focus();
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
          aria-haspopup={popupRole}
        >
          <button
            ref={toggleRef}
            type="button"
            aria-haspopup={popupRole}
            aria-labelledby={`${srTriggerLabelId} ${triggerLabelId}`}
          >
            <span id={srTriggerLabelId} className="sr-only">
              Фильтр менеджера
            </span>
            <span id={triggerLabelId} className="dropdown-label">
              {displayLabel || label}
            </span>
          </button>
        </Button>
        {isOpen && (
          <div
            id={panelDomId}
            ref={panelDivRef}
            className="dropdown-menu"
            role="listbox"
            aria-labelledby={srTriggerLabelId}
          >
            <Button
              type="button"
              variant="ghost"
              className="dropdown-option w-full justify-start"
              role="option"
              aria-selected={managerValue === ""}
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
                role="option"
                aria-selected={managerValue === m.id.toString()}
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
          aria-haspopup={popupRole}
        >
          <button ref={toggleRef} type="button">
            <span id={triggerLabelId} className="dropdown-label">
              {getDisplayLabel()}
            </span>
          </button>
        </Button>
        {isOpen && (
          <fieldset
            id={panelDomId}
            ref={panelFieldsetRef}
            className="dropdown-menu"
            aria-labelledby={panelLabelId}
          >
            <legend id={panelLabelId} className="sr-only">
              {label}
            </legend>
            {valueOptions.map((val) => (
              <label
                key={val}
                className="dropdown-option cursor-pointer flex min-h-11 items-center gap-2 px-2 py-1.5"
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
          </fieldset>
        )}
      </div>
    );
  }

  
  return null;
}
