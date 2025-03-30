use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::SpeechRecog;
#[cfg(mobile)]
use mobile::SpeechRecog;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the speech-recog APIs.
pub trait SpeechRecogExt<R: Runtime> {
  fn speech_recog(&self) -> &SpeechRecog<R>;
}

impl<R: Runtime, T: Manager<R>> crate::SpeechRecogExt<R> for T {
  fn speech_recog(&self) -> &SpeechRecog<R> {
    self.state::<SpeechRecog<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("speech-recog")
    .invoke_handler(tauri::generate_handler![
      commands::ping,
      commands::is_supported,
      commands::start_recognition,
      commands::stop_recognition,
      commands::get_state,
      ])
    .setup(|app, api| {
      #[cfg(mobile)]
      let speech_recog = mobile::init(app, api)?;
      #[cfg(desktop)]
      let speech_recog = desktop::init(app, api)?;
      app.manage(speech_recog);
      Ok(())
    })
    .build()
}
