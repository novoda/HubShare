import {useEffect,useState,type FormEvent} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {open} from '@tauri-apps/plugin-dialog';
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import {onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,type User} from 'firebase/auth';
import {auth,configured} from './firebase';
type Mode='send'|'receive';
type Update={mode:Mode,kind:'info'|'done'|'error',message:string,ticket?:string|null};
export default function App(){
 const [user,setUser]=useState<User|null>(null),[checking,setChecking]=useState(true);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[register,setRegister]=useState(false);
 const [mode,setMode]=useState<Mode>('send'),[path,setPath]=useState(''),[destination,setDestination]=useState('');
 const [ticket,setTicket]=useState(''),[receivedTicket,setReceivedTicket]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!auth){setChecking(false);return}return onAuthStateChanged(auth,u=>{setUser(u);setChecking(false)})},[]);
 useEffect(()=>{let unlisten:(()=>void)|undefined;listen<Update>('hubshare-update',e=>{
  const p=e.payload;
  if(p.mode!==mode)return;
  if(p.ticket){setTicket(p.ticket);setBusy(true)}
  if(p.kind==='error'){setBusy(false);setMessage(p.message)}
  if(p.kind==='done'){setBusy(false);setMessage(p.message);if(p.mode==='send')setTicket('')}
  if(p.kind==='info'&&!p.ticket)setMessage(p.message);
 }).then(fn=>{unlisten=fn});return()=>unlisten?.()},[mode]);
 async function login(e:FormEvent){e.preventDefault();if(!auth)return;setMessage('');setBusy(true);try{
  const result=register?await createUserWithEmailAndPassword(auth,email,password):await signInWithEmailAndPassword(auth,email,password);
  setUser(result.user);
 }catch(e){setMessage(String(e))}finally{setBusy(false)}}
 async function pick(folder:boolean){const p=await open({directory:folder,multiple:false});if(typeof p==='string'){setPath(p);setTicket('')}}
 async function downloadTo(){const p=await open({directory:true,multiple:false});if(typeof p==='string')setDestination(p)}
 async function start(){setMessage('');setBusy(true);try{
  if(mode==='send')await invoke('send',{path});
  else await invoke('receive',{ticket:receivedTicket.trim(),destination});
 }catch(e){setBusy(false);setMessage(String(e))}}
 async function cancel(){try{await invoke('stop',{mode});setBusy(false);setTicket('');setMessage('Stopped')}catch(e){setMessage(String(e))}}
 return <main className="shell"><header><div className="brand"><span className="logo">↗</span> Hub<span>Share</span></div><span className="pill">Windows preview</span></header>
 <section className="intro"><p className="eyebrow">FAST. DIRECT. PRIVATE.</p><h1>Share anything.<br/><em>With anyone.</em></h1><p>Send files directly between devices with Iroh.</p></section>
 {checking?<section className="panel">Loading...</section>:!user?<section className="panel auth">
  <h2>{register?'Create your account':'Sign in to HubShare'}</h2>
  {!configured?<p className="warn">Firebase configuration is missing. Add GitHub Actions variables and rebuild to enable login.</p>:<form onSubmit={login}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy}>{busy?'Working...':register?'Create account':'Sign in'}</button></form>}
  <button className="secondary" onClick={()=>setRegister(!register)}>{register?'Already have an account? Sign in':'Create an account'}</button>
 </section>:<><nav><span>{user.email}</span><button className="small" onClick={async()=>{await invoke('stop',{mode}).catch(()=>{});if(auth)await signOut(auth)}}>Sign out</button></nav>
 <div className="tabs"><button className={mode==='send'?'chosen':''} onClick={()=>{setMode('send');setMessage('')}}>↑ Send files</button><button className={mode==='receive'?'chosen':''} onClick={()=>{setMode('receive');setMessage('')}}>↓ Receive files</button></div>
 <section className="panel"><h2>{mode==='send'?'Send a file or folder':'Receive files'}</h2>
 {mode==='send'?<><p>Choose what you'd like to share.</p><div className="file">{path||'No file selected'}</div><div className="buttons"><button className="secondary" disabled={busy} onClick={()=>pick(false)}>Choose file</button><button className="secondary" disabled={busy} onClick={()=>pick(true)}>Choose folder</button></div>
 {ticket&&<div className="ticket"><strong>Sharing ticket</strong><p>Anyone with this ticket can download the file while sharing is active.</p><textarea readOnly value={ticket}/><button className="secondary" onClick={()=>writeText(ticket)}>Copy ticket</button></div>}
 </>:<><p>Paste a ticket sent by another HubShare user.</p><label>Sharing ticket<textarea value={receivedTicket} onChange={e=>setReceivedTicket(e.target.value)} placeholder="blob..."/></label><div className="file">{destination||'Choose download folder'}</div><button className="secondary" disabled={busy} onClick={downloadTo}>Choose destination</button></>}
 <div className="buttons bottom">{busy?<button className="secondary danger" onClick={cancel}>Stop transfer</button>:<button disabled={mode==='send'?!path:!destination||!receivedTicket.trim()} onClick={start}>{mode==='send'?'Generate sharing ticket':'Receive files'}</button>}</div>
 {message&&<p className="status">{message}</p>}
 </section></>}
 {!user&&message&&<p className="status">{message}</p>}
 <footer>Iroh-powered transfers · Firebase account login · v0.1</footer></main>
}
