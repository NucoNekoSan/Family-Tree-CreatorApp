import { createContext } from "react";
import type { ResizeParams } from "@xyflow/react";

export const ResizeContext = createContext<{
  canResize(nodeId: string, params: ResizeParams): boolean;
  saveResize(nodeId: string, params: ResizeParams): void;
} | null>(null);
