'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AsyncActionState, AsyncActionStatus, UseAsyncActionOptions } from './types';

type AsyncActionSnapshot<TResult> = {
  status: AsyncActionStatus;
  data: TResult | undefined;
  error: unknown;
};

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult> | TResult,
  options: UseAsyncActionOptions<TResult> = {},
): AsyncActionState<TArgs, TResult> {
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  const [snapshot, setSnapshot] = useState<AsyncActionSnapshot<TResult>>({
    status: 'idle',
    data: undefined,
    error: undefined,
  });

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    setSnapshot({
      status: 'idle',
      data: undefined,
      error: undefined,
    });
  }, []);

  const run = useCallback(async (...args: TArgs) => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    if (mountedRef.current) {
      setSnapshot((current) => ({
        status: 'running',
        data: current.data,
        error: undefined,
      }));
    }

    try {
      const result = await action(...args);

      if (mountedRef.current && runIdRef.current === runId) {
        setSnapshot({
          status: 'success',
          data: result,
          error: undefined,
        });
      }

      await options.onSuccess?.(result);
      return result;
    } catch (error) {
      if (mountedRef.current && runIdRef.current === runId) {
        setSnapshot((current) => ({
          status: 'error',
          data: current.data,
          error,
        }));
      }

      await options.onError?.(error);
      throw error;
    }
  }, [action, options]);

  return {
    status: snapshot.status,
    pending: snapshot.status === 'running',
    data: snapshot.data,
    error: snapshot.error,
    run,
    reset,
  };
}
