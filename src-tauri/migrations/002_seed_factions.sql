-- 002_seed_factions.sql — SEED-01 four factions with stable IDs (idempotent via INSERT OR IGNORE)
INSERT OR IGNORE INTO factions (id, name, game_system, description, color_theme) VALUES
    (1, 'Tau Empire',    'Warhammer 40K', 'High-tech alien empire with ranged firepower and battlesuits.', '#4A9CD4'),
    (2, 'Ultramarines',  'Warhammer 40K', 'First-Founding Space Marine chapter — exemplary Codex Astartes adherents.', '#1B4FA8'),
    (3, 'Necrons',       'Warhammer 40K', 'Ancient mechanical warriors awakening from millions of years of stasis.',   '#3DAA5C'),
    (4, 'Tyranids',      'Warhammer 40K', 'Extragalactic hive fleet that consumes all biomass in its path.',           '#8B2FC9');
