"use client";

import { Button, Input } from "@calls/ui";
import { Search, X } from "lucide-react";
import { useCallback } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "По номеру, сотруднику, резюме...",
  onSearch,
  className,
}: SearchInputProps) {
  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        e.preventDefault();
        onSearch();
      }
    },
    [onSearch],
  );

  return (
    <div className={`relative flex items-center ${className ?? ""}`}>
      <Search
        className="text-muted-foreground pointer-events-none absolute left-3 size-4 shrink-0"
        aria-hidden
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-9 min-w-[200px] !pl-10 pr-9 text-input bg-white border-[#eee] sm:min-w-[280px]"
        aria-label="Поиск по звонкам"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          aria-label="Очистить поиск"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
