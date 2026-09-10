ALTER TABLE chart_nodes ADD COLUMN relationship_font_size INTEGER NOT NULL DEFAULT 17 CHECK(relationship_font_size BETWEEN 8 AND 48);
