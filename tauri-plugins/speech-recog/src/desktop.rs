use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<SpeechRecog<R>> {
  Ok(SpeechRecog(app.clone()))
}

/// Access to the speech-recog APIs.
pub struct SpeechRecog<R: Runtime>(AppHandle<R>);

impl<R: Runtime> SpeechRecog<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    Ok(PingResponse {
      value: payload.value,
    })
  }

  pub fn is_supported(&self, _payload: IsSupportedRequest) -> crate::Result<IsSupportedResponse> {
    Ok(IsSupportedResponse {
      supported: false,
    })
  }

  pub fn start_recognition(
    &self,
    payload: StartRecognitionRequest,
  ) -> crate::Result<StartRecognitionResponse> {
    Ok(StartRecognitionResponse {
      success: false,
      error: Some("Not supported on desktop".to_string()),
      retry_after: None,
    })
  }

  pub fn stop_recognition(&self, _payload: StopRecognitionRequest) -> crate::Result<StopRecognitionResponse> {
    Ok(StopRecognitionResponse {
      success: false,
      error: Some("Not supported on desktop".to_string()),
    })
  }

  pub fn get_state(
    &self,
    _payload: GetStateRequest,
  ) -> crate::Result<GetStateResponse> {
    Ok(GetStateResponse::default())
  }
}
