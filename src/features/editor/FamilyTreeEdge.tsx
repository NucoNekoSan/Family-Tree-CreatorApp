import { BaseEdge, type EdgeProps } from "@xyflow/react";
import type { FamilyTreeEdgeData } from "../../familyGraph";

export function FamilyTreeEdge(props: EdgeProps) {
  const data = props.data as FamilyTreeEdgeData | undefined;
  if (!data) return null;
  if (data.singleParent) {
    return (
      <>
        <BaseEdge
          id={props.id}
          path={`M ${props.sourceX} ${props.sourceY} V ${data.branchY}`}
          style={data.sharedStyle}
        />
        {data.children.map((child) => (
          <BaseEdge
            key={child.id}
            id={`${props.id}:${child.id}`}
            path={`M ${props.sourceX} ${data.branchY} H ${child.x} V ${child.y}`}
            style={child.style}
          />
        ))}
      </>
    );
  }
  const unionX = (props.sourceX + props.targetX) / 2;
  const unionY = (props.sourceY + props.targetY) / 2;
  const sharedPath = `M ${props.sourceX} ${props.sourceY} H ${unionX} V ${unionY} M ${props.targetX} ${props.targetY} H ${unionX} V ${unionY} M ${unionX} ${unionY} V ${data.branchY}`;
  return (
    <>
      <BaseEdge id={props.id} path={sharedPath} style={data.sharedStyle} />
      {data.divorced && (
        <g className="divorce-mark" aria-label="離婚">
          <line
            x1={unionX - 8}
            y1={unionY + 8}
            x2={unionX - 1}
            y2={unionY - 8}
          />
          <line
            x1={unionX + 1}
            y1={unionY + 8}
            x2={unionX + 8}
            y2={unionY - 8}
          />
        </g>
      )}
      {data.children.map((child) => (
        <BaseEdge
          key={child.id}
          id={`${props.id}:${child.id}`}
          path={`M ${unionX} ${data.branchY} H ${child.x} V ${child.y}`}
          style={child.style}
        />
      ))}
    </>
  );
}
