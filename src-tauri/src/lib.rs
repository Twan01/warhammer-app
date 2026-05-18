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
        Migration {
            version: 26,
            description: "unit_rules_mapping",
            sql: include_str!("../migrations/026_unit_rules_mapping.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 27,
            description: "battle_log_after_action",
            sql: include_str!("../migrations/027_battle_log_after_action.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 28,
            description: "step_progress_identity",
            sql: include_str!("../migrations/028_step_progress_identity.sql"),
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

/// Create a consistent backup of hobbyforge.db using VACUUM INTO.
/// Uses a direct sqlx connection (same pattern as bulk_sync_rules) so the
/// backup is an atomic, consistent snapshot even if the app is running.
#[tauri::command]
async fn backup_database(
    app: tauri::AppHandle,
    destination: String,
) -> Result<(), String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions};
    use std::str::FromStr;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_url = format!("sqlite:{}", app_data_dir.join("hobbyforge.db").display());

    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("opts: {e}"))?
        .create_if_missing(false);

    let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;

    // Remove existing file at destination to avoid VACUUM INTO's
    // "output file already exists" error (save dialog confirms overwrite).
    if let Err(e) = std::fs::remove_file(&destination) {
        if e.kind() != std::io::ErrorKind::NotFound {
            return Err(format!("remove existing backup: {e}"));
        }
    }

    // VACUUM INTO creates a consistent, defragmented copy of the database.
    // The destination path is interpolated with single-quote escaping since
    // sqlx parameterized binding does not work for VACUUM INTO's filename arg.
    let sql = format!("VACUUM INTO '{}'", destination.replace('\'', "''"));
    sqlx::query(&sql)
        .execute(&mut conn)
        .await
        .map_err(|e| format!("VACUUM INTO: {e}"))?;

    Ok(())
}

// ── Backup helpers ──────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BackupManifest {
    pub app_version: String,
    pub schema_version: u32,
    pub created_at: String,
    pub platform: String,
    pub db_size_bytes: u64,
}

/// Return the current UTC time formatted as an ISO 8601 / RFC 3339 string.
fn format_iso8601_now() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "unknown".to_string())
}

/// Return a filename-safe timestamp in `YYYY-MM-DD-HHMM` format (UTC).
/// Uses UTC to avoid the `local-offset` feature gate complexity on
/// multi-threaded Tauri apps where local offset detection is unsound.
fn format_filename_timestamp() -> String {
    let now = time::OffsetDateTime::now_utc();
    format!(
        "{:04}-{:02}-{:02}-{:02}{:02}",
        now.year(),
        now.month() as u8,
        now.day(),
        now.hour(),
        now.minute(),
    )
}

/// Create a consistent VACUUM INTO snapshot of hobbyforge.db into a temp file
/// inside app_data_dir. Returns the path to the temp file on success.
async fn vacuum_to_temp(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions};
    use std::str::FromStr;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_url = format!("sqlite:{}", app_data_dir.join("hobbyforge.db").display());

    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("opts: {e}"))?
        .create_if_missing(false);

    let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;

    let temp_path = app_data_dir.join("hobbyforge_backup_temp.db");

    // Remove existing temp file if present (guard against prior failed attempt)
    if let Err(e) = std::fs::remove_file(&temp_path) {
        if e.kind() != std::io::ErrorKind::NotFound {
            return Err(format!("remove temp file: {e}"));
        }
    }

    let sql = format!(
        "VACUUM INTO '{}'",
        temp_path.display().to_string().replace('\'', "''")
    );
    sqlx::query(&sql)
        .execute(&mut conn)
        .await
        .map_err(|e| format!("VACUUM INTO: {e}"))?;

    Ok(temp_path)
}

/// Create a zip archive at `dest_path` containing `hobbyforge.db` (from
/// `db_path`) and a pretty-printed `metadata.json` (from `metadata`).
/// Uses `Stored` compression — SQLite data does not compress well.
fn create_backup_zip(
    db_path: &std::path::Path,
    metadata: &BackupManifest,
    dest_path: &std::path::Path,
) -> Result<(), String> {
    use std::io::Write;
    use zip::write::{SimpleFileOptions, ZipWriter};

    let file = std::fs::File::create(dest_path)
        .map_err(|e| format!("create zip file: {e}"))?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Stored);

    // Add hobbyforge.db
    zip.start_file("hobbyforge.db", options)
        .map_err(|e| format!("start db entry: {e}"))?;
    let db_bytes = std::fs::read(db_path)
        .map_err(|e| format!("read temp db: {e}"))?;
    zip.write_all(&db_bytes)
        .map_err(|e| format!("write db to zip: {e}"))?;

    // Add metadata.json (pretty-printed for human readability)
    zip.start_file("metadata.json", options)
        .map_err(|e| format!("start metadata entry: {e}"))?;
    let meta_json = serde_json::to_string_pretty(metadata)
        .map_err(|e| format!("serialize metadata: {e}"))?;
    zip.write_all(meta_json.as_bytes())
        .map_err(|e| format!("write metadata to zip: {e}"))?;

    zip.finish().map_err(|e| format!("finalize zip: {e}"))?;
    Ok(())
}

// ── Backup commands ─────────────────────────────────────────────────────────

/// Export a structured backup (.zip) containing hobbyforge.db and metadata.json
/// to the caller-provided destination path. Returns the destination path on
/// success. The frontend provides the full path (via a save dialog in Phase 80).
#[tauri::command]
async fn export_backup(
    app: tauri::AppHandle,
    destination: String,
) -> Result<String, String> {
    // 1. VACUUM INTO a temp file for a consistent snapshot
    let temp_path = vacuum_to_temp(&app).await?;

    // 2. Build metadata from runtime values
    let db_size = std::fs::metadata(&temp_path)
        .map_err(|e| format!("read temp size: {e}"))?
        .len();

    let metadata = BackupManifest {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version: get_migrations().len() as u32,
        created_at: format_iso8601_now(),
        platform: std::env::consts::OS.to_string(),
        db_size_bytes: db_size,
    };

    // 3. Create the zip archive
    let dest = std::path::PathBuf::from(&destination);
    let result = create_backup_zip(&temp_path, &metadata, &dest);

    // 4. Always clean up temp file before propagating any error
    let _ = std::fs::remove_file(&temp_path);

    result?;
    Ok(destination)
}

/// Open a user-provided .zip file and validate it contains a valid backup.
/// Returns the parsed BackupManifest without modifying any files on disk.
/// This is a read-only inspection command used for restore preview (Phase 81).
#[tauri::command]
async fn validate_backup(path: String) -> Result<BackupManifest, String> {
    use std::io::Read;

    let file = std::fs::File::open(&path)
        .map_err(|e| format!("open zip: {e}"))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("invalid zip archive: {e}"))?;

    // Check hobbyforge.db entry exists (read by exact name — no path traversal)
    archive
        .by_name("hobbyforge.db")
        .map_err(|_| "backup missing hobbyforge.db".to_string())?;

    // Read and parse metadata.json
    let mut meta_file = archive
        .by_name("metadata.json")
        .map_err(|_| "backup missing metadata.json".to_string())?;

    let mut meta_str = String::new();
    meta_file
        .read_to_string(&mut meta_str)
        .map_err(|e| format!("read metadata.json: {e}"))?;

    let manifest: BackupManifest = serde_json::from_str(&meta_str)
        .map_err(|e| format!("parse metadata.json: {e}"))?;

    Ok(manifest)
}

/// Create a safety backup in app_data_dir/backups/ with an auto-generated
/// filename. Returns the full path to the created zip. Called by restore
/// (Phase 82) and pre-sync safety backup flows.
#[tauri::command]
async fn create_safety_backup(app: tauri::AppHandle) -> Result<String, String> {
    // 1. Resolve and ensure backups directory exists
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let backups_dir = app_data_dir.join("backups");
    std::fs::create_dir_all(&backups_dir)
        .map_err(|e| format!("create backups dir: {e}"))?;

    // 2. Generate the safety backup path
    let safety_path = backups_dir.join(format!("safety-{}.zip", format_filename_timestamp()));

    // 3. VACUUM INTO a temp file for a consistent snapshot
    let temp_path = vacuum_to_temp(&app).await?;

    // 4. Build metadata
    let db_size = std::fs::metadata(&temp_path)
        .map_err(|e| format!("read temp size: {e}"))?
        .len();

    let metadata = BackupManifest {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version: get_migrations().len() as u32,
        created_at: format_iso8601_now(),
        platform: std::env::consts::OS.to_string(),
        db_size_bytes: db_size,
    };

    // 5. Create the zip archive
    let result = create_backup_zip(&temp_path, &metadata, &safety_path);

    // 6. Always clean up temp file before propagating any error
    let _ = std::fs::remove_file(&temp_path);

    result?;
    Ok(safety_path.display().to_string())
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
        .invoke_handler(tauri::generate_handler![
            bulk_sync_rules,
            backup_database,
            export_backup,
            validate_backup,
            create_safety_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// EXP-03: BackupManifest serialize/deserialize roundtrip — all 5 fields survive
    #[test]
    fn backup_manifest_serde_roundtrip() {
        let original = BackupManifest {
            app_version: "0.2.7".to_string(),
            schema_version: 28,
            created_at: "2026-05-18T12:00:00Z".to_string(),
            platform: "windows".to_string(),
            db_size_bytes: 1_048_576,
        };

        let json = serde_json::to_string(&original).expect("serialize failed");
        let deserialized: BackupManifest =
            serde_json::from_str(&json).expect("deserialize failed");

        assert_eq!(deserialized.app_version, original.app_version);
        assert_eq!(deserialized.schema_version, original.schema_version);
        assert_eq!(deserialized.created_at, original.created_at);
        assert_eq!(deserialized.platform, original.platform);
        assert_eq!(deserialized.db_size_bytes, original.db_size_bytes);
    }

    /// EXP-03: format_iso8601_now() returns a valid RFC 3339 timestamp
    #[test]
    fn format_iso8601_now_returns_valid_rfc3339() {
        let ts = format_iso8601_now();

        // Must not be the fallback value
        assert_ne!(ts, "unknown", "format_iso8601_now returned fallback 'unknown'");

        // Must parse back as a valid RFC 3339 datetime
        let parsed = time::OffsetDateTime::parse(
            &ts,
            &time::format_description::well_known::Rfc3339,
        );
        assert!(
            parsed.is_ok(),
            "format_iso8601_now produced '{}' which is not valid RFC 3339: {:?}",
            ts,
            parsed.err()
        );
    }

    /// EXP-04: format_filename_timestamp() returns YYYY-MM-DD-HHMM pattern
    #[test]
    fn format_filename_timestamp_matches_pattern() {
        let ts = format_filename_timestamp();

        // Must be exactly 15 chars: YYYY-MM-DD-HHMM
        assert_eq!(
            ts.len(),
            15,
            "Expected 15-char timestamp, got '{}' (len={})",
            ts,
            ts.len()
        );

        // Check structure: digits and dashes in correct positions
        let chars: Vec<char> = ts.chars().collect();
        // YYYY
        assert!(chars[0].is_ascii_digit());
        assert!(chars[1].is_ascii_digit());
        assert!(chars[2].is_ascii_digit());
        assert!(chars[3].is_ascii_digit());
        // -
        assert_eq!(chars[4], '-');
        // MM
        assert!(chars[5].is_ascii_digit());
        assert!(chars[6].is_ascii_digit());
        // -
        assert_eq!(chars[7], '-');
        // DD
        assert!(chars[8].is_ascii_digit());
        assert!(chars[9].is_ascii_digit());
        // -
        assert_eq!(chars[10], '-');
        // HHMM
        assert!(chars[11].is_ascii_digit());
        assert!(chars[12].is_ascii_digit());
        assert!(chars[13].is_ascii_digit());
        assert!(chars[14].is_ascii_digit());

        // Validate month is 01-12
        let month: u8 = ts[5..7].parse().unwrap();
        assert!((1..=12).contains(&month), "Month {} out of range", month);

        // Validate day is 01-31
        let day: u8 = ts[8..10].parse().unwrap();
        assert!((1..=31).contains(&day), "Day {} out of range", day);

        // Validate hour is 00-23
        let hour: u8 = ts[11..13].parse().unwrap();
        assert!((0..=23).contains(&hour), "Hour {} out of range", hour);

        // Validate minute is 00-59
        let minute: u8 = ts[13..15].parse().unwrap();
        assert!((0..=59).contains(&minute), "Minute {} out of range", minute);
    }

    /// EXP-03 partial: create_backup_zip + ZipArchive read roundtrip
    #[test]
    fn create_backup_zip_roundtrip() {
        use std::io::Read;

        let temp_dir = std::env::temp_dir().join("hobbyforge_test_backup");
        let _ = std::fs::create_dir_all(&temp_dir);

        let fake_db_path = temp_dir.join("test_hobbyforge.db");
        let zip_path = temp_dir.join("test_backup.zip");

        // Create a fake db file with known content
        let db_content = b"SQLite format 3\x00fake database content for testing";
        std::fs::write(&fake_db_path, db_content).expect("write fake db");

        let manifest = BackupManifest {
            app_version: "0.2.7".to_string(),
            schema_version: 28,
            created_at: "2026-05-18T14:30:00Z".to_string(),
            platform: "windows".to_string(),
            db_size_bytes: db_content.len() as u64,
        };

        // Create the zip
        create_backup_zip(&fake_db_path, &manifest, &zip_path)
            .expect("create_backup_zip failed");

        // Verify the zip exists and has nonzero size
        let zip_meta = std::fs::metadata(&zip_path).expect("zip file missing");
        assert!(zip_meta.len() > 0, "zip file is empty");

        // Open and verify zip contents
        let file = std::fs::File::open(&zip_path).expect("open zip");
        let mut archive = zip::ZipArchive::new(file).expect("parse zip");

        // Must have exactly 2 entries
        assert_eq!(archive.len(), 2, "Expected 2 entries in zip, got {}", archive.len());

        // Verify hobbyforge.db entry
        {
            let mut entry = archive.by_name("hobbyforge.db").expect("missing hobbyforge.db entry");
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).expect("read hobbyforge.db");
            assert_eq!(buf, db_content, "hobbyforge.db content mismatch");
        }

        // Verify metadata.json entry deserializes back to original manifest
        {
            let mut entry = archive.by_name("metadata.json").expect("missing metadata.json entry");
            let mut json_str = String::new();
            entry.read_to_string(&mut json_str).expect("read metadata.json");
            let parsed: BackupManifest =
                serde_json::from_str(&json_str).expect("parse metadata.json");
            assert_eq!(parsed.app_version, manifest.app_version);
            assert_eq!(parsed.schema_version, manifest.schema_version);
            assert_eq!(parsed.created_at, manifest.created_at);
            assert_eq!(parsed.platform, manifest.platform);
            assert_eq!(parsed.db_size_bytes, manifest.db_size_bytes);
        }

        // Clean up
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
