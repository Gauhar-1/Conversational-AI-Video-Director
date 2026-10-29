import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal";

describe("CreateProjectModal Component", () => {
  it("does not render when isOpen is false", () => {
    render(
      <CreateProjectModal
        isOpen={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        isCreating={false}
      />
    );

    expect(screen.queryByText(/Initialize New Production/i)).not.toBeInTheDocument();
  });

  it("renders modal dialog, title input, and aspect ratio controls when isOpen is true", () => {
    render(
      <CreateProjectModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        isCreating={false}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Initialize New Production/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Title/i)).toBeInTheDocument();
    expect(screen.getByText(/9:16 Vertical/i)).toBeInTheDocument();
    expect(screen.getByText(/16:9 Cinema/i)).toBeInTheDocument();
  });

  it("shows error and prevents submission when title is empty or whitespace", () => {
    const handleSubmit = jest.fn();
    render(
      <CreateProjectModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmit={handleSubmit}
        isCreating={false}
      />
    );

    const input = screen.getByLabelText(/Project Title/i);
    fireEvent.change(input, { target: { value: "   " } });

    const submitBtn = screen.getByRole("button", { name: /Create & Enter Writer's Room/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with custom title and default 9:16 aspect ratio", () => {
    const handleSubmit = jest.fn();
    render(
      <CreateProjectModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmit={handleSubmit}
        isCreating={false}
      />
    );

    const input = screen.getByLabelText(/Project Title/i);
    fireEvent.change(input, { target: { value: "The Midnight Train" } });

    const submitBtn = screen.getByRole("button", { name: /Create & Enter Writer's Room/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith("The Midnight Train", "9:16");
  });

  it("allows selecting 16:9 Cinema aspect ratio and submits correctly", () => {
    const handleSubmit = jest.fn();
    render(
      <CreateProjectModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmit={handleSubmit}
        isCreating={false}
      />
    );

    const input = screen.getByLabelText(/Project Title/i);
    fireEvent.change(input, { target: { value: "The Horizon" } });

    const widescreenBtn = screen.getByText(/16:9 Cinema/i).closest("button")!;
    fireEvent.click(widescreenBtn);

    const submitBtn = screen.getByRole("button", { name: /Create & Enter Writer's Room/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith("The Horizon", "16:9");
  });

  it("calls onClose when Cancel button or Escape key is pressed", () => {
    const handleClose = jest.fn();
    render(
      <CreateProjectModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={jest.fn()}
        isCreating={false}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("disables inputs and buttons and shows loading spinner when isCreating is true", () => {
    render(
      <CreateProjectModal
        isOpen={true}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        isCreating={true}
      />
    );

    const input = screen.getByLabelText(/Project Title/i);
    expect(input).toBeDisabled();

    const submitBtn = screen.getByRole("button", { name: /Initializing.../i });
    expect(submitBtn).toBeDisabled();
  });
});
