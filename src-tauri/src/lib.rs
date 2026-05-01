use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

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
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // SETUP-07 + Pitfall 3: ensure %APPDATA%\com.hobbyforge.app\ exists
            // before tauri-plugin-sql tries to open hobbyforge.db inside it.
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app_data_dir");
            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app_data_dir");
            println!("[hobbyforge] app_data_dir = {}", app_data_dir.display());
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:hobbyforge.db", get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
