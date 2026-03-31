/**
 * React хуки для работы с Better Auth и API
 */

import { useEffect, useState } from "react";
import { useSession } from "./better-auth";

// Хук для работы с сессией пользователя
export function useAuth() {
  const { data: session, isPending, error } = useSession();

  return {
    user: session?.user || null,
    isLoading: isPending,
    error,
    isAuthenticated: !!session?.user,
  };
}

// Хук для загрузки данных с retry логикой
export function useApiData<T>(fetcher: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps passed dynamically by caller
  }, deps);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// Хук для пагинации
export function usePagination<T>(
  fetcher: (
    page: number,
    pageSize: number,
  ) => Promise<{
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>,
  initialPageSize = 20,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const { data, isLoading, error, refetch } = useApiData(
    () => fetcher(page, pageSize),
    [page, pageSize],
  );

  return {
    items: data?.items || [],
    total: data?.total || 0,
    page,
    pageSize,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    setPage,
    setPageSize,
    refetch,
  };
}

// Хук для поиска с дебаунсом
export function useSearch<T>(fetcher: (query: string) => Promise<T[]>, debounceMs = 300) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const { data, isLoading, error } = useApiData(() => fetcher(debouncedQuery), [debouncedQuery]);

  return {
    results: data || [],
    query,
    setQuery,
    isLoading,
    error,
  };
}
