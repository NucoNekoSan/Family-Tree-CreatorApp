import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export function FamilyEdge(props: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath(props);
  const divorce = props.data?.relationKind === "divorce";
  return (
    <>
      <BaseEdge {...props} path={path} />
      {divorce && (
        <g className="divorce-mark" aria-label="離婚">
          <line
            x1={labelX - 8}
            y1={labelY + 9}
            x2={labelX - 1}
            y2={labelY - 9}
          />
          <line
            x1={labelX + 1}
            y1={labelY + 9}
            x2={labelX + 8}
            y2={labelY - 9}
          />
        </g>
      )}
    </>
  );
}
