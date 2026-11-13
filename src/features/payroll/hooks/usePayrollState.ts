import { useState, useCallback, useEffect } from "react";
import type { DependencyList } from "react";

export type DataState = "idle" | "loading" | "success" | "error" | "empty";

export interface StateConfig<T> {
  state: DataState;
  data: T[];
  error: string | null;
  isLoading: boolean;
  isEmpty: boolean;
  isError: boolean;
  isSuccess: boolean;
}

/**
 * Hook for managing async data loading states
 * Provides clear distinction between: idle, loading, error, empty, success
 */
export function useDataState<T>(
  initialData: T[] = []
): StateConfig<T> & {
  setLoading: () => void;
  setSuccess: (data: T[]) => void;
  setError: (error: string) => void;
  setEmpty: () => void;
  reset: () => void;
} {
  const [state, setState] = useState<DataState>("idle");
  const [data, setData] = useState<T[]>(initialData);
  const [error, setErrorState] = useState<string | null>(null);

  const setLoading = useCallback(() => {
    setState("loading");
    setErrorState(null);
  }, []);

  const setSuccess = useCallback((newData: T[]) => {
    setData(newData);
    setState(newData.length > 0 ? "success" : "empty");
    setErrorState(null);
  }, []);

  const setError = useCallback((errorMessage: string) => {
    setState("error");
    setErrorState(errorMessage);
    setData([]);
  }, []);

  const setEmpty = useCallback(() => {
    setState("empty");
    setData([]);
    setErrorState(null);
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setData(initialData);
    setErrorState(null);
  }, [initialData]);

  return {
    state,
    data,
    error,
    isLoading: state === "loading",
    isEmpty: state === "empty",
    isError: state === "error",
    isSuccess: state === "success",
    setLoading,
    setSuccess,
    setError,
    setEmpty,
    reset,
  };
}

/**
 * Hook for async operations with automatic state management
 */
export function useAsync<T, R = T>(
  asyncFunction: () => Promise<R>,
  dependencies: DependencyList = [],
  onSuccess?: (data: R) => void,
  onError?: (error: Error) => void
) {
  const [state, setState] = useState<{
    status: "idle" | "pending" | "success" | "error";
    data: R | null;
    error: Error | null;
  }>({
    status: "idle",
    data: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const execute = async () => {
      setState({ status: "pending", data: null, error: null });

      try {
        const response = await asyncFunction();
        if (isMounted) {
          setState({ status: "success", data: response, error: null });
          onSuccess?.(response);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (isMounted) {
          setState({ status: "error", data: null, error: err });
          onError?.(err);
        }
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return state;
}
