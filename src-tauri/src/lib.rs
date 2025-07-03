/// Wrap the input string into a QR code and return the SVG representation of it.
#[tauri::command]
async fn string_to_qr_svg(input: String) -> Result<String, String> {
    use qrcode::render::svg;
    use qrcode::{EcLevel, QrCode};
    let code = QrCode::with_error_correction_level(input, EcLevel::M).map_err(|e| e.to_string())?;
    let image = code
        .render()
        .min_dimensions(384, 384)
        .dark_color(svg::Color("#000000"))
        .light_color(svg::Color("#ffffff"))
        .build();
    Ok(image)
}

/// Get the local IP address of the device.
/// This is only supported on desktop platforms (Windows, Linux, macOS).
#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
#[tauri::command]
async fn self_ip() -> Result<String, String> {
    match local_ip_address::local_ip() {
        Ok(ip) => Ok(ip.to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Get the local IP address of the device.
/// This is not supported on mobile platforms (Android, iOS).
#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
#[tauri::command]
async fn self_ip() -> Result<String, String> {
    Err("self_ip is not supported on this platform".to_string())
}

/// Return the platform type.
/// "desktop", "android", "ios", "web"
#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
#[tauri::command]
async fn platform() -> Result<String, String> {
    Ok("desktop".to_string())
}

/// Return the platform type.
/// "desktop", "android", "ios", "web"
#[cfg(target_os = "android")]
#[tauri::command]
async fn platform() -> Result<String, String> {
    Ok("android".to_string())
}

/// Return the platform type.
/// "desktop", "android", "ios", "web"
#[cfg(target_os = "ios")]
#[tauri::command]
async fn platform() -> Result<String, String> {
    Ok("ios".to_string())
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
        .invoke_handler(tauri::generate_handler![
            platform,
            self_ip,
            string_to_qr_svg
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
