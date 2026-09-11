// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NodeTextFields } from "./NodeTextFields";

describe("NodeTextFields keyboard boundaries", () => {
  afterEach(cleanup);
  it("keeps Enter inside the memo field without preventing a newline", () => {
    const parentKeyDown = vi.fn();
    const { container } = render(
      <div onKeyDown={parentKeyDown}>
        <NodeTextFields
          memo=""
          fontSize={16}
          relationshipFontSize={17}
          onMemoChange={vi.fn()}
          onFontSizeChange={vi.fn()}
          onRelationshipFontSizeChange={vi.fn()}
        />
      </div>,
    );
    const memo = screen.getByRole("textbox", { name: /メモ/ });
    expect(fireEvent.keyDown(memo, { key: "Enter" })).toBe(true);
    expect(parentKeyDown).not.toHaveBeenCalled();
    expect(container.querySelector("textarea")?.className).toContain("nopan");
  });

  it("keeps IME Enter inside the memo field without preventing composition", () => {
    const parentKeyDown = vi.fn();
    render(
      <div onKeyDown={parentKeyDown}>
        <NodeTextFields
          memo="入力済み"
          fontSize={16}
          relationshipFontSize={17}
          onMemoChange={vi.fn()}
          onFontSizeChange={vi.fn()}
          onRelationshipFontSizeChange={vi.fn()}
        />
      </div>,
    );
    const memo = screen.getByRole("textbox", { name: /メモ/ });
    expect(fireEvent.keyDown(memo, { key: "Enter", isComposing: true })).toBe(
      true,
    );
    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it("keeps Backspace and Delete inside the memo field", () => {
    const parentKeyDown = vi.fn();
    render(
      <div onKeyDown={parentKeyDown}>
        <NodeTextFields
          memo="削除対象"
          fontSize={16}
          relationshipFontSize={17}
          onMemoChange={vi.fn()}
          onFontSizeChange={vi.fn()}
          onRelationshipFontSizeChange={vi.fn()}
        />
      </div>,
    );
    const memo = screen.getByRole("textbox", { name: /メモ/ });
    fireEvent.keyDown(memo, { key: "Backspace" });
    fireEvent.keyDown(memo, { key: "Delete" });
    expect(parentKeyDown).not.toHaveBeenCalled();
  });
});
