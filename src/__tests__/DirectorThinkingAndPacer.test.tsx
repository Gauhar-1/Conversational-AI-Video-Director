import React from "react";
import { render, screen, act } from "@testing-library/react";
import { DirectorThinking } from "@/components/chat/DirectorThinking";
import { useTypewriterPacer } from "@/hooks/useTypewriterPacer";

function TestPacerComponent({ text, speedMs = 15 }: { text: string; speedMs?: number }) {
  const { displayedText, isPacing } = useTypewriterPacer(text, { speedMs, enabled: true });
  return (
    <div>
      <span data-testid="pacer-text">{displayedText}</span>
      <span data-testid="pacer-status">{isPacing ? "typing" : "idle"}</span>
    </div>
  );
}

describe("DirectorThinking and useTypewriterPacer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("DirectorThinking Component", () => {
    it("renders the pulsating status bar and default conceptualizing text", () => {
      render(<DirectorThinking />);

      expect(screen.getByTestId("director-thinking")).toBeInTheDocument();
      expect(
        screen.getByText("Director is conceptualizing the narrative...")
      ).toBeInTheDocument();
    });

    it("renders custom status text when provided", () => {
      render(<DirectorThinking statusText="Director is researching brand archives..." />);

      expect(
        screen.getByText("Director is researching brand archives...")
      ).toBeInTheDocument();
    });
  });

  describe("useTypewriterPacer Hook", () => {
    it("paces incoming streaming text character by character", () => {
      const fullText = "Cinematic storytelling.";
      render(<TestPacerComponent text={fullText} speedMs={15} />);

      // Initially starts at 0 characters
      expect(screen.getByTestId("pacer-text").textContent).toBe("");
      expect(screen.getByTestId("pacer-status").textContent).toBe("typing");

      // Advance timer by 30ms (2 ticks of 15ms)
      act(() => {
        jest.advanceTimersByTime(30);
      });

      const currentText = screen.getByTestId("pacer-text").textContent || "";
      expect(currentText.length).toBeGreaterThan(0);
      expect(currentText.length).toBeLessThanOrEqual(fullText.length);

      // Fast forward until typing completes
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId("pacer-text").textContent).toBe(fullText);
      expect(screen.getByTestId("pacer-status").textContent).toBe("idle");
    });
  });
});
