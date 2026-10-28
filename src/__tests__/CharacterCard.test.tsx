import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CharacterCard } from "@/components/casting/CharacterCard";
import type { CharacterAsset } from "@/lib/validations/project";

const mockCharacter: CharacterAsset = {
  assetId: "char-1",
  name: "Detective Vance",
  role: "Lead",
  appearancePrompt: "A seasoned detective in a dark trench coat.",
  imageUrl: "https://example.com/vance.png",
  pulidSeed: 42,
  status: "draft",
  generationHistory: [],
};

describe("CharacterCard Prompt Editing & Enrichment", () => {
  it("renders large textarea and Enrich Prompt button when editing prompt", async () => {
    render(
      <CharacterCard
        character={mockCharacter}
        onGenerate={jest.fn()}
        onApprove={jest.fn()}
      />
    );

    // Click on the prompt display to open editor
    const promptDisplay = screen.getByText("A seasoned detective in a dark trench coat.");
    fireEvent.click(promptDisplay);

    // Verify large textarea is rendered
    const textarea = screen.getByPlaceholderText(/Paste or write detailed appearance conditioning prompt/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.className).toContain("min-h-[160px]");
    expect(textarea.className).toContain("p-4");

    // Verify Enrich Prompt button is present directly below textarea
    const enrichBtn = screen.getByRole("button", { name: /Enrich Prompt/i });
    expect(enrichBtn).toBeInTheDocument();

    // Verify paste support
    fireEvent.change(textarea, {
      target: {
        value: "Pasted long external prompt with photorealistic 8k face geometry, detailed eyes, neutral studio background.",
      },
    });

    expect(textarea).toHaveValue(
      "Pasted long external prompt with photorealistic 8k face geometry, detailed eyes, neutral studio background."
    );
  });
});
