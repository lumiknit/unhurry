use std::error::Error;
use std::fmt::Write;

use tauri_plugin_http::reqwest;

#[derive(serde::Serialize)]
struct FetchResult {
    status: u16,
    headers: Vec<(String, String)>,
    body: String,
}

/// Use reqwest, call HTTP
#[tauri::command]
async fn fetch_http(
    method: String,
    url: String,
    headers: Option<Vec<(String, String)>>,
    body: Option<String>,
) -> Result<FetchResult, String> {
    let client = reqwest::Client::builder()
        .http1_only()
        .build()
        .map_err(|e| e.to_string())?;
    let mut request = client.request(
        reqwest::Method::from_bytes(method.as_bytes())
            .map_err(|e| format!("Invalid method: {}", e))?,
        url,
    );

    if let Some(headers) = headers {
        for (key, value) in headers {
            request = request.header(key, value);
        }
    }

    if let Some(body) = body {
        request = request.body(body);
    }

    let response = request.send().await.map_err(|e| {
        let mut s = format!("{}", e);
        if let Some(src) = e.source() {
            let _ = write!(s, "\n\nCaused by: {}", src);
            let mut err = src;
            while let Some(src) = err.source() {
                let _ = write!(s, "\n\nCaused by: {}", src);
                err = src;
            }
        }
        s
    })?;
    let status = response.status();
    let headers = response
        .headers()
        .iter()
        .map(|(key, value)| {
            (
                key.as_str().to_string(),
                value.to_str().unwrap().to_string(),
            )
        })
        .collect::<Vec<(String, String)>>();
    let text = response.text().await.map_err(|e| {
        let mut s = format!("{}", e);
        if let Some(src) = e.source() {
            let _ = write!(s, "\n\nCaused by: {}", src);
            let mut err = src;
            while let Some(src) = err.source() {
                let _ = write!(s, "\n\nCaused by: {}", src);
                err = src;
            }
        }
        s
    })?;
    Ok(FetchResult {
        status: status.as_u16(),
        headers: headers,
        body: text,
    })
}

#[tauri::command]
async fn string_to_qr_svg(input: String) -> Result<String, String> {
    use qrcode::render::svg;
    use qrcode::{EcLevel, QrCode};
    let code = QrCode::with_error_correction_level(input, EcLevel::M)
        .map_err(|e| e.to_string())?;
    let image = code
        .render()
        .min_dimensions(384, 384)
        .dark_color(svg::Color("#000000"))
        .light_color(svg::Color("#ffffff"))
        .build();
    Ok(image)
}

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
#[tauri::command]
async fn self_ip() -> Result<String, String> {
    match local_ip_address::local_ip() {
        Ok(ip) => {
            Ok(ip.to_string())
        }
        Err(e) => Err(e.to_string()),
    }
}

// self_ip is only supported for desktop platforms

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
#[tauri::command]
async fn self_ip() -> Result<String, String> {
    Err("self_ip is not supported on this platform".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_upload::init());

    // Platform-specific plugins

    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    let builder = builder.plugin(tauri_plugin_window_state::Builder::new().build());

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    let builder = builder.plugin(tauri_plugin_barcode_scanner::init());

    // Rest of the plugins

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_speech_recog::init())
        .invoke_handler(tauri::generate_handler![fetch_http, self_ip, string_to_qr_svg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
