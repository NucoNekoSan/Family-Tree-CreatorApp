import { ShapeMark } from "../../components/ui";
import type { FamilyNodeData } from "../../familyGraph";
import { BASE_NODE_WIDTH } from "./nodeLayout";

export function FamilyNodeCard({
  data,
  selected = false,
}: {
  data: FamilyNodeData;
  selected?: boolean;
}) {
  return (
    <>
      <ShapeMark
        shape={data.shape}
        color={data.fillColor}
        textColor={data.textColor}
        label={data.genderName}
      />
      <div className={`family-node ${selected ? "selected" : ""}`}>
        <strong
          style={{
            fontSize: `${(data.relationshipFontSize / BASE_NODE_WIDTH) * 100}cqi`,
          }}
        >
          {data.relationshipName}
        </strong>
        <span className="gender-label">{data.genderName}</span>
        {data.memo && (
          <p
            className="nowheel nodrag"
            style={{
              fontSize: `${(data.fontSize / BASE_NODE_WIDTH) * 100}cqi`,
            }}
          >
            {data.memo}
          </p>
        )}
      </div>
    </>
  );
}
