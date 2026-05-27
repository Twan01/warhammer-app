-- 035_army_list_unit_sort_order.sql — Per-unit display order for drag-and-drop reorder.
ALTER TABLE army_list_units ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
