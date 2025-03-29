use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::SpeechRecogExt;

#[command]
pub(crate) async fn ping<R: Runtime>(
    app: AppHandle<R>,
    payload: PingRequest,
) -> Result<PingResponse> {
    app.speech_recog().ping(payload)
}

#[command]
pub(crate) async fn is_supported<R: Runtime>(
    app: AppHandle<R>,
    payload: IsSupportedRequest,
) -> Result<IsSupportedResponse> {
    app.speech_recog().is_supported(payload)
}

#[command]
pub(crate) async fn start_recognition<R: Runtime>(
    app: AppHandle<R>,
    payload: StartRecognitionRequest,
) -> Result<StartRecognitionResponse> {
    app.speech_recog().start_recognition(payload)
}

#[command]
pub(crate) async fn stop_recognition<R: Runtime>(
    app: AppHandle<R>,
    payload: StopRecognitionRequest,
) -> Result<StopRecognitionResponse> {
    app.speech_recog().stop_recognition(payload)
}

#[command]
pub(crate) async fn get_state<R: Runtime>(
    app: AppHandle<R>,
    payload: GetStateRequest,
) -> Result<GetStateResponse> {
    app.speech_recog().get_state(payload)
}
