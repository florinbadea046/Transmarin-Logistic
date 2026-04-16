// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useDialogState from "@/hooks/use-dialog-state";

describe("useDialogState", () => {
  it("defaults to closed", () => {
    const { result } = renderHook(() => useDialogState());
    expect(result.current[0]).toBe(false);
  });

  it("respects defaultOpen=true", () => {
    const { result } = renderHook(() => useDialogState(true));
    expect(result.current[0]).toBe(true);
  });

  it("setOpen updates state", () => {
    const { result } = renderHook(() => useDialogState());
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });

  it("returns tuple of [boolean, setter]", () => {
    const { result } = renderHook(() => useDialogState());
    expect(typeof result.current[0]).toBe("boolean");
    expect(typeof result.current[1]).toBe("function");
  });
});
