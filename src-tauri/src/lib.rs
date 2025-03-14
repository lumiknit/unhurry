// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

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
    let client = reqwest::Client::new();
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

    let response = request.send().await.map_err(|e| format!("Request failed: {}", e))?;
    let status = response.status();
    let headers = response
        .headers()
        .iter()
        .map(|(key, value)| (key.as_str().to_string(), value.to_str().unwrap().to_string()))
        .collect::<Vec<(String, String)>>();
    let text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
    Ok(FetchResult {
        status: status.as_u16(),
        headers: headers,
        body: text,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, fetch_http])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
