import type { ChangeEvent, KeyboardEvent } from "react";

type Props = {
  memo: string;
  fontSize: number;
  relationshipFontSize: number;
  onMemoChange(value: string): void;
  onMemoCommit(): void;
  onFontSizeChange(value: number): void;
  onRelationshipFontSizeChange(value: number): void;
};

export function NodeTextFields({
  memo,
  fontSize,
  relationshipFontSize,
  onMemoChange,
  onMemoCommit,
  onFontSizeChange,
  onRelationshipFontSizeChange,
}: Props) {
  const numberValue = (event: ChangeEvent<HTMLInputElement>) =>
    Number(event.target.value);
  const handleMemoKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!["Enter", "Backspace", "Delete"].includes(event.key)) return;
    event.stopPropagation();
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onMemoCommit();
  };
  const stopReactFlowKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (["Enter", "Backspace", "Delete"].includes(event.key))
      event.stopPropagation();
  };
  return (
    <>
      <label>
        メモ
        <textarea
          rows={7}
          maxLength={2000}
          name="memo"
          className="nowheel nodrag nopan"
          autoComplete="off"
          value={memo}
          onKeyDown={handleMemoKeyDown}
          onChange={(event) => onMemoChange(event.target.value)}
          placeholder={"自由に記入できます\n例：連絡事項、特徴、家族内での役割"}
        />
        <small>{memo.length} / 2000</small>
      </label>
      <label htmlFor="memo-font-size">
        メモのフォントサイズ{" "}
        <output htmlFor="memo-font-size">{fontSize}px</output>
        <input
          id="memo-font-size"
          name="memoFontSize"
          type="range"
          className="nowheel nodrag nopan"
          min={8}
          max={48}
          step={1}
          value={fontSize}
          onKeyDown={stopReactFlowKeyboard}
          onChange={(event) => onFontSizeChange(numberValue(event))}
        />
      </label>
      <label htmlFor="relationship-font-size">
        続柄のフォントサイズ{" "}
        <output htmlFor="relationship-font-size">
          {relationshipFontSize}px
        </output>
        <input
          id="relationship-font-size"
          name="relationshipFontSize"
          type="range"
          className="nowheel nodrag nopan"
          min={8}
          max={48}
          step={1}
          value={relationshipFontSize}
          onKeyDown={stopReactFlowKeyboard}
          onChange={(event) => onRelationshipFontSizeChange(numberValue(event))}
        />
      </label>
    </>
  );
}
