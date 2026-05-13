use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};
use std::collections::HashMap;

fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "core_schema",
            sql: include_str!("../migrations/001_core_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_factions",
            sql: include_str!("../migrations/002_seed_factions.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "seed_data",
            sql: include_str!("../migrations/003_seed_data.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "unit_playbook_stats",
            sql: include_str!("../migrations/004_unit_playbook_stats.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "hobby_journal",
            sql: include_str!("../migrations/005_hobby_journal.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "spend_pence",
            sql: include_str!("../migrations/006_spend_pence.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "datasheet_link",
            sql: include_str!("../migrations/007_datasheet_link.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "enrichment",
            sql: include_str!("../migrations/008_enrichment.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "wishlist",
            sql: include_str!("../migrations/009_wishlist.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "hobby_goals",
            sql: include_str!("../migrations/010_hobby_goals.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "point_tiers_loadouts",
            sql: include_str!("../migrations/011_point_tiers_loadouts.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "recipe_steps",
            sql: include_str!("../migrations/012_recipe_steps.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "step_photos_alt_paint",
            sql: include_str!("../migrations/013_step_photos_alt_paint.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "session_recipe_link",
            sql: include_str!("../migrations/014_session_recipe_link.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "sync_errors",
            sql: include_str!("../migrations/015_sync_errors.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "rules_snapshot",
            sql: include_str!("../migrations/016_rules_snapshot.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "unit_overrides",
            sql: include_str!("../migrations/017_unit_overrides.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "recipe_sections",
            sql: include_str!("../migrations/018_recipe_sections.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "rules_favorites_notes",
            sql: include_str!("../migrations/019_rules_favorites_notes.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "workflow_metadata",
            sql: include_str!("../migrations/020_workflow_metadata.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "applied_recipe_assignments",
            sql: include_str!("../migrations/021_applied_recipe_assignments.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "paintless_steps",
            sql: include_str!("../migrations/022_paintless_steps.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "session_section_fk",
            sql: include_str!("../migrations/023_session_section_fk.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 24,
            description: "points_import_history",
            sql: include_str!("../migrations/024_points_import_history.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 25,
            description: "tactical_role",
            sql: include_str!("../migrations/025_tactical_role.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

fn get_rules_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "rules_schema",
            sql: include_str!("../migrations/rules_001_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "wargear_abilities",
            sql: include_str!("../migrations/rules_002_wargear_abilities.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "sync_meta_counts",
            sql: include_str!("../migrations/rules_003_sync_meta_counts.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "datasheet_points",
            sql: include_str!("../migrations/rules_004_datasheet_points.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

// ── Sync helpers ─────────────────────────────────────────────────────────────

type JsRow = HashMap<String, serde_json::Value>;

fn str_val(row: &JsRow, key: &str) -> Option<String> {
    row.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn i64_val(row: &JsRow, key: &str) -> Option<i64> {
    row.get(key).and_then(|v| {
        if let Some(n) = v.as_i64() { return Some(n); }
        v.as_str()?.parse().ok()
    })
}

#[derive(serde::Deserialize)]
pub struct BulkSyncPayload {
    factions: Vec<JsRow>,
    sources: Vec<JsRow>,
    datasheets: Vec<JsRow>,
    models: Vec<JsRow>,
    abilities: Vec<JsRow>,
    keywords: Vec<JsRow>,
    // Extension: wargear, shared abilities, stratagems, detachments
    wargear: Vec<JsRow>,
    shared_abilities: Vec<JsRow>,
    stratagems: Vec<JsRow>,
    detachments: Vec<JsRow>,
    detachment_abilities: Vec<JsRow>,
    #[serde(default)]
    points: Vec<JsRow>,
    last_sync_at: String,
    wahapedia_version: String,
}

#[derive(serde::Serialize)]
pub struct SyncResult {
    pub factions: u64,
    pub sources: u64,
    pub datasheets: u64,
    pub models: u64,
    pub abilities: u64,
    pub keywords: u64,
    pub wargear: u64,
    pub shared_abilities: u64,
    pub stratagems: u64,
    pub detachments: u64,
    pub detachment_abilities: u64,
    pub points: u64,
}

/// Bulk-insert all Wahapedia CSV data into rules.db inside a single native
/// SQLite transaction. Uses a direct sqlx connection (not the plugin pool)
/// so all statements run on one connection and the transaction is real.
#[tauri::command]
async fn bulk_sync_rules(
    app: tauri::AppHandle,
    payload: BulkSyncPayload,
) -> Result<SyncResult, String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Connection};
    use std::str::FromStr;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_url = format!("sqlite:{}", app_data_dir.join("rules.db").display());

    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("opts: {e}"))?
        .create_if_missing(false)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(30));

    // Single connection (not a pool) — all statements in the same transaction.
    let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;

    // Disable FK checks so we can DELETE in any order
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&mut conn)
        .await
        .map_err(|e| format!("pragma fk off: {e}"))?;

    let mut tx = conn.begin().await.map_err(|e| format!("begin: {e}"))?;

    let mut counts = SyncResult {
        factions: 0, sources: 0, datasheets: 0, models: 0,
        abilities: 0, keywords: 0, wargear: 0, shared_abilities: 0,
        stratagems: 0, detachments: 0, detachment_abilities: 0, points: 0,
    };

    // Delete all tables (FK checks OFF so order doesn't matter)
    for table in [
        "rw_datasheet_keywords",
        "rw_datasheet_abilities",
        "rw_datasheet_models",
        "rw_datasheets_wargear",
        "rw_datasheets",
        "rw_sources",
        "rw_factions",
        "rw_abilities",
        "rw_stratagems",
        "rw_detachment_abilities",
        "rw_detachments",
        "rw_datasheet_points",
    ] {
        sqlx::query(&format!("DELETE FROM {table}"))
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("delete {table}: {e}"))?;
    }

    for row in &payload.factions {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query("INSERT INTO rw_factions (id, name) VALUES (?, ?)")
            .bind(&id)
            .bind(str_val(row, "name").unwrap_or_default())
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("insert faction {id}: {e}"))?;
        counts.factions += res.rows_affected();
    }

    for row in &payload.sources {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO rw_sources (id, name, type, edition, version, errata_date) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "type"))
        .bind(i64_val(row, "edition"))
        .bind(str_val(row, "version"))
        .bind(str_val(row, "errata_date"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert source {id}: {e}"))?;
        counts.sources += res.rows_affected();
    }

    for row in &payload.datasheets {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO rw_datasheets (id, name, faction_id, source_id, role, damaged_w, damaged_description) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "faction_id"))
        .bind(str_val(row, "source_id"))
        .bind(str_val(row, "role"))
        .bind(str_val(row, "damaged_w"))
        .bind(str_val(row, "damaged_description"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert datasheet {id}: {e}"))?;
        counts.datasheets += res.rows_affected();
    }

    for row in &payload.models {
        let ds_id = str_val(row, "datasheet_id").unwrap_or_default();
        if ds_id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT OR IGNORE INTO rw_datasheet_models (datasheet_id, line, name, M, T, Sv, inv_sv, W, Ld, OC) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&ds_id)
        .bind(i64_val(row, "line").unwrap_or(1))
        .bind(str_val(row, "name"))
        .bind(str_val(row, "M"))
        .bind(i64_val(row, "T"))
        .bind(str_val(row, "Sv"))
        .bind(str_val(row, "inv_sv"))
        .bind(i64_val(row, "W"))
        .bind(str_val(row, "Ld"))
        .bind(i64_val(row, "OC"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert model {ds_id}: {e}"))?;
        counts.models += res.rows_affected();
    }

    for row in &payload.abilities {
        let ds_id = str_val(row, "datasheet_id").unwrap_or_default();
        if ds_id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT OR IGNORE INTO rw_datasheet_abilities (datasheet_id, line, ability_id, name, description, type, parameter) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&ds_id)
        .bind(i64_val(row, "line").unwrap_or(1))
        .bind(str_val(row, "ability_id"))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "description"))
        .bind(str_val(row, "type"))
        .bind(str_val(row, "parameter"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert ability {ds_id}: {e}"))?;
        counts.abilities += res.rows_affected();
    }

    for row in &payload.keywords {
        let ds_id = str_val(row, "datasheet_id").unwrap_or_default();
        let kw = str_val(row, "keyword").unwrap_or_default();
        if ds_id.is_empty() || kw.is_empty() { continue; }
        let is_faction: i64 = if str_val(row, "is_faction_keyword").as_deref() == Some("true") { 1 } else { 0 };
        let res = sqlx::query(
            "INSERT OR IGNORE INTO rw_datasheet_keywords (datasheet_id, keyword, is_faction_keyword) VALUES (?, ?, ?)",
        )
        .bind(&ds_id)
        .bind(&kw)
        .bind(is_faction)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert keyword {ds_id}/{kw}: {e}"))?;
        counts.keywords += res.rows_affected();
    }

    for row in &payload.wargear {
        let ds_id = str_val(row, "datasheet_id").unwrap_or_default();
        if ds_id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT OR IGNORE INTO rw_datasheets_wargear (datasheet_id, line, line_in_wargear, dice, name, description, range, type, A, BS_WS, S, AP, D) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&ds_id)
        .bind(i64_val(row, "line").unwrap_or(1))
        .bind(i64_val(row, "line_in_wargear").unwrap_or(1))
        .bind(str_val(row, "dice"))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "description"))
        .bind(str_val(row, "range"))
        .bind(str_val(row, "type"))
        .bind(str_val(row, "A"))
        .bind(str_val(row, "BS_WS"))
        .bind(str_val(row, "S"))
        .bind(str_val(row, "AP"))
        .bind(str_val(row, "D"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert wargear {ds_id}: {e}"))?;
        counts.wargear += res.rows_affected();
    }

    for row in &payload.shared_abilities {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT OR IGNORE INTO rw_abilities (id, name, legend, faction_id, description) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "legend"))
        .bind(str_val(row, "faction_id"))
        .bind(str_val(row, "description"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert ability {id}: {e}"))?;
        counts.shared_abilities += res.rows_affected();
    }

    for row in &payload.stratagems {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT OR IGNORE INTO rw_stratagems (id, faction_id, name, type, cp_cost, legend, turn, phase, detachment, detachment_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "faction_id"))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "type"))
        .bind(str_val(row, "cp_cost"))
        .bind(str_val(row, "legend"))
        .bind(str_val(row, "turn"))
        .bind(str_val(row, "phase"))
        .bind(str_val(row, "detachment"))
        .bind(str_val(row, "detachment_id"))
        .bind(str_val(row, "description"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert stratagem {id}: {e}"))?;
        counts.stratagems += res.rows_affected();
    }

    for row in &payload.detachments {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT OR IGNORE INTO rw_detachments (id, faction_id, name, legend, type) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "faction_id"))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "legend"))
        .bind(str_val(row, "type"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert detachment {id}: {e}"))?;
        counts.detachments += res.rows_affected();
    }

    for row in &payload.detachment_abilities {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT OR IGNORE INTO rw_detachment_abilities (id, faction_id, name, legend, description, detachment, detachment_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "faction_id"))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "legend"))
        .bind(str_val(row, "description"))
        .bind(str_val(row, "detachment"))
        .bind(str_val(row, "detachment_id"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert det_ability {id}: {e}"))?;
        counts.detachment_abilities += res.rows_affected();
    }

    for row in &payload.points {
        let ds_name = str_val(row, "datasheet_name").unwrap_or_default();
        if ds_name.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO rw_datasheet_points (datasheet_name, faction_id, points) VALUES (?, ?, ?)",
        )
        .bind(&ds_name)
        .bind(str_val(row, "faction_id"))
        .bind(i64_val(row, "points").unwrap_or(0))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert points {ds_name}: {e}"))?;
        counts.points += res.rows_affected();
    }

    // Write sync meta inside the same transaction — includes all 11 per-table
    // row counts populated during the insert loops above.
    sqlx::query(
        "INSERT OR REPLACE INTO rw_sync_meta (id, last_sync_at, wahapedia_version,
         factions_count, sources_count, datasheets_count, models_count, abilities_count,
         keywords_count, wargear_count, shared_abilities_count, stratagems_count,
         detachments_count, detachment_abilities_count, points_count) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&payload.last_sync_at)
    .bind(&payload.wahapedia_version)
    .bind(counts.factions as i64)
    .bind(counts.sources as i64)
    .bind(counts.datasheets as i64)
    .bind(counts.models as i64)
    .bind(counts.abilities as i64)
    .bind(counts.keywords as i64)
    .bind(counts.wargear as i64)
    .bind(counts.shared_abilities as i64)
    .bind(counts.stratagems as i64)
    .bind(counts.detachments as i64)
    .bind(counts.detachment_abilities as i64)
    .bind(counts.points as i64)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert sync_meta: {e}"))?;

    tx.commit().await.map_err(|e| format!("commit: {e}"))?;
    Ok(counts)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app_data_dir");
            std::fs::create_dir_all(&app_data_dir).expect("failed to create app_data_dir");
            println!("[hobbyforge] app_data_dir = {}", app_data_dir.display());
            Ok(())
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:hobbyforge.db", get_migrations())
                .add_migrations("sqlite:rules.db", get_rules_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![bulk_sync_rules])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
