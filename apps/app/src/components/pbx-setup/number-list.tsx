"use client";

import { Button, Card, Checkbox, Input } from "@calls/ui";
import { Phone, Search, X } from "lucide-react";
import { ITEMS_PER_PAGE } from "@/app/(app)/setup/pbx-setup/_components/constants";
import type { PhoneNumber } from "@/app/(app)/setup/pbx-setup/_components/types";

interface NumberListProps {
  numbers: PhoneNumber[];
  selectedNumbers: Set<string>;
  filteredNumbers: PhoneNumber[];
  paginatedNumbers: PhoneNumber[];
  numberSearch: string;
  setNumberSearch: (value: string) => void;
  setNumberPage: (value: number | ((prev: number) => number)) => void;
  numberPage: number;
  totalNumberPages: number;
  allNumbersSelected: boolean;
  onToggleNumber: (id: string) => void;
  onSelectAllNumbers: () => void;
  onSelectAllFilteredNumbers: () => void;
  onClearSearch: () => void;
}

export function NumberList({
  numbers,
  selectedNumbers,
  filteredNumbers,
  paginatedNumbers,
  numberSearch,
  setNumberSearch,
  setNumberPage,
  numberPage,
  totalNumberPages,
  allNumbersSelected,
  onToggleNumber,
  onSelectAllNumbers,
  onSelectAllFilteredNumbers,
  onClearSearch,
}: NumberListProps) {
  return (
    <Card className="mb-6 p-6">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Phone className="size-5 text-primary" />
          Номера ({numbers.length} всего, выбрано {selectedNumbers.size})
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск номеров..."
              value={numberSearch}
              onChange={(e) => {
                setNumberSearch(e.target.value);
                setNumberPage(0);
              }}
              className="pl-9 pr-9"
            />
            {numberSearch && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
                onClick={onClearSearch}
                aria-label="Очистить поиск номеров"
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {filteredNumbers.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Checkbox
            checked={allNumbersSelected}
            onCheckedChange={onSelectAllNumbers}
            id="select-all-numbers-page"
          />
          <label htmlFor="select-all-numbers-page" className="text-sm">
            Выбрать все на странице ({paginatedNumbers.length})
          </label>
          {filteredNumbers.length > ITEMS_PER_PAGE && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSelectAllFilteredNumbers}
              className="text-xs"
            >
              Выбрать все найденные ({filteredNumbers.length})
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {paginatedNumbers.map((number) => (
          <label
            key={number.id}
            htmlFor={`checkbox-number-${number.id}`}
            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
          >
            <Checkbox
              id={`checkbox-number-${number.id}`}
              checked={selectedNumbers.has(number.id)}
              onCheckedChange={() => onToggleNumber(number.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{number.phoneNumber}</div>
              <div className="text-sm text-muted-foreground truncate">
                {number.label && `${number.label}`}
                {number.employee && ` • ${number.employee.displayName}`}
                {number.lineType && ` • ${number.lineType}`}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Number Pagination */}
      {totalNumberPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Страница {numberPage + 1} из {totalNumberPages} ({filteredNumbers.length} всего)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNumberPage((p) => Math.max(0, p - 1))}
              disabled={numberPage === 0}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNumberPage((p) => Math.min(totalNumberPages - 1, p + 1))}
              disabled={numberPage >= totalNumberPages - 1}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}

      {filteredNumbers.length === 0 && numberSearch && (
        <div className="py-8 text-center text-muted-foreground">Ничего не найдено</div>
      )}
    </Card>
  );
}
