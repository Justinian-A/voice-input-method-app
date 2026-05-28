// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::process::Command;
use std::path::PathBuf;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 获取Python命令名（跨平台兼容）
fn get_python_command() -> String {
    if cfg!(target_os = "windows") {
        "python".to_string()
    } else {
        "python3".to_string()
    }
}

// 获取Python脚本路径
fn get_python_script_path() -> PathBuf {
    // 优先使用当前目录
    let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    path.push("python");
    path.push("offline_asr.py");
    
    if path.exists() {
        return path;
    }
    
    // 回退到可执行文件所在目录
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let mut path = exe_dir.to_path_buf();
            path.push("python");
            path.push("offline_asr.py");
            if path.exists() {
                return path;
            }
        }
    }
    
    // 返回默认路径
    PathBuf::from("python").join("offline_asr.py")
}

// 检查离线识别环境
#[tauri::command]
async fn check_offline_asr_environment() -> Result<bool, String> {
    let script_path = get_python_script_path();
    
    // 检查脚本是否存在
    if !script_path.exists() {
        return Err(format!("Python脚本不存在: {:?}", script_path));
    }
    
    // 检查Python环境
    let python_cmd = get_python_command();
    let output = Command::new(&python_cmd)
        .args(["--version"])
        .output()
        .map_err(|e| format!("无法执行Python: {}", e))?;
    
    if !output.status.success() {
        return Err("Python未安装或不可用".to_string());
    }
    
    // 检查faster-whisper依赖
    let output = Command::new(&python_cmd)
        .args(["-c", "import faster_whisper; print('OK')"])
        .output()
        .map_err(|e| format!("无法检查依赖: {}", e))?;
    
    if !output.status.success() {
        return Err("faster-whisper未安装，请运行: pip install faster-whisper".to_string());
    }
    
    Ok(true)
}

// 离线识别音频数据
#[tauri::command]
async fn offline_transcribe(
    audio_data: Vec<f32>,
    model_size: String,
    device: String,
    language: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    let script_path = get_python_script_path();
    
    // 构建命令参数
    let mut args = vec![
        script_path.to_str().unwrap().to_string(),
        "--model".to_string(),
        model_size,
        "--device".to_string(),
        device,
    ];
    
    if let Some(lang) = language {
        args.push("--language".to_string());
        args.push(lang);
    }
    
    // 将音频数据转换为字节
    let _audio_bytes: Vec<u8> = audio_data
        .iter()
        .flat_map(|f| f.to_le_bytes())
        .collect();
    
    // 执行Python脚本
    let python_cmd = get_python_command();
    let output = Command::new(&python_cmd)
        .args(&args)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("无法启动Python脚本: {}", e))?
        .wait_with_output()
        .map_err(|e| format!("执行失败: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("识别失败: {}", stderr));
    }
    
    // 解析结果
    let stdout = String::from_utf8_lossy(&output.stdout);
    let results: Vec<serde_json::Value> = serde_json::from_str(&stdout)
        .map_err(|e| format!("解析结果失败: {}", e))?;
    
    Ok(results)
}

// 离线识别音频文件
#[tauri::command]
async fn offline_transcribe_file(
    file_path: String,
    model_size: String,
    device: String,
    language: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    let script_path = get_python_script_path();
    
    // 构建命令参数
    let mut args = vec![
        script_path.to_str().unwrap().to_string(),
        "--model".to_string(),
        model_size,
        "--device".to_string(),
        device,
        "--file".to_string(),
        file_path,
    ];
    
    if let Some(lang) = language {
        args.push("--language".to_string());
        args.push(lang);
    }
    
    // 执行Python脚本
    let python_cmd = get_python_command();
    let output = Command::new(&python_cmd)
        .args(&args)
        .output()
        .map_err(|e| format!("无法执行Python脚本: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("识别失败: {}", stderr));
    }
    
    // 解析结果
    let stdout = String::from_utf8_lossy(&output.stdout);
    let results: Vec<serde_json::Value> = serde_json::from_str(&stdout)
        .map_err(|e| format!("解析结果失败: {}", e))?;
    
    Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_offline_asr_environment,
            offline_transcribe,
            offline_transcribe_file
        ])
        .setup(|app| {
            // 创建系统托盘菜单
            let show = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
            let hide = MenuItemBuilder::with_id("hide", "隐藏窗口").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
            
            let menu = MenuBuilder::new(app)
                .items(&[&show, &hide, &quit])
                .build()?;
            
            // 创建系统托盘图标
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("语音输入法")
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(webview_window) = app.get_webview_window("main") {
                            let _ = webview_window.unminimize();
                            let _ = webview_window.show();
                            let _ = webview_window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(webview_window) = app.get_webview_window("main") {
                            let _ = webview_window.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => (),
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(webview_window) = app.get_webview_window("main") {
                            let _ = webview_window.unminimize();
                            let _ = webview_window.show();
                            let _ = webview_window.set_focus();
                        }
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}