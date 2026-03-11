import { renderHook } from '@testing-library/react';
import { usePersistFn } from './usePersistFn';
import { describe, it, expect, vi } from 'vitest';

describe('usePersistFn', () => {
  it('should return a function with a stable reference across re-renders', () => {
    // Initial render
    const initialFn = () => 'initial';
    const { result, rerender } = renderHook(({ fn }) => usePersistFn(fn), {
      initialProps: { fn: initialFn },
    });

    const firstReturnedFn = result.current;

    // Rerender with a new function reference
    const newFn = () => 'new';
    rerender({ fn: newFn });

    const secondReturnedFn = result.current;

    // The returned function reference should be exactly the same
    expect(firstReturnedFn).toBe(secondReturnedFn);
  });

  it('should call the latest version of the provided function', () => {
    let latestValue = 'initial';
    const fn = vi.fn(() => latestValue);

    const { result, rerender } = renderHook(({ cb }) => usePersistFn(cb), {
      initialProps: { cb: fn },
    });

    // Call it initially
    result.current();
    expect(fn).toHaveBeenCalledTimes(1);

    // Update the state that the function closes over (simulated by updating `latestValue` and passing a new fn)
    latestValue = 'updated';
    const newFn = vi.fn(() => latestValue);

    rerender({ cb: newFn });

    // Call the persisted function again
    const res = result.current();

    // It should have called the NEW function, not the old one
    expect(newFn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1); // Old one wasn't called again
    expect(res).toBe('updated');
  });

  it('should forward arguments correctly to the underlying function', () => {
    const fn = vi.fn((a: string, b: number) => `${a}-${b}`);
    const { result } = renderHook(() => usePersistFn(fn));

    result.current('hello', 42);
    expect(fn).toHaveBeenCalledWith('hello', 42);
  });

  it('should preserve "this" context when called', () => {
    const fn = vi.fn(function(this: { value: string }) {
      return this.value;
    });
    const { result } = renderHook(() => usePersistFn(fn));

    const context = { value: 'context-value' };

    // Call the returned function with a specific 'this' context using call or apply
    const res = result.current.call(context);

    expect(res).toBe('context-value');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
