mod commands;

use std::sync::Arc;

use credential_store::CredentialStore;
use persistence_sqlite::{AssetRepository, SettingsRepository, StorageGroupRepository, StorageRepository, TaskRepository, WorkflowRepository};
use tauri::Manager;
use task_engine::TaskEngine;

#[derive(Clone)]
pub struct AppState {
    pub storages: StorageRepository,
    pub assets: AssetRepository,
    pub settings: SettingsRepository,
    pub groups: StorageGroupRepository,
    pub workflows: WorkflowRepository,
    pub tasks: TaskEngine,
    pub credentials: CredentialStore,
    pub upload_semaphore: Arc<tokio::sync::Semaphore>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("publisher.sqlite3");
            let pool = tauri::async_runtime::block_on(persistence_sqlite::connect_path(&db_path))
                .map_err(|error| std::io::Error::other(error.to_string()))?;
            tauri::async_runtime::block_on(persistence_sqlite::migrate(&pool))
                .map_err(|error| std::io::Error::other(error.to_string()))?;
            let task_repo = TaskRepository::new(pool.clone());
            tauri::async_runtime::block_on(task_repo.recover_interrupted())
                .map_err(|error| std::io::Error::other(error.to_string()))?;
            app.manage(AppState {
                storages: StorageRepository::new(pool.clone()),
                assets: AssetRepository::new(pool.clone()),
                settings: SettingsRepository::new(pool.clone()),
                groups: StorageGroupRepository::new(pool.clone()),
                workflows: WorkflowRepository::new(pool),
                tasks: TaskEngine::new(task_repo),
                credentials: CredentialStore::new("com.multicloud.publisher"),
                upload_semaphore: Arc::new(tokio::sync::Semaphore::new(4)),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap_snapshot,
            commands::create_s3_storage,
            commands::create_object_storage,
            commands::create_webdav_storage,
            commands::create_repository_storage,
            commands::list_storages,
            commands::delete_storage,
            commands::test_storage,
            commands::browse_storage,
            commands::create_storage_group,
            commands::list_storage_groups,
            commands::delete_storage_group,
            commands::list_recipes,
            commands::create_workflow_from_recipe,
            commands::create_custom_workflow,
            commands::list_workflows,
            commands::set_default_workflow,
            commands::delete_workflow,
            commands::publish_files_with_workflow,
            commands::publish_urls_with_workflow,
            commands::publish_clipboard_image_with_workflow,
            commands::publish_files_to_group,
            commands::publish_files,
            commands::repair_asset,
            commands::delete_asset,
            commands::get_output_preferences,
            commands::save_output_preferences,
            commands::list_tasks,
            commands::list_assets,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Multi-cloud Publisher");
}
