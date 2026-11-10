use std::{fs,path::PathBuf,sync::Mutex};
use serde::Serialize;
use tauri::{AppHandle,Emitter,Manager,State};
use tauri_plugin_shell::{process::{CommandChild,CommandEvent},ShellExt};

struct Active { pid:u32, child:CommandChild }
#[derive(Default)]
struct Transfers { send:Mutex<Option<Active>>, receive:Mutex<Option<Active>> }
#[derive(Clone,Serialize)]
struct Update { mode:&'static str, kind:&'static str, message:String, ticket:Option<String> }
fn emit(app:&AppHandle,mode:&'static str,kind:&'static str,message:String,ticket:Option<String>) {
 let _=app.emit("hubshare-update",Update{mode,kind,message,ticket});
}
#[tauri::command]
fn send(app:AppHandle,state:State<'_,Transfers>,path:String)->Result<(),String>{
 let p=PathBuf::from(&path);
 if !p.is_file()&&!p.is_dir(){return Err("Choose an existing file or directory".into())}
 let mut g=state.send.lock().map_err(|e|e.to_string())?;
 if g.is_some(){return Err("Already sharing; stop first".into())}
 let cache=app.path().app_cache_dir().map_err(|e|e.to_string())?;
 fs::create_dir_all(&cache).map_err(|e|e.to_string())?;
 let (mut events,child)=app.shell().sidecar("sendme").map_err(|e|e.to_string())?
  .args(["send",path.as_str(),"--no-progress"]).current_dir(cache).kill_on_drop(true).spawn().map_err(|e|e.to_string())?;
 let pid=child.pid();*g=Some(Active{pid,child});drop(g);
 let app2=app.clone();
 tauri::async_runtime::spawn(async move {
  while let Some(event)=events.recv().await {
   match event {
    CommandEvent::Stdout(b)|CommandEvent::Stderr(b)=>{
     let msg=String::from_utf8_lossy(&b).trim().to_string();
     if msg.is_empty(){continue}
     let ticket=msg.split("sendme receive ").nth(1).and_then(|s|s.split_whitespace().next())
       .filter(|s|s.starts_with("blob")).map(str::to_string);
     emit(&app2,"send","info",msg,ticket);
    }
    CommandEvent::Error(e)=>emit(&app2,"send","error",e,None),
    CommandEvent::Terminated(_)=>{emit(&app2,"send","done","Share session ended".into(),None);break}
    _=>{}
   }
  }
  let state=app2.state::<Transfers>();
  if let Ok(mut g)=state.send.lock(){if g.as_ref().map(|x|x.pid)==Some(pid){g.take();}}
 });
 Ok(())
}
#[tauri::command]
fn receive(app:AppHandle,state:State<'_,Transfers>,ticket:String,destination:String)->Result<(),String>{
 if ticket.len()>16384 || !ticket.starts_with("blob") || !ticket.chars().all(|c|c.is_ascii_alphanumeric()){
  return Err("Invalid sharing ticket".into())
 }
 if !PathBuf::from(&destination).is_dir(){return Err("Choose a destination folder".into())}
 let mut g=state.receive.lock().map_err(|e|e.to_string())?;
 if g.is_some(){return Err("Another download is running".into())}
 let (mut events,child)=app.shell().sidecar("sendme").map_err(|e|e.to_string())?
  .args(["receive",ticket.as_str(),"--no-progress"]).current_dir(destination).kill_on_drop(true).spawn().map_err(|e|e.to_string())?;
 let pid=child.pid();*g=Some(Active{pid,child});drop(g);
 let app2=app.clone();
 tauri::async_runtime::spawn(async move {
  while let Some(event)=events.recv().await{
   match event {
    CommandEvent::Stdout(b)|CommandEvent::Stderr(b)=>{
     let msg=String::from_utf8_lossy(&b).trim().to_string();
     if !msg.is_empty(){emit(&app2,"receive","info",msg,None)}
    }
    CommandEvent::Error(e)=>emit(&app2,"receive","error",e,None),
    CommandEvent::Terminated(p)=>{
     let ok=p.code==Some(0);
     emit(&app2,"receive",if ok{"done"}else{"error"},
      if ok{"Download completed".into()}else{format!("Download stopped: {:?}",p.code)},None);break
    }
    _=>{}
   }
  }
  let state=app2.state::<Transfers>();
  if let Ok(mut g)=state.receive.lock(){if g.as_ref().map(|x|x.pid)==Some(pid){g.take();}}
 });
 Ok(())
}
#[tauri::command]
fn stop(state:State<'_,Transfers>,mode:String)->Result<(),String>{
 let lock=match mode.as_str(){"send"=>&state.send,"receive"=>&state.receive,_=>return Err("Invalid mode".into())};
 if let Some(p)=lock.lock().map_err(|e|e.to_string())?.take(){p.child.kill().map_err(|e|e.to_string())?;}
 Ok(())
}
#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){
 tauri::Builder::default().plugin(tauri_plugin_shell::init()).plugin(tauri_plugin_dialog::init())
 .plugin(tauri_plugin_clipboard_manager::init()).manage(Transfers::default())
 .invoke_handler(tauri::generate_handler![send,receive,stop])
 .run(tauri::generate_context!()).expect("HubShare failed")
}
