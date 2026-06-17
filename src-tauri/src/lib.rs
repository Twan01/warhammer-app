use tauri::{Emitter, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};
use std::collections::HashMap;
use sha2::{Digest, Sha384};

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
        Migration {
            version: 29,
            description: "synced_point_tiers",
            sql: include_str!("../migrations/029_synced_point_tiers.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 30,
            description: "bsdata_extended",
            sql: include_str!("../migrations/030_bsdata_extended.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 31,
            description: "army_list_v3",
            sql: include_str!("../migrations/031_army_list_v3.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 32,
            description: "army_list_snapshots",
            sql: include_str!("../migrations/032_army_list_snapshots.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 33,
            description: "database_hardening",
            sql: include_str!("../migrations/033_database_hardening.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 34,
            description: "urm_datasheet_name",
            sql: include_str!("../migrations/034_urm_datasheet_name.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 35,
            description: "army_list_unit_sort_order",
            sql: include_str!("../migrations/035_army_list_unit_sort_order.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 36,
            description: "unit_form_simplification",
            sql: include_str!("../migrations/036_unit_form_simplification.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 37,
            description: "override_flags",
            sql: include_str!("../migrations/037_override_flags.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 38,
            description: "udb_schema",
            sql: include_str!("../migrations/038_udb_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 39,
            description: "collection_udb_link",
            sql: include_str!("../migrations/039_collection_udb_link.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 40,
            description: "drop_synced_points",
            sql: include_str!("../migrations/040_drop_synced_points.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 41,
            description: "udb_sub_faction_fr",
            sql: include_str!("../migrations/041_udb_sub_faction_fr.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 42,
            description: "udb_detachments",
            sql: include_str!("../migrations/042_udb_detachments.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 43,
            description: "udb_stratagems_enhancements",
            sql: include_str!("../migrations/043_udb_stratagems_enhancements.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 44,
            description: "app_settings",
            sql: include_str!("../migrations/044_app_settings.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 45,
            description: "backfill_collection_points",
            sql: include_str!("../migrations/045_backfill_collection_points.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 46,
            description: "backfill_faction_udb_normalized",
            sql: include_str!("../migrations/046_backfill_faction_udb_normalized.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 47,
            description: "army_list_unit_wargear",
            sql: include_str!("../migrations/047_army_list_unit_wargear.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 48,
            description: "consolidate_factions",
            sql: include_str!("../migrations/048_consolidate_factions.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

// ── Pre-migration repair ────────────────────────────────────────────────────
//
// sqlx stores SHA-384 checksums of applied migrations in `_sqlx_migrations`.
// If a migration file changes after being applied (even whitespace), the app
// panics on startup with no recovery path. This runs *before* the Tauri
// builder so it completes before tauri-plugin-sql initializes.

/// Resolves the WebView2 data directory on Windows (%LOCALAPPDATA%\<id>).
/// Returns None on non-Windows or if the env var is missing.
fn resolve_webview_data_dir() -> Option<std::path::PathBuf> {
    const IDENTIFIER: &str = "com.hobbyforge.app";
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("LOCALAPPDATA")
            .map(|p| std::path::PathBuf::from(p).join(IDENTIFIER).join("EBWebView"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}

const LAUNCH_SENTINEL: &str = ".launch-sentinel";

/// Self-healing: if the previous launch didn't complete (sentinel still exists),
/// clear the WebView2 cache which is a known corruption point on Windows.
fn preflight_webview_heal() {
    let Some(app_data_dir) = resolve_app_data_dir() else { return };
    let sentinel = app_data_dir.join(LAUNCH_SENTINEL);

    if sentinel.exists() {
        eprintln!("[hobbyforge] previous launch did not complete — clearing WebView2 cache");
        if let Some(webview_dir) = resolve_webview_data_dir() {
            if webview_dir.exists() {
                match std::fs::remove_dir_all(&webview_dir) {
                    Ok(_) => println!("[hobbyforge] WebView2 cache cleared: {}", webview_dir.display()),
                    Err(e) => eprintln!("[hobbyforge] failed to clear WebView2 cache: {e}"),
                }
            }
        }
        let _ = std::fs::remove_file(&sentinel);
    }

    // Write sentinel — removed by ack_successful_launch once the UI loads.
    let _ = std::fs::create_dir_all(&app_data_dir);
    if let Err(e) = std::fs::write(&sentinel, b"launching") {
        eprintln!("[hobbyforge] failed to write launch sentinel: {e}");
    }
}

/// Maximum byte size for frontend.log before tail-trimming (D-10).
const FRONTEND_LOG_CAP_BYTES: u64 = 512 * 1024;

/// Tail-trim a log file to keep only the most-recent bytes when it exceeds `cap`.
///
/// Retains roughly the most-recent half of `cap` bytes, aligning to the next
/// newline so the first retained line is never a fragment. Uses an atomic-ish
/// temp-write + rename (best-effort — swallows every error).
fn tail_trim_if_oversized(path: &std::path::Path, cap: u64) {
    let Ok(meta) = std::fs::metadata(path) else { return }; // file may not exist yet
    if meta.len() <= cap { return; }
    // Keep the most recent ~half-cap so we trim infrequently, not on every append.
    let keep = (cap / 2) as usize;
    let Ok(bytes) = std::fs::read(path) else { return };
    let start = bytes.len().saturating_sub(keep);
    // Align to the next line boundary so the first retained line isn't a fragment.
    let aligned = bytes[start..]
        .iter()
        .position(|&b| b == b'\n')
        .map(|i| start + i + 1)
        .unwrap_or(start);
    let tail = &bytes[aligned..];
    // Atomic-ish replace: write to a temp then rename (best-effort).
    let tmp = path.with_extension("log.tmp");
    if std::fs::write(&tmp, tail).is_ok() {
        let _ = std::fs::rename(&tmp, path);
    }
}

/// Append a timestamped line to frontend.log inside app_data_dir.
///
/// This is a best-effort, infallible Tauri command — logging must never abort
/// anything. Takes only `line: String` (no path param) and writes to a hard-coded
/// path (V5 input-validation: no path traversal possible). Mirrors to stderr for
/// dev runs alongside the existing preflight.log.
#[tauri::command]
fn append_frontend_log(line: String) {
    eprintln!("[hobbyforge][frontend] {line}");
    let Some(app_data_dir) = resolve_app_data_dir() else { return };
    let _ = std::fs::create_dir_all(&app_data_dir);
    let log_path = app_data_dir.join("frontend.log");
    tail_trim_if_oversized(&log_path, FRONTEND_LOG_CAP_BYTES);
    let stamped = format!("{}  {}\n", format_iso8601_now(), line);
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let _ = f.write_all(stamped.as_bytes());
    }
}

/// Append a timestamped line to the preflight log file inside app_data_dir.
///
/// stderr/stdout are invisible in a packaged GUI release, so preflight repair
/// outcomes must be persisted to disk to be diagnosable after a failed update.
/// This is best-effort and infallible — logging must never be able to abort
/// startup. It mirrors to stderr for dev runs.
fn preflight_log(line: &str) {
    eprintln!("[hobbyforge] {line}");
    let Some(app_data_dir) = resolve_app_data_dir() else { return };
    let _ = std::fs::create_dir_all(&app_data_dir);
    let log_path = app_data_dir.join("preflight.log");
    let stamped = format!("{}  {}\n", format_iso8601_now(), line);
    use std::io::Write;
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let _ = f.write_all(stamped.as_bytes());
    }
}

fn resolve_app_data_dir() -> Option<std::path::PathBuf> {
    const IDENTIFIER: &str = "com.hobbyforge.app";
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("APPDATA").map(|p| std::path::PathBuf::from(p).join(IDENTIFIER))
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var_os("HOME")
            .map(|h| std::path::PathBuf::from(h).join("Library/Application Support").join(IDENTIFIER))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        std::env::var_os("XDG_DATA_HOME")
            .map(std::path::PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|h| std::path::PathBuf::from(h).join(".local/share")))
            .map(|p| p.join(IDENTIFIER))
    }
}

async fn repair_migration_checksums(
    db_path: &std::path::Path,
    migrations: &[Migration],
) -> Result<bool, String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions};
    use std::str::FromStr;

    if !db_path.exists() {
        return Ok(false);
    }

    let db_url = format!("sqlite:{}", db_path.display());
    // busy_timeout: during an NSIS in-place update the previous process may still
    // hold the DB briefly. Without a timeout the connect/queries fail instantly,
    // the repair is silently skipped, and the SQL plugin then panics. A 10s
    // timeout lets the lock clear so the repair runs deterministically.
    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("repair opts: {e}"))?
        .create_if_missing(false)
        .busy_timeout(std::time::Duration::from_secs(10));
    let mut conn = opts.connect().await.map_err(|e| format!("repair connect: {e}"))?;

    let table_exists: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'"
    )
    .fetch_one(&mut conn)
    .await
    .unwrap_or(false);

    if !table_exists {
        return Ok(false);
    }

    let rows: Vec<(i64, Vec<u8>)> = sqlx::query_as(
        "SELECT version, checksum FROM _sqlx_migrations ORDER BY version"
    )
    .fetch_all(&mut conn)
    .await
    .map_err(|e| format!("repair fetch: {e}"))?;

    let mut mismatches = Vec::new();
    for (db_version, db_checksum) in &rows {
        if let Some(m) = migrations.iter().find(|m| m.version == *db_version) {
            let expected = Vec::from(Sha384::digest(m.sql.as_bytes()).as_slice());
            if *db_checksum != expected {
                mismatches.push((*db_version, expected));
            }
        }
    }

    if mismatches.is_empty() {
        return Ok(false);
    }

    preflight_log(&format!(
        "migration checksum mismatch on {} version(s): {:?} — repairing",
        mismatches.len(),
        mismatches.iter().map(|(v, _)| *v).collect::<Vec<_>>()
    ));

    // Safety backup before modifying the tracking table.
    // Use parent() defensively — never unwrap (must not panic during preflight).
    let backup_dir = match db_path.parent() {
        Some(p) => p.join("backups"),
        None => return Err("db_path has no parent dir".to_string()),
    };
    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("create backup dir: {e}"))?;
    let ts = format_filename_timestamp();
    let backup_path = backup_dir.join(format!("safety-premigrate-{ts}.db"));
    std::fs::copy(db_path, &backup_path)
        .map_err(|e| format!("safety copy: {e}"))?;
    preflight_log(&format!("safety backup created: {}", backup_path.display()));

    for (version, checksum) in &mismatches {
        sqlx::query("UPDATE _sqlx_migrations SET checksum = $1 WHERE version = $2")
            .bind(checksum.as_slice())
            .bind(version)
            .execute(&mut conn)
            .await
            .map_err(|e| format!("repair update v{version}: {e}"))?;
    }

    // Persist the checksum UPDATEs into the main DB file BEFORE the SQL plugin
    // opens it. If the DB is in WAL mode, the writes live in the -wal sidecar
    // until checkpointed; the plugin opening a fresh connection would normally
    // see them, but an explicit TRUNCATE checkpoint guarantees the main file is
    // authoritative and removes any window where the old WAL could be replayed.
    // Best-effort: a checkpoint failure must not abort — the row updates are
    // already committed.
    if let Err(e) = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&mut conn)
        .await
    {
        preflight_log(&format!("post-repair wal_checkpoint warning (non-fatal): {e}"));
    }

    preflight_log("migration checksums repaired successfully");
    Ok(true)
}

async fn sync_user_version(
    db_path: &std::path::Path,
    migration_count: u32,
) -> Result<(), String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Row};
    use std::str::FromStr;

    if !db_path.exists() {
        return Ok(());
    }

    let db_url = format!("sqlite:{}", db_path.display());
    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("user_version opts: {e}"))?
        .create_if_missing(false)
        .busy_timeout(std::time::Duration::from_secs(10));
    let mut conn = opts.connect().await.map_err(|e| format!("user_version connect: {e}"))?;

    let current: u32 = sqlx::query("PRAGMA user_version")
        .fetch_one(&mut conn)
        .await
        .map_err(|e| format!("read user_version: {e}"))
        .and_then(|row| row.try_get::<u32, _>(0).map_err(|e| format!("get user_version: {e}")))?;

    if current != migration_count {
        sqlx::query(&format!("PRAGMA user_version = {migration_count}"))
            .execute(&mut conn)
            .await
            .map_err(|e| format!("set user_version: {e}"))?;
        preflight_log(&format!("user_version updated: {current} -> {migration_count}"));
    }

    Ok(())
}

/// AUTHORITATIVE pre-migration repair.
///
/// Runs BEFORE the SQL plugin (which runs the sqlx migrator at .build() — a
/// checksum VersionMismatch there panics before any window is created). This
/// realigns the installed DB's stored _sqlx_migrations checksums with the bytes
/// the current build embeds, so the plugin's migrator validates cleanly.
///
/// Hardening guarantees:
/// - NEVER panics: no unwrap/expect on any path; block_on body only logs errors.
/// - busy_timeout on the repair connection so a transient lock during an in-place
///   update does not cause the repair to be silently skipped.
/// - WAL checkpoint after repair so the corrected checksums are persisted to the
///   main DB file before the plugin opens it.
/// - Outcomes logged to app_data_dir/preflight.log (stderr is invisible in a
///   packaged GUI release).
fn preflight_migration_repair() {
    let Some(app_data_dir) = resolve_app_data_dir() else {
        preflight_log("could not resolve app data dir — skipping migration repair");
        return;
    };

    let main_db = app_data_dir.join("hobbyforge.db");
    let main_migrations = get_migrations();

    tauri::async_runtime::block_on(async {
        match repair_migration_checksums(&main_db, &main_migrations).await {
            Ok(true) => {} // repair already logged its outcome
            Ok(false) => preflight_log("migration checksums already consistent — no repair needed"),
            Err(e) => preflight_log(&format!(
                "main db repair FAILED: {e} — plugin migrator may panic; not aborting preflight"
            )),
        }
        if let Err(e) = sync_user_version(&main_db, main_migrations.len() as u32).await {
            preflight_log(&format!("user_version sync failed: {e}"));
        }
    });
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
pub struct UnitDatabasePayload {
    version: String,
    built_at: String,
    game_system: Option<String>,
    faction_count: Option<u32>,
    unit_count: Option<u32>,
    #[serde(default)]
    factions: Vec<JsRow>,
    #[serde(default)]
    units: Vec<JsRow>,
    #[serde(default)]
    models: Vec<JsRow>,
    #[serde(default)]
    weapons: Vec<JsRow>,
    #[serde(default)]
    abilities: Vec<JsRow>,
    #[serde(default)]
    keywords: Vec<JsRow>,
    #[serde(default)]
    points: Vec<JsRow>,
    #[serde(default)]
    composition: Vec<JsRow>,
    #[serde(default)]
    detachments: Vec<JsRow>,
    #[serde(default)]
    detachment_abilities: Vec<JsRow>,
    #[serde(default)]
    stratagems: Vec<JsRow>,
    #[serde(default)]
    enhancements: Vec<JsRow>,
}

#[derive(serde::Serialize, Debug)]
pub struct UdbImportResult {
    pub factions: u64,
    pub units: u64,
    pub models: u64,
    pub weapons: u64,
    pub abilities: u64,
    pub keywords: u64,
    pub points: u64,
    pub composition: u64,
    pub detachments: u64,
    pub detachment_abilities: u64,
    pub stratagems: u64,
    pub enhancements: u64,
}

/// Core import logic for unit_database.json into udb_* tables.
/// Callable from both the setup hook and the Tauri command.
async fn import_unit_database_inner(app: &tauri::AppHandle) -> Result<UdbImportResult, String> {
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions, Connection};
    use std::str::FromStr;

    // Resolve hobbyforge.db path
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let db_url = format!("sqlite:{}", app_data_dir.join("hobbyforge.db").display());

    // Resolve JSON resource path (D-07: ships as Tauri resource)
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir: {e}"))?;
    let json_path = resource_dir.join("data").join("unit_database.json");
    let json_str = std::fs::read_to_string(&json_path)
        .map_err(|e| format!("read unit_database.json ({}): {e}", json_path.display()))?;
    let payload: UnitDatabasePayload = serde_json::from_str(&json_str)
        .map_err(|e| format!("parse unit_database.json: {e}"))?;

    // Open direct sqlx connection for atomic import
    let opts = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| format!("opts: {e}"))?
        .create_if_missing(false)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(30));

    let mut conn = opts.connect().await.map_err(|e| format!("connect: {e}"))?;

    // D-06: Check udb_meta version — skip import if already up to date
    let existing_version: Option<String> = sqlx::query_scalar(
        "SELECT version FROM udb_meta WHERE id = 1",
    )
    .fetch_optional(&mut conn)
    .await
    .map_err(|e| format!("query udb_meta: {e}"))?;

    if let Some(ref ver) = existing_version {
        if ver == &payload.version {
            return Ok(UdbImportResult {
                factions: 0, units: 0, models: 0, weapons: 0,
                abilities: 0, keywords: 0, points: 0, composition: 0,
                detachments: 0, detachment_abilities: 0,
                stratagems: 0, enhancements: 0,
            });
        }
    }

    // FK checks OFF so we can DELETE in any order (D-11)
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&mut conn)
        .await
        .map_err(|e| format!("pragma fk off: {e}"))?;

    let mut tx = conn.begin().await.map_err(|e| format!("begin: {e}"))?;

    let mut counts = UdbImportResult {
        factions: 0, units: 0, models: 0, weapons: 0,
        abilities: 0, keywords: 0, points: 0, composition: 0,
        detachments: 0, detachment_abilities: 0,
        stratagems: 0, enhancements: 0,
    };

    // D-09/D-08: DELETE all udb_* tables (FK OFF so order doesn't matter)
    for table in [
        "udb_unit_keywords",
        "udb_unit_points",
        "udb_unit_composition",
        "udb_unit_abilities",
        "udb_unit_weapons",
        "udb_unit_models",
        "udb_units",
        "udb_stratagems",
        "udb_enhancements",
        "udb_detachment_abilities",
        "udb_detachments",
        "udb_factions",
        "udb_meta",
    ] {
        sqlx::query(&format!("DELETE FROM {table}"))
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("delete {table}: {e}"))?;
    }

    // INSERT factions
    for row in &payload.factions {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_factions (id, name, short_name, name_fr) VALUES (?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "short_name"))
        .bind(str_val(row, "name_fr"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert faction {id}: {e}"))?;
        counts.factions += res.rows_affected();
    }

    // INSERT units
    for row in &payload.units {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_units (id, faction_id, name, role, base_points, damaged_w, damaged_desc, sub_faction, name_fr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "faction_id").unwrap_or_default())
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "role"))
        .bind(i64_val(row, "base_points"))
        .bind(str_val(row, "damaged_w"))
        .bind(str_val(row, "damaged_desc"))
        .bind(str_val(row, "sub_faction"))
        .bind(str_val(row, "name_fr"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert unit {id}: {e}"))?;
        counts.units += res.rows_affected();
    }

    // INSERT models
    for row in &payload.models {
        let unit_id = str_val(row, "unit_id").unwrap_or_default();
        if unit_id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_unit_models (unit_id, line_order, name, M, T, Sv, inv_sv, W, Ld, OC) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&unit_id)
        .bind(i64_val(row, "line_order").unwrap_or(0))
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
        .map_err(|e| format!("insert model unit_id={unit_id}: {e}"))?;
        counts.models += res.rows_affected();
    }

    // INSERT weapons
    for row in &payload.weapons {
        let unit_id = str_val(row, "unit_id").unwrap_or_default();
        if unit_id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_unit_weapons (unit_id, weapon_group, line_order, name, category, range, attacks, skill, strength, ap, damage, keywords, name_fr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&unit_id)
        .bind(i64_val(row, "weapon_group").unwrap_or(1))
        .bind(i64_val(row, "line_order").unwrap_or(1))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "category"))
        .bind(str_val(row, "range"))
        .bind(str_val(row, "attacks"))
        .bind(str_val(row, "skill"))
        .bind(str_val(row, "strength"))
        .bind(str_val(row, "ap"))
        .bind(str_val(row, "damage"))
        .bind(str_val(row, "keywords"))
        .bind(str_val(row, "name_fr"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert weapon unit_id={unit_id}: {e}"))?;
        counts.weapons += res.rows_affected();
    }

    // INSERT abilities
    for row in &payload.abilities {
        let unit_id = str_val(row, "unit_id").unwrap_or_default();
        if unit_id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_unit_abilities (unit_id, line_order, name, description, ability_type, name_fr, description_fr) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&unit_id)
        .bind(i64_val(row, "line_order").unwrap_or(0))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "description"))
        .bind(str_val(row, "ability_type"))
        .bind(str_val(row, "name_fr"))
        .bind(str_val(row, "description_fr"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert ability unit_id={unit_id}: {e}"))?;
        counts.abilities += res.rows_affected();
    }

    // INSERT keywords
    for row in &payload.keywords {
        let unit_id = str_val(row, "unit_id").unwrap_or_default();
        let keyword = str_val(row, "keyword").unwrap_or_default();
        if unit_id.is_empty() || keyword.is_empty() { continue; }
        let is_faction: i64 = i64_val(row, "is_faction").unwrap_or(0);
        let res = sqlx::query(
            "INSERT OR IGNORE INTO udb_unit_keywords (unit_id, keyword, is_faction, keyword_fr) VALUES (?, ?, ?, ?)",
        )
        .bind(&unit_id)
        .bind(&keyword)
        .bind(is_faction)
        .bind(str_val(row, "keyword_fr"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert keyword unit_id={unit_id} keyword={keyword}: {e}"))?;
        counts.keywords += res.rows_affected();
    }

    // INSERT points tiers
    for row in &payload.points {
        let unit_id = str_val(row, "unit_id").unwrap_or_default();
        if unit_id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_unit_points (unit_id, model_count, points) VALUES (?, ?, ?)",
        )
        .bind(&unit_id)
        .bind(i64_val(row, "model_count").unwrap_or(0))
        .bind(i64_val(row, "points").unwrap_or(0))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert points unit_id={unit_id}: {e}"))?;
        counts.points += res.rows_affected();
    }

    // INSERT composition
    for row in &payload.composition {
        let unit_id = str_val(row, "unit_id").unwrap_or_default();
        if unit_id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_unit_composition (unit_id, min_models, max_models, notes) VALUES (?, ?, ?, ?)",
        )
        .bind(&unit_id)
        .bind(i64_val(row, "min_models").unwrap_or(1))
        .bind(i64_val(row, "max_models").unwrap_or(1))
        .bind(str_val(row, "notes"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert composition unit_id={unit_id}: {e}"))?;
        counts.composition += res.rows_affected();
    }

    // INSERT detachments
    for row in &payload.detachments {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_detachments (id, faction_id, name) VALUES (?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "faction_id").unwrap_or_default())
        .bind(str_val(row, "name").unwrap_or_default())
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert detachment {id}: {e}"))?;
        counts.detachments += res.rows_affected();
    }

    // INSERT detachment_abilities
    for row in &payload.detachment_abilities {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_detachment_abilities (id, detachment_id, faction_id, name, description) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "detachment_id").unwrap_or_default())
        .bind(str_val(row, "faction_id").unwrap_or_default())
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "description"))
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert detachment_ability {id}: {e}"))?;
        counts.detachment_abilities += res.rows_affected();
    }

    // INSERT stratagems
    for row in &payload.stratagems {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_stratagems \
             (id, faction_id, detachment_id, name, type, cp_cost, turn, phase, description) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "faction_id"))
        .bind(str_val(row, "detachment_id"))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(str_val(row, "type"))
        .bind(i64_val(row, "cp_cost").unwrap_or(0))
        .bind(str_val(row, "turn"))
        .bind(str_val(row, "phase"))
        .bind(str_val(row, "description").unwrap_or_default())
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert stratagem {id}: {e}"))?;
        counts.stratagems += res.rows_affected();
    }

    // INSERT enhancements
    for row in &payload.enhancements {
        let id = str_val(row, "id").unwrap_or_default();
        if id.is_empty() { continue; }
        let res = sqlx::query(
            "INSERT INTO udb_enhancements \
             (id, faction_id, detachment_id, name, cost, description) \
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(str_val(row, "faction_id").unwrap_or_default())
        .bind(str_val(row, "detachment_id"))
        .bind(str_val(row, "name").unwrap_or_default())
        .bind(i64_val(row, "cost").unwrap_or(0))
        .bind(str_val(row, "description").unwrap_or_default())
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("insert enhancement {id}: {e}"))?;
        counts.enhancements += res.rows_affected();
    }

    // INSERT udb_meta (single row, id=1)
    sqlx::query(
        "INSERT INTO udb_meta (id, version, built_at, game_system, unit_count, faction_count) VALUES (1, ?, ?, ?, ?, ?)",
    )
    .bind(&payload.version)
    .bind(&payload.built_at)
    .bind(payload.game_system.as_deref().unwrap_or("40k-10th"))
    .bind(payload.unit_count.map(|v| v as i64))
    .bind(payload.faction_count.map(|v| v as i64))
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("insert udb_meta: {e}"))?;

    // D-08: Rebuild FTS5 index from source tables
    sqlx::query("DELETE FROM udb_search")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("delete udb_search: {e}"))?;

    sqlx::query(
        "INSERT INTO udb_search(unit_id, name, faction_name, keywords) \
         SELECT u.id, u.name, f.name, \
                COALESCE(u.name_fr || ' ', '') || COALESCE(f.name_fr || ' ', '') || \
                COALESCE(u.sub_faction || ' ', '') || \
                COALESCE(GROUP_CONCAT(k.keyword, ' '), '') || ' ' || \
                COALESCE(GROUP_CONCAT(k.keyword_fr, ' '), '') \
         FROM udb_units u \
         JOIN udb_factions f ON f.id = u.faction_id \
         LEFT JOIN udb_unit_keywords k ON k.unit_id = u.id \
         GROUP BY u.id",
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("rebuild udb_search: {e}"))?;

    let commit_result = tx.commit().await.map_err(|e| format!("commit udb: {e}"));

    // Restore FK enforcement unconditionally — even if commit failed
    let _ = sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&mut conn)
        .await;

    commit_result?;

    // D-12: WAL checkpoint after commit, before returning
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&mut conn)
        .await
        .map_err(|e| format!("wal_checkpoint: {e}"))?;

    Ok(counts)
}

/// Import the bundled unit_database.json into udb_* tables.
/// Called by the setup hook on first launch or version mismatch.
#[tauri::command]
async fn import_unit_database(app: tauri::AppHandle) -> Result<UdbImportResult, String> {
    import_unit_database_inner(&app).await
}

// ── Backup helpers ──────────────────────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BackupManifest {
    pub app_version: String,
    pub schema_version: u32,
    pub created_at: String,
    pub platform: String,
    pub db_size_bytes: u64,
    #[serde(default)]
    pub rules_schema_version: u32,
    #[serde(default)]
    pub includes_rules_db: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
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
        rules_schema_version: 0,
        includes_rules_db: false,
        notes: None,
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
        rules_schema_version: 0,
        includes_rules_db: false,
        notes: None,
    };

    // 5. Create the zip archive
    let result = create_backup_zip(&temp_path, &metadata, &safety_path);

    // 6. Always clean up temp file before propagating any error
    let _ = std::fs::remove_file(&temp_path);

    result?;
    Ok(safety_path.display().to_string())
}

// ── Restore + Safety Backup listing ─────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct SafetyBackupEntry {
    pub filename: String,
    pub timestamp: String,
    pub size_bytes: u64,
}

/// Replace hobbyforge.db with the database from a validated backup zip.
/// Sequence: (1) create safety backup, (2) extract + validate hobbyforge.db
/// bytes from the zip into memory, (3) delete sidecar files, (4) write the new
/// db. No destructive filesystem operation happens until the replacement bytes
/// are in hand — a missing/corrupt zip leaves the live database untouched.
#[tauri::command]
async fn restore_from_backup(
    app: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    use std::io::Read;

    // 1. Safety backup before any destructive operation
    create_safety_backup(app.clone()).await?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;

    // 2. Extract hobbyforge.db from the backup zip into memory FIRST. If the zip is
    //    missing/corrupt or lacks the entry, abort here — before deleting any sidecar
    //    (the WAL may hold un-checkpointed committed transactions for the live DB).
    let file = std::fs::File::open(&path)
        .map_err(|e| format!("open zip: {e}"))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("invalid zip archive: {e}"))?;

    let mut db_bytes = Vec::new();
    {
        let mut db_entry = archive
            .by_name("hobbyforge.db")
            .map_err(|_| "backup missing hobbyforge.db".to_string())?;
        db_entry
            .read_to_end(&mut db_bytes)
            .map_err(|e| format!("read hobbyforge.db from zip: {e}"))?;
    }

    // Cheap sanity check: a valid SQLite file starts with "SQLite format 3\0".
    const SQLITE_MAGIC: &[u8] = b"SQLite format 3\0";
    if db_bytes.len() < SQLITE_MAGIC.len() || &db_bytes[..SQLITE_MAGIC.len()] != SQLITE_MAGIC {
        return Err("backup hobbyforge.db is not a valid SQLite database".to_string());
    }

    // 3. Now safe to delete sidecar files (WAL, SHM, journal) — tolerate NotFound
    for sidecar in ["-wal", "-shm", "-journal"] {
        let sidecar_path = app_data_dir.join(format!("hobbyforge.db{sidecar}"));
        if let Err(e) = std::fs::remove_file(&sidecar_path) {
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(format!("remove sidecar {sidecar}: {e}"));
            }
        }
    }

    // 4. Write the validated replacement database
    std::fs::write(app_data_dir.join("hobbyforge.db"), &db_bytes)
        .map_err(|e| format!("write hobbyforge.db: {e}"))?;

    Ok(())
}

/// Delete hobbyforge.db and all user photos after creating a safety backup.
/// The JS caller must call localStorage.clear() + relaunch() after this
/// succeeds — migration plugin recreates the DB on startup.
#[tauri::command]
async fn factory_reset(app: tauri::AppHandle) -> Result<(), String> {
    // 1. Safety backup — abort if it fails
    create_safety_backup(app.clone()).await?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;

    // 2. Delete sidecar files (WAL, SHM, journal) — tolerate NotFound
    for sidecar in ["-wal", "-shm", "-journal"] {
        let sidecar_path = app_data_dir.join(format!("hobbyforge.db{sidecar}"));
        if let Err(e) = std::fs::remove_file(&sidecar_path) {
            if e.kind() != std::io::ErrorKind::NotFound {
                return Err(format!("remove sidecar {sidecar}: {e}"));
            }
        }
    }

    // 3. Delete hobbyforge.db — must exist
    let db_path = app_data_dir.join("hobbyforge.db");
    std::fs::remove_file(&db_path)
        .map_err(|e| format!("remove hobbyforge.db: {e}"))?;

    // 4. Delete user photo files (flat UUID-named images in app_data_dir root)
    let image_extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    if let Ok(entries) = std::fs::read_dir(&app_data_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if image_extensions.contains(&ext.to_lowercase().as_str()) {
                        let _ = std::fs::remove_file(&path);
                    }
                }
            }
        }
    }

    Ok(())
}

/// List safety backup files in app_data_dir/backups/, sorted newest first.
/// Returns an empty vec if the backups directory does not exist (normal on
/// first run). This is a read-only, infallible command.
#[tauri::command]
fn list_safety_backups(app: tauri::AppHandle) -> Vec<SafetyBackupEntry> {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return vec![],
    };
    let backups_dir = app_data_dir.join("backups");

    let read_dir = match std::fs::read_dir(&backups_dir) {
        Ok(d) => d,
        Err(_) => return vec![],
    };

    let mut entries: Vec<SafetyBackupEntry> = read_dir
        .filter_map(|e| {
            let e = e.ok()?;
            let name = e.file_name().to_string_lossy().to_string();
            if !name.starts_with("safety-") || !name.ends_with(".zip") {
                return None;
            }

            // Parse timestamp from "safety-YYYY-MM-DD-HHMM.zip"
            let stem = name.strip_prefix("safety-")?.strip_suffix(".zip")?;
            let parts: Vec<&str> = stem.split('-').collect();
            if parts.len() != 4 || parts[3].len() != 4 {
                return None;
            }
            let timestamp = format!(
                "{}-{}-{}T{}:{}:00Z",
                parts[0],
                parts[1],
                parts[2],
                &parts[3][..2],
                &parts[3][2..],
            );

            let size_bytes = e.metadata().ok()?.len();

            Some(SafetyBackupEntry {
                filename: name,
                timestamp,
                size_bytes,
            })
        })
        .collect();

    // Sort newest first (descending by timestamp string — ISO 8601 sorts lexicographically)
    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    entries
}

/// Write raw bytes to a user-chosen path (from save dialog).
/// Restricted to .pdf extension to limit blast radius.
#[tauri::command]
fn write_bytes_to_path(destination: String, bytes: Vec<u8>) -> Result<(), String> {
    let path = std::path::Path::new(&destination);
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("pdf") => {}
        _ => return Err("Only .pdf exports are supported".to_string()),
    }
    std::fs::write(path, &bytes).map_err(|e| format!("write error: {e}"))
}

/// Return the app's expected schema version (migration count).
/// Used by the frontend to compare against a backup manifest's schema_version
/// for restore compatibility checks (RST-04 / RST-05).
#[tauri::command]
fn get_schema_version() -> u32 {
    get_migrations().len() as u32
}

/// Called by the frontend once the UI has loaded successfully.
/// Removes the launch sentinel so the next startup knows this launch was healthy.
#[tauri::command]
fn ack_successful_launch(app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let sentinel = app_data_dir.join(LAUNCH_SENTINEL);
    if sentinel.exists() {
        std::fs::remove_file(&sentinel).map_err(|e| e.to_string())?;
        println!("[hobbyforge] launch sentinel cleared — startup healthy");
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    preflight_webview_heal();
    preflight_migration_repair();

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app_data_dir");
            std::fs::create_dir_all(&app_data_dir).expect("failed to create app_data_dir");
            println!("[hobbyforge] app_data_dir = {}", app_data_dir.display());

            // D-06: Auto-import bundled unit_database.json on first launch or version mismatch.
            // Spawned async so the window appears immediately — block_on here caused
            // the app to hang invisibly when the DB was locked or slow to respond.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match import_unit_database_inner(&handle).await {
                    Ok(result) => {
                        println!("[hobbyforge] udb import: {result:?}");
                        if result.units > 0 {
                            let _ = handle.emit("udb-import-complete", &result);
                        }
                    }
                    Err(e) => eprintln!("[hobbyforge] udb import failed: {e}"),
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:hobbyforge.db", get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            import_unit_database,
            export_backup,
            validate_backup,
            create_safety_backup,
            get_schema_version,
            restore_from_backup,
            list_safety_backups,
            write_bytes_to_path,
            ack_successful_launch,
            factory_reset,
            append_frontend_log, // REL-08: persistent frontend diagnostics log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// EXP-03: BackupManifest serialize/deserialize roundtrip — all 8 fields survive
    #[test]
    fn backup_manifest_serde_roundtrip() {
        let original = BackupManifest {
            app_version: "0.2.7".to_string(),
            schema_version: 28,
            created_at: "2026-05-18T12:00:00Z".to_string(),
            platform: "windows".to_string(),
            db_size_bytes: 1_048_576,
            rules_schema_version: 2,
            includes_rules_db: false,
            notes: Some("Test backup".to_string()),
        };

        let json = serde_json::to_string(&original).expect("serialize failed");
        let deserialized: BackupManifest =
            serde_json::from_str(&json).expect("deserialize failed");

        assert_eq!(deserialized.app_version, original.app_version);
        assert_eq!(deserialized.schema_version, original.schema_version);
        assert_eq!(deserialized.created_at, original.created_at);
        assert_eq!(deserialized.platform, original.platform);
        assert_eq!(deserialized.db_size_bytes, original.db_size_bytes);
        assert_eq!(deserialized.rules_schema_version, original.rules_schema_version);
        assert_eq!(deserialized.includes_rules_db, original.includes_rules_db);
        assert_eq!(deserialized.notes, original.notes);
    }

    /// EXP-03: BackupManifest deserialization tolerates missing optional `notes` field
    #[test]
    fn backup_manifest_serde_without_notes() {
        let json = r#"{"app_version":"0.2.14","schema_version":16,"created_at":"2026-05-18T12:00:00Z","platform":"windows","db_size_bytes":100,"rules_schema_version":2,"includes_rules_db":false}"#;
        let manifest: BackupManifest = serde_json::from_str(json).expect("deserialize failed");
        assert_eq!(manifest.notes, None);
    }

    /// Backwards compatibility: old backups without new fields parse with defaults
    #[test]
    fn backup_manifest_serde_legacy_format() {
        let json = r#"{"app_version":"0.2.13","schema_version":14,"created_at":"2026-05-15T12:00:00Z","platform":"windows","db_size_bytes":500000}"#;
        let manifest: BackupManifest = serde_json::from_str(json).expect("legacy format should parse");
        assert_eq!(manifest.rules_schema_version, 0);
        assert!(!manifest.includes_rules_db);
        assert_eq!(manifest.notes, None);
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
            rules_schema_version: 2,
            includes_rules_db: false,
            notes: None,
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

    /// Simulated-corruption repair: a DB whose _sqlx_migrations holds CRLF-era
    /// (wrong) checksums must be deterministically healed to the LF (current)
    /// checksums by repair_migration_checksums — the exact failure mode that
    /// caused the silent no-window-on-update bug.
    #[test]
    fn repair_heals_crlf_era_checksums() {
        use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions};
        use std::str::FromStr;

        let temp_dir = std::env::temp_dir().join("hobbyforge_test_repair");
        let _ = std::fs::create_dir_all(&temp_dir);
        let db_path = temp_dir.join("corrupt.db");
        let _ = std::fs::remove_file(&db_path);

        let migrations = get_migrations();
        // Pick the first three migrations to corrupt with CRLF-era checksums.
        let sample: Vec<&Migration> = migrations.iter().take(3).collect();

        let rt = tauri::async_runtime::block_on(async {
            let db_url = format!("sqlite:{}", db_path.display());
            let opts = SqliteConnectOptions::from_str(&db_url)
                .unwrap()
                .create_if_missing(true);
            let mut conn = opts.connect().await.unwrap();

            // Build a minimal _sqlx_migrations table matching sqlx's schema shape
            // (only the columns the repair touches need to be correct).
            sqlx::query(
                "CREATE TABLE _sqlx_migrations (\
                    version BIGINT PRIMARY KEY, \
                    description TEXT NOT NULL, \
                    installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, \
                    success BOOLEAN NOT NULL, \
                    checksum BLOB NOT NULL, \
                    execution_time BIGINT NOT NULL)",
            )
            .execute(&mut conn)
            .await
            .unwrap();

            // Insert each sample migration with a CRLF-era checksum (wrong vs LF bytes).
            for m in &sample {
                let crlf_sql = m.sql.replace('\n', "\r\n");
                let crlf_checksum = Vec::from(Sha384::digest(crlf_sql.as_bytes()).as_slice());
                let lf_checksum = Vec::from(Sha384::digest(m.sql.as_bytes()).as_slice());
                // Pre-condition: CRLF checksum must differ from LF checksum, else the
                // file has no newlines and the test would be vacuous.
                assert_ne!(
                    crlf_checksum, lf_checksum,
                    "migration v{} has no newlines; pick a different sample",
                    m.version
                );
                sqlx::query(
                    "INSERT INTO _sqlx_migrations \
                     (version, description, success, checksum, execution_time) \
                     VALUES (?, ?, 1, ?, 0)",
                )
                .bind(m.version)
                .bind(m.description)
                .bind(crlf_checksum.as_slice())
                .execute(&mut conn)
                .await
                .unwrap();
            }

            // Run the repair under test.
            let repaired = repair_migration_checksums(&db_path, &migrations)
                .await
                .expect("repair returned Err");
            assert!(repaired, "repair should report it made changes");

            // Verify every stored checksum now matches the LF (embedded) bytes.
            let rows: Vec<(i64, Vec<u8>)> = sqlx::query_as(
                "SELECT version, checksum FROM _sqlx_migrations ORDER BY version",
            )
            .fetch_all(&mut conn)
            .await
            .unwrap();
            for (version, checksum) in &rows {
                let m = migrations.iter().find(|m| m.version == *version).unwrap();
                let expected = Vec::from(Sha384::digest(m.sql.as_bytes()).as_slice());
                assert_eq!(
                    *checksum, expected,
                    "v{version} checksum not healed to LF bytes"
                );
            }

            // Idempotency: a second run finds nothing to repair.
            let second = repair_migration_checksums(&db_path, &migrations)
                .await
                .expect("second repair returned Err");
            assert!(!second, "second repair should be a no-op (Ok(false))");
        });
        let _ = rt;

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    /// REL-08 / D-10: tail_trim_if_oversized keeps file length <= cap and retains
    /// the NEWEST line, discarding the oldest.
    #[test]
    fn frontend_log_tail_trims_over_cap() {
        let temp_dir = std::env::temp_dir().join("hobbyforge_test_frontend_log");
        let _ = std::fs::create_dir_all(&temp_dir);
        let log_path = temp_dir.join("frontend.log");
        let _ = std::fs::remove_file(&log_path);

        // Write well over the cap: enough old filler lines to exceed 512KB.
        let cap: u64 = 512 * 1024;
        let old_line = "old-line: this is filler content that will be trimmed away eventually\n";
        let repeat_count = ((cap as usize) / old_line.len()) + 100; // exceeds cap
        let mut content = String::with_capacity(repeat_count * old_line.len());
        for _ in 0..repeat_count {
            content.push_str(old_line);
        }
        // Add a uniquely identifiable newest line at the end.
        let newest_line = "newest-line: SENTINEL_THAT_MUST_SURVIVE_TRIM\n";
        content.push_str(newest_line);

        std::fs::write(&log_path, &content).expect("failed to write test log");
        assert!(
            std::fs::metadata(&log_path).unwrap().len() > cap,
            "pre-trim file must exceed cap"
        );

        // tail_trim_if_oversized on a non-existent path is a no-op.
        let nonexistent = temp_dir.join("does_not_exist.log");
        tail_trim_if_oversized(&nonexistent, cap); // must not panic

        // Now trim the actual file.
        tail_trim_if_oversized(&log_path, cap);

        let trimmed = std::fs::read(&log_path).expect("trimmed file must exist");
        assert!(
            trimmed.len() as u64 <= cap,
            "trimmed file length {} exceeds cap {}",
            trimmed.len(),
            cap
        );

        let trimmed_str = std::str::from_utf8(&trimmed).expect("trimmed content must be UTF-8");

        // Newest line must survive.
        assert!(
            trimmed_str.contains("SENTINEL_THAT_MUST_SURVIVE_TRIM"),
            "newest line must be retained after trim"
        );

        // The trimmed content must be much smaller than the original, confirming that
        // a large chunk of oldest lines was dropped.
        assert!(
            trimmed_str.len() < content.len() / 2,
            "trimmed content ({} bytes) should be much smaller than original ({} bytes)",
            trimmed_str.len(),
            content.len()
        );

        // Clean up.
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
