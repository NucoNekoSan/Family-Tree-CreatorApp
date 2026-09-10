import { ApiError } from "./api";
import type { Direction, LineStyle, RelationKind } from "./types";

export const kindLabels: Readonly<Record<RelationKind, string>> = {
  self: "基準／本人",
  parent: "親",
  child: "子",
  partner: "配偶者・パートナー",
  sibling: "兄弟姉妹",
  divorce: "離婚",
  other: "その他",
};
export const directionLabels: Readonly<Record<Direction, string>> = {
  above: "上",
  below: "下",
  left: "左",
  right: "右",
};
export const lineLabels: Readonly<Record<LineStyle, string>> = {
  solid: "実線",
  dashed: "破線",
  dotted: "点線",
};
const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});
export const formatDate = (value: string) =>
  dateFormatter.format(new Date(value));
export const getErrorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "通信に失敗しました。時間をおいて再度お試しください。";
