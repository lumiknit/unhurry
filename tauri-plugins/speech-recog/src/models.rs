use serde::{Deserialize, Serialize};

// Define the request and response types for the ping endpoint

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingRequest {
  pub value: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResponse {
  pub value: Option<String>,
}

// IsSupported

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IsSupportedRequest {
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IsSupportedResponse {
  pub supported: bool,
}

// StartRecognition

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRecognitionRequest {
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartRecognitionResponse {
  pub success: bool,

  /// Failed to start recognition.
  pub error: Option<String>,

  /// Error may be fixed by retrying.
  pub retry_after: Option<bool>,
}

// StartRecognition

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StopRecognitionRequest {
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StopRecognitionResponse {
  pub success: bool,
  pub error: Option<String>,
}
// GetRecognizedResult

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetStateRequest {
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetStateResponse {
  /// True if the recognizer is running.
  pub recognizing: bool,

  pub timestamp_ms: u64,

  pub completed_text: String,

  pub partial_text: String,

  /// Errors that occurred during recognition.
  pub errors: Vec<String>,
}
