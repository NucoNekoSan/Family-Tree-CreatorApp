import type { ChangeEvent } from "react";

type Props = {
  memo: string;
  fontSize: number;
  relationshipFontSize: number;
  onMemoChange(value: string): void;
  onFontSizeChange(value: number): void;
  onRelationshipFontSizeChange(value: number): void;
};

export function NodeTextFields({
  memo,
  fontSize,
  relationshipFontSize,
  onMemoChange,
  onFontSizeChange,
  onRelationshipFontSizeChange,
}: Props) {
  const numberValue = (event: ChangeEvent<HTMLInputElement>) =>
    Number(event.target.value);
  return (
    <>
      <label>
        メモ
        <textarea
          rows={7}
          maxLength={2000}
          value={memo}
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
          min={8}
          max={48}
          step={1}
          value={fontSize}
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
          min={8}
          max={48}
          step={1}
          value={relationshipFontSize}
          onChange={(event) => onRelationshipFontSizeChange(numberValue(event))}
        />
      </label>
    </>
  );
}
