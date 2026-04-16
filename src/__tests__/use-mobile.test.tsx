// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMobile } from "@/hooks/use-mobile";

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }),
    });
  }
});

function mockMatchMedia(matches: boolean) {
  const listeners: Array<() => void> = [];
  const mql = {
    matches,
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.push(cb)),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatch: () => listeners.forEach((cb) => cb()),
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(
    mql as unknown as MediaQueryList,
  );
  return mql;
}

describe("useMobile", () => {
  it("returns true when viewport matches mobile breakpoint", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMobile(768));
    expect(result.current).toBe(true);
  });

  it("returns false when viewport does not match", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMobile(768));
    expect(result.current).toBe(false);
  });

  it("uses default breakpoint 768px when not provided", () => {
    const spy = vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    } as unknown as MediaQueryList);
    renderHook(() => useMobile());
    expect(spy).toHaveBeenCalledWith("(max-width: 767px)");
  });

  it("subscribes to media query changes", () => {
    const mql = mockMatchMedia(false);
    renderHook(() => useMobile(768));
    expect(mql.addEventListener).toHaveBeenCalled();
  });

  it("updates state when media query changes", () => {
    const mql = mockMatchMedia(false);
    const { result } = renderHook(() => useMobile(768));
    expect(result.current).toBe(false);
    act(() => {
      mql.matches = true;
      mql.dispatch();
    });
    expect(result.current).toBe(true);
  });
});
