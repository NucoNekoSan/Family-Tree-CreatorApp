ALTER TABLE relationship_definitions ADD COLUMN diagram_role TEXT NOT NULL DEFAULT 'standard' CHECK(diagram_role IN('standard','sibling','divorce'));

ALTER TABLE chart_nodes ADD COLUMN placement_direction TEXT CHECK(placement_direction IN('above','below','left','right'));
ALTER TABLE chart_nodes ADD COLUMN parent_node_id_1 TEXT REFERENCES chart_nodes(id) ON DELETE SET NULL;
ALTER TABLE chart_nodes ADD COLUMN parent_node_id_2 TEXT REFERENCES chart_nodes(id) ON DELETE SET NULL;

UPDATE relationship_definitions
SET diagram_role='sibling'
WHERE name IN('兄','姉','弟','妹','兄弟','姉妹','兄弟姉妹','義兄','義姉','義弟','義妹','義兄弟','義姉妹','義兄弟姉妹');

INSERT INTO relationship_definitions(id,user_id,name,kind,direction,line_style,line_color,sort_order,active,diagram_role)
SELECT lower(hex(randomblob(16))),u.id,'離婚','partner','right','solid','#9b7440',
       COALESCE((SELECT MAX(r.sort_order)+1 FROM relationship_definitions r WHERE r.user_id=u.id),0),1,'divorce'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM relationship_definitions r
  WHERE r.user_id=u.id AND (r.diagram_role='divorce' OR r.name='離婚')
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_pair ON chart_nodes(chart_id,parent_node_id_1,parent_node_id_2);
