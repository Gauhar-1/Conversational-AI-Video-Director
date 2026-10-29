import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionCard } from "@/components/chat/OptionCard";
import { ChatMessage, ParsedMessageItem } from "@/components/chat/ChatMessage";

const mockUseWritersRoom = jest.fn();
jest.mock("@/hooks/useWritersRoom", () => ({
  useWritersRoom: (...args: any[]) => mockUseWritersRoom(...args),
}));

import { WritersRoom } from "@/components/chat/WritersRoom";

describe("WritersRoom Components: OptionCard & ChatMessage", () => {
  describe("OptionCard", () => {
    const mockOption = {
      id: "A",
      rawTag: "[OPTION A]",
      title: "The Height Chart",
      description: "A father marks his daughter's growth on the wooden doorframe.",
      rawContent: "[OPTION A] The Height Chart: A father marks...",
    };

    it("renders option letter badge, title, and description cleanly", () => {
      render(
        <OptionCard
          option={mockOption}
          isLocked={false}
          onSelect={jest.fn()}
        />
      );

      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("The Height Chart")).toBeInTheDocument();
      expect(screen.getByText("A father marks his daughter's growth on the wooden doorframe.")).toBeInTheDocument();
    });

    it("disables and dims button when isLocked is true (Action Locking)", () => {
      const handleSelect = jest.fn();
      render(
        <OptionCard
          option={mockOption}
          isLocked={true}
          onSelect={handleSelect}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button.className).toContain("opacity-50");
      expect(button.className).toContain("cursor-not-allowed");

      fireEvent.click(button);
      expect(handleSelect).not.toHaveBeenCalled();
    });

    it("triggers onSelect callback when unlocked and clicked", () => {
      const handleSelect = jest.fn();
      render(
        <OptionCard
          option={mockOption}
          isLocked={false}
          onSelect={handleSelect}
        />
      );

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
      fireEvent.click(button);

      expect(handleSelect).toHaveBeenCalledWith(mockOption);
    });

    it("renders recalibrate visual indicators for Option D", () => {
      const recalibrateOption = {
        id: "D",
        rawTag: "[OPTION D]",
        title: "None of these, recalibrate",
        description: "Let's explore an alternative human truth.",
        rawContent: "[OPTION D] None of these, recalibrate...",
      };

      render(
        <OptionCard
          option={recalibrateOption}
          isLocked={false}
          onSelect={jest.fn()}
        />
      );

      expect(screen.getByText("None of these, recalibrate")).toBeInTheDocument();
      expect(screen.getByText(/Rethink/i)).toBeInTheDocument();
    });
  });

  describe("ChatMessage", () => {
    it("renders AI narrative message flush left with markdown styling", () => {
      const message: ParsedMessageItem = {
        id: "msg-1",
        role: "assistant",
        rawContent: "Every brand has a story.",
        narrativeText: "Every brand has a story.",
        options: [],
        hasOptions: false,
        hasJsonPayload: false,
      };

      render(
        <ChatMessage
          message={message}
          isLatestAssistantMessage={true}
          areOptionsLocked={false}
          onSelectOption={jest.fn()}
        />
      );

      expect(screen.getByText("Every brand has a story.")).toBeInTheDocument();
      // Ensure it is styled with prose-invert without a bubble border
      const container = screen.getByText("Every brand has a story.").closest(".prose");
      expect(container).toBeInTheDocument();
    });

    it("renders user messages aligned right in zinc-900 card", () => {
      const message: ParsedMessageItem = {
        id: "msg-user",
        role: "user",
        rawContent: "Our company makes sustainable leather bags.",
        narrativeText: "Our company makes sustainable leather bags.",
        options: [],
        hasOptions: false,
        hasJsonPayload: false,
      };

      render(
        <ChatMessage
          message={message}
          isLatestAssistantMessage={false}
          areOptionsLocked={false}
          onSelectOption={jest.fn()}
        />
      );

      const text = screen.getByText("Our company makes sustainable leather bags.");
      expect(text).toBeInTheDocument();
      const userCard = text.closest(".bg-zinc-900\\/90");
      expect(userCard).toBeInTheDocument();
    });

    it("renders OptionCard stack when assistant message has options", () => {
      const message: ParsedMessageItem = {
        id: "msg-options",
        role: "assistant",
        rawContent: `Here are the concepts:
[OPTION A] The Height Chart: A story about a father.
[OPTION D] None of these, recalibrate`,
        narrativeText: "Here are the concepts:",
        options: [
          {
            id: "A",
            rawTag: "[OPTION A]",
            title: "The Height Chart",
            description: "A story about a father.",
            rawContent: "[OPTION A] The Height Chart: A story about a father.",
          },
          {
            id: "D",
            rawTag: "[OPTION D]",
            title: "None of these, recalibrate",
            description: "Explore alternative.",
            rawContent: "[OPTION D] None of these, recalibrate",
          },
        ],
        hasOptions: true,
        hasJsonPayload: false,
      };

      render(
        <ChatMessage
          message={message}
          isLatestAssistantMessage={true}
          areOptionsLocked={false}
          onSelectOption={jest.fn()}
        />
      );

      expect(screen.getByText("Creative Directions")).toBeInTheDocument();
      expect(screen.getByText("The Height Chart")).toBeInTheDocument();
      expect(screen.getByText("None of these, recalibrate")).toBeInTheDocument();
    });
  });

  describe("WritersRoom Component Input Ergonomics", () => {
    beforeEach(() => {
      window.HTMLElement.prototype.scrollIntoView = jest.fn();
      mockUseWritersRoom.mockReturnValue({
        messages: [],
        parsedMessages: [],
        input: "",
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn((e) => e?.preventDefault?.()),
        isLoading: false,
        isStreamFinished: true,
        isCompiling: false,
        handleSelectOption: jest.fn(),
        areOptionsLocked: false,
        error: null,
      });
    });

    it("renders the keyboard hints and auto-expanding textarea", () => {
      render(<WritersRoom projectId="test-p1" />);

      const textarea = screen.getByTestId("chat-input");
      expect(textarea).toBeInTheDocument();
      expect(screen.getByText("Shift + Enter")).toBeInTheDocument();
      expect(screen.getByText("Enter")).toBeInTheDocument();
    });

    it("displays character counter when paragraph exceeds 80 characters", () => {
      const longParagraph =
        "We are launching an artisanal heritage leather footwear brand celebrating craft and resilience across generations.";
      mockUseWritersRoom.mockReturnValue({
        messages: [],
        parsedMessages: [],
        input: longParagraph,
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
        isStreamFinished: true,
        isCompiling: false,
        handleSelectOption: jest.fn(),
        areOptionsLocked: false,
        error: null,
      });

      render(<WritersRoom projectId="test-p1" />);
      expect(screen.getByText(`${longParagraph.length} chars`)).toBeInTheDocument();
    });

    it("renders cinematic compiling screen when isCompiling is true", () => {
      mockUseWritersRoom.mockReturnValue({
        messages: [],
        parsedMessages: [],
        input: "",
        handleInputChange: jest.fn(),
        handleSubmit: jest.fn(),
        isLoading: false,
        isStreamFinished: true,
        isCompiling: true,
        handleSelectOption: jest.fn(),
        areOptionsLocked: false,
        error: null,
      });

      render(<WritersRoom projectId="test-p1" />);
      expect(screen.getByText(/Locking Vision & Compiling Pipeline\.\.\./i)).toBeInTheDocument();
    });
  });
});


