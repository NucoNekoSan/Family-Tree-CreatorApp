ALTER TABLE chart_nodes ADD COLUMN connection_direction TEXT CHECK(connection_direction IN('above','below','left','right'));
