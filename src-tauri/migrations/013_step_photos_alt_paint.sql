-- 013_step_photos_alt_paint.sql — Phase 40: Step photos + substitute paint linking
ALTER TABLE recipe_steps ADD COLUMN step_photo_path TEXT;
ALTER TABLE recipe_steps ADD COLUMN alt_paint_id INTEGER REFERENCES paints(id);
