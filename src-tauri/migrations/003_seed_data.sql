-- 003_seed_data.sql — Sample seed data for units, paints, recipes, and recipe_paints (idempotent via INSERT OR IGNORE)

-- Section: Sample Units (SEED-02)
INSERT OR IGNORE INTO units (id, faction_id, name, category, model_count, owned_count, points) VALUES
    (1, 1, 'Tau Fire Warriors',          'Battleline',  10, 10,  85),
    (2, 1, 'Crisis Battlesuits',         'Elite',        3,  3, 110),
    (3, 1, 'Commander in Battlesuit',    'HQ/Leader',    1,  1,  95),
    (4, 3, 'Necron Warriors',            'Battleline',  10, 10, 105),
    (5, 2, 'Intercessors',               'Battleline',   5,  5,  80);

-- Section: Sample Paints (SEED-03)
INSERT OR IGNORE INTO paints (id, brand, name, paint_type, color_family, hex_color, owned) VALUES
    (1, 'Citadel', 'Abaddon Black',     'Base',     'Black', '#0F0F0F', 1),
    (2, 'Citadel', 'White Scar',        'Layer',    'White', '#F2F2F2', 1),
    (3, 'Citadel', 'Nuln Oil',          'Shade',    'Black', '#15171A', 1),
    (4, 'Citadel', 'Leadbelcher',       'Base',     'Metal', '#7B7E83', 1),
    (5, 'Citadel', 'Macragge Blue',     'Base',     'Blue',  '#1B4FA8', 1),
    (6, 'Citadel', 'Retributor Armour', 'Base',     'Gold',  '#B58A2D', 1);

-- Section: Sample Recipes (SEED-04 part 1)
INSERT OR IGNORE INTO painting_recipes (id, name, faction_id, area, primer, basecoat, shade, layer) VALUES
    (1, 'Tau White Armor',         1, 'Armor', 'White Scar primer',  'White Scar',    'Nuln Oil thinned 50/50',                        'White Scar edge highlights'),
    (2, 'Ultramarines Blue Armor', 2, 'Armor', 'Black primer',       'Macragge Blue', 'Nuln Oil',                                      'Macragge Blue + 20% White Scar edge highlights'),
    (3, 'Necron Ancient Metal',    3, 'Body',  'Black primer',       'Leadbelcher',   'Nuln Oil',                                      'Leadbelcher + Retributor Armour drybrush');

-- Section: Sample Recipe Paints (SEED-04 part 2)
INSERT OR IGNORE INTO recipe_paints (id, recipe_id, paint_id, step_name, order_index) VALUES
    -- Tau White Armor (recipe_id=1)
    (1,  1, 2, 'basecoat', 0),
    (2,  1, 3, 'shade',    1),
    (3,  1, 2, 'layer',    2),
    -- Ultramarines Blue Armor (recipe_id=2)
    (4,  2, 1, 'primer',   0),
    (5,  2, 5, 'basecoat', 1),
    (6,  2, 3, 'shade',    2),
    (7,  2, 5, 'layer',    3),
    -- Necron Ancient Metal (recipe_id=3)
    (8,  3, 1, 'primer',   0),
    (9,  3, 4, 'basecoat', 1),
    (10, 3, 3, 'shade',    2),
    (11, 3, 6, 'layer',    3);
