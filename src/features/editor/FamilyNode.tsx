import { useContext } from "react";
import {
  Handle,
  NodeResizer,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { Direction } from "../../types";
import type { FamilyNodeData } from "../../familyGraph";
import {
  BASE_NODE_HEIGHT,
  BASE_NODE_WIDTH,
  MAX_NODE_HEIGHT,
  MAX_NODE_SCALE,
  MIN_NODE_SCALE,
} from "./nodeLayout";
import { FamilyNodeCard } from "./FamilyNodeCard";

import { ResizeContext } from "./resizeContext";
export { ResizeContext } from "./resizeContext";

const handlePositions: Record<Direction, Position> = {
  above: Position.Top,
  below: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

export function FamilyNode({
  id,
  data,
  selected,
}: NodeProps<Node<FamilyNodeData>>) {
  const resizing = useContext(ResizeContext);
  return (
    <div className="family-node-shell">
      <NodeResizer
        isVisible={selected}
        handleClassName="family-node-resize-handle"
        minWidth={BASE_NODE_WIDTH * MIN_NODE_SCALE}
        minHeight={BASE_NODE_HEIGHT * MIN_NODE_SCALE}
        maxWidth={BASE_NODE_WIDTH * MAX_NODE_SCALE}
        maxHeight={MAX_NODE_HEIGHT}
        keepAspectRatio
        shouldResize={(_, params) => resizing?.canResize(id, params) ?? true}
        onResizeEnd={(_, params) => resizing?.saveResize(id, params)}
      />
      {Object.entries(handlePositions).flatMap(([direction, position]) => [
        <Handle
          key={`target-${direction}`}
          type="target"
          id={`target-${direction}`}
          position={position}
        />,
        <Handle
          key={`source-${direction}`}
          type="source"
          id={`source-${direction}`}
          position={position}
        />,
      ])}
      <FamilyNodeCard data={data} selected={selected} />
    </div>
  );
}
