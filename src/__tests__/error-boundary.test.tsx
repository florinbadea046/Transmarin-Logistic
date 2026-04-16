// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@/components/error-boundary";

function Bomb({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error("Boom!");
  return <div>safe content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error thrown", () => {
    render(
      <ErrorBoundary>
        <div>healthy content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("healthy content")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/A aparut o eroare/i)).toBeInTheDocument();
    expect(screen.getByText("Boom!")).toBeInTheDocument();
  });

  it("renders custom fallback if provided", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom">CUSTOM</div>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });

  it("'Incearca din nou' button resets the error state", async () => {
    const user = userEvent.setup();
    function FlipBomb({ trigger }: { trigger: { shouldThrow: boolean } }) {
      if (trigger.shouldThrow) throw new Error("Initial");
      return <div>recovered</div>;
    }
    const trigger = { shouldThrow: true };
    const { rerender } = render(
      <ErrorBoundary>
        <FlipBomb trigger={trigger} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Initial")).toBeInTheDocument();

    trigger.shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /Incearca din nou/i }));
    rerender(
      <ErrorBoundary>
        <FlipBomb trigger={trigger} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("recovered")).toBeInTheDocument();
  });

  it("logs the error via console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(spy).toHaveBeenCalled();
  });
});
