import React from "react";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { ProjectGridSkeleton } from "@/components/dashboard/ProjectGridSkeleton";
import { CanvasSkeleton } from "@/components/storyboard/CanvasSkeleton";
import { useDebounce, useDebouncedCallback } from "@/lib/hooks/useDebounce";

describe("Performance & Rendering Optimizations", () => {
  describe("1. ProjectGridSkeleton (Hydration & Zero CLS)", () => {
    it("renders exactly 8 skeleton cards with pulsing animations matching ProjectCard grid", () => {
      render(<ProjectGridSkeleton />);

      const grid = screen.getByTestId("project-grid-skeleton");
      expect(grid).toBeInTheDocument();
      expect(grid.className).toContain("grid-cols-1");
      expect(grid.className).toContain("md:grid-cols-3");
      expect(grid.className).toContain("xl:grid-cols-4");
      expect(grid.className).toContain("gap-4");

      // Verify all 8 placeholder cards exist
      expect(grid.children.length).toBe(8);

      // Verify each card has matching min-height and border
      for (let i = 0; i < 8; i++) {
        const card = grid.children[i];
        expect(card.className).toContain("min-h-[190px]");
        expect(card.className).toContain("p-5");
        expect(card.className).toContain("bg-zinc-900");
        expect(card.className).toContain("border");
      }
    });
  });

  describe("2. CanvasSkeleton (Dynamic Lazy-Loading Fallback)", () => {
    it("renders studio canvas skeleton with dot grid, floating toolbar, and node sequence", () => {
      render(<CanvasSkeleton />);

      const canvas = screen.getByTestId("canvas-skeleton");
      expect(canvas).toBeInTheDocument();
      expect(canvas.className).toContain("bg-zinc-950");

      // Verify timeline node sequence placeholders are rendered
      const timelineCards = canvas.querySelectorAll(".w-72.min-h-\\[380px\\]");
      expect(timelineCards.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("3. useDebounce & useDebouncedCallback (1000ms Auto-Save Guard)", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("debounces rapid value changes until 1000ms of inactivity", () => {
      const { result, rerender } = renderHook(
        ({ val }) => useDebounce(val, 1000),
        { initialProps: { val: "initial" } }
      );

      expect(result.current).toBe("initial");

      // Rapid keystroke 1
      rerender({ val: "typing 1" });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe("initial"); // Still initial

      // Rapid keystroke 2
      rerender({ val: "typing 2" });
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current).toBe("initial"); // Still initial

      // User pauses typing for 1000ms
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(result.current).toBe("typing 2"); // Now updated
    });

    it("fires debounced callback only once after 1000ms silence", () => {
      const mockSave = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(mockSave, 1000));

      // Trigger 5 rapid calls
      act(() => {
        result.current("first");
        result.current("second");
        result.current("third");
      });

      expect(mockSave).not.toHaveBeenCalled();

      // Advance by 999ms
      act(() => {
        jest.advanceTimersByTime(999);
      });
      expect(mockSave).not.toHaveBeenCalled();

      // Complete 1000ms pause
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith("third");
    });
  });
});

