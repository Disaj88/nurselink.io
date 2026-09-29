"use strict";
var NAMES=["1 Nurse (offline)","2 Reconnect + Generalized Physician alert","3 Generalized Physician picks panel","4 Specialists + merge","5 Patient summary + cost","6 SMS fallback"];
var SPEC={Endocrinology:{note:"HbA1c and fasting sugar are high. Screen for kidney and eye damage from diabetes.",tests:[["HbA1c",1800],["Urine ACR",1600]]},
Cardiology:{note:"BP is well above target with high sugar. Check heart function and cholesterol.",tests:[["ECG + Echo",9500],["Lipid profile",2200]]},
Nephrology:{note:"Check kidney function.",tests:[["Creatinine / eGFR",1400]]},
Ophthalmology:{note:"Retinal screen for diabetic changes.",tests:[["Retinal photo",3500]]}};
var LS="nurselink_demo_v3";
function fresh(){return{cp:{name:"",dob:"",sex:"",phone:"",addr:"",smart:true,anon:true,nda:false,level:"Essential",lang:"en",saved:false},auth:null,home:true,step:0,online:false,queue:[],server:[],alerts:[],picked:{Endocrinology:true,Cardiology:true,Nephrology:false,Ophthalmology:false},sent:false,notes:{},done:{},rec:null,lang:"en",sel:{},approved:false,smsLang:"en",smsReply:null,v:{sys:172,dia:104,hr:88,sug:246,wt:82,spo:96}}}
var s=fresh();
try{var raw=localStorage.getItem(LS);if(raw){var p=JSON.parse(raw);if(p&&typeof p.step==="number")s=p}}catch(e){}
function save(){try{localStorage.setItem(LS,JSON.stringify(s))}catch(e){}}
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function $(id){return document.getElementById(id)}
function money(n){return "Rs. "+Number(n).toLocaleString("en-US")}
/* ---- simulated backend ---- */
function triage(v){if(v.sys>=180||v.dia>=120||v.sug>=300||v.spo<92)return"critical";if(v.sys>=140||v.dia>=90||v.sug>=126)return"elevated";return"normal"}
function serverReceive(rec){s.server.push(rec);s.alerts.push({id:rec.id,level:rec.level,text:"New vitals for Client #0142 (anonymous ID). BP "+rec.v.sys+"/"+rec.v.dia+", sugar "+rec.v.sug+" mg/dL."})}
function flush(){var q=s.queue.slice();s.queue=[];q.forEach(function(r){r.status="synced";serverReceive(r)});save()}
/* ---- actions ---- */
function readVitals(){var k=["sys","dia","hr","sug","wt","spo"],o={};
 for(var i=0;i<k.length;i++){var n=Number($(k[i]).value);if(!isFinite(n)||n<=0)return null;o[k[i]]=n}
 if(o.sys<=o.dia||o.spo>100)return null;return o}
function saveVitals(){var v=readVitals();if(!v){alert("Please enter valid vitals (systolic must exceed diastolic, SpO2 ≤ 100).");return}
 s.v=v;var r={id:"rec-"+Date.now(),v:v,level:triage(v),status:s.online?"synced":"pending"};
 if(s.online){serverReceive(r)}else{s.queue.push(r)}save();render()}
function toggleNet(){s.online=!s.online;if(s.online)flush();save();render()}
function pick(n,c){s.picked[n]=c;save()}
function sendPanel(){var ns=Object.keys(s.picked).filter(function(k){return s.picked[k]});if(!ns.length){alert("Select at least one specialist.");return}
 s.sent=true;ns.forEach(function(n){if(s.notes[n]===undefined)s.notes[n]=SPEC[n].note});save();render()}
function submitSpec(n){var t=$("n-"+n).value.trim();if(!t){alert("Enter notes first.");return}s.notes[n]=t;s.done[n]=true;save();render()}
function mergeRec(){var tests=[],notes=[];Object.keys(s.done).forEach(function(n){if(s.done[n]&&s.picked[n]){notes.push(n+": "+s.notes[n]);SPEC[n].tests.forEach(function(t){tests.push({n:t[0],c:t[1],by:n})})}});
 s.rec={tests:tests,notes:notes,gp:"Dr. Generalized Physician (owner of final recommendation)"};s.sel={};tests.forEach(function(t){s.sel[t.n]=true});save();render()}
function toggleTest(n,c){s.sel[n]=c;save();renderCost()}
function total(){return s.rec?s.rec.tests.reduce(function(a,t){return a+(s.sel[t.n]?t.c:0)},0):0}
function approve(){if(!total()){alert("Select at least one test.");return}s.approved=true;save();render()}
function smsReply(x){s.smsReply=x;save();render()}
function setLang(l){s.lang=l;save();render()}function setSms(l){s.smsLang=l;save();render()}
function go(d){var n=s.step+d;if(n<0||n>5)return;if(d>0&&!ok(s.step))return;s.step=n;save();render();window.scrollTo(0,0)}
function ok(i){return i===0?(s.queue.length>0||s.server.length>0):i===1?s.server.length>0:i===2?s.sent:i===3?!!s.rec:i===4?s.approved:true}
function resetAll(){var a=s.auth;s=fresh();s.auth=a;s.home=false;save();render()}
/* ---- views ---- */
function lvl(l){return'<span class="badge '+(l==="critical"?"e":l==="elevated"?"w":"o")+'">'+l.toUpperCase()+"</span>"}
function v1(){var inp=[["sys","Systolic BP"],["dia","Diastolic BP"],["hr","Heart rate"],["sug","Sugar mg/dL"],["wt","Weight kg"],["spo","SpO2 %"]].map(function(a){return'<div><label>'+a[1]+'<input type="number" id="'+a[0]+'" value="'+s.v[a[0]]+'"></label></div>'}).join("");
 var st=s.queue.length?'<p><span class="badge w">Saved Offline / Pending Sync</span> <span class="sub">'+s.queue.length+" record(s) queued on this device</span></p>":(s.server.length?'<p><span class="badge o">Synced</span></p>':"");
 return'<div class="card"><h2>Nurse view – baseline visit</h2><div class="bar"><span class="badge '+(s.online?"o":"e")+'">'+(s.online?"ONLINE":"OFFLINE")+'</span><span class="sub">Client #0142 · anonymous mode · home visit</span><span class="sp"></span><button class="g" onclick="toggleNet()">Turn network '+(s.online?"off":"on")+'</button></div><div class="grid" style="margin:10px 0">'+inp+'</div><button onclick="saveVitals()">Save vitals</button>'+st+'<p class="sub">Tip: keep network off to see the offline queue, then go to step 2.</p></div>'}
function v2(){var pend=s.queue.length;
 var al=s.alerts.map(function(a){return'<div class="card" style="border-color:var(--'+(a.level==="critical"?"er":"wa")+')"><b>Generalized Physician dashboard alert</b> '+lvl(a.level)+'<p>'+esc(a.text)+'</p></div>'}).join("");
 return'<div class="card"><h2>Network reconnect</h2><div class="bar"><span class="badge '+(s.online?"o":"e")+'">'+(s.online?"ONLINE":"OFFLINE")+'</span><span>'+(pend?pend+" pending record(s) waiting":"Queue empty")+'</span><span class="sp"></span><button onclick="toggleNet()" '+(s.online?"disabled":"")+'>Reconnect &amp; sync</button></div></div>'+(al||'<p class="sub">Alerts appear here after sync.</p>')}
function v3(){var last=s.server[s.server.length-1];
 var rows=Object.keys(SPEC).map(function(n){return'<label class="chk"><input type="checkbox" '+(s.picked[n]?"checked":"")+(s.sent?" disabled":"")+' onchange="pick(\''+n+'\',this.checked)"> '+n+"</label>"}).join("");
 return'<div class="card"><h2>Generalized Physician view – review and choose panel</h2>'+(last?'<p>Latest: BP '+last.v.sys+'/'+last.v.dia+', HR '+last.v.hr+', sugar '+last.v.sug+', SpO2 '+last.v.spo+'% '+lvl(last.level)+'</p>':"")+'<p class="sub">Suggested: Endocrinology and Cardiology (high sugar with high BP).</p>'+rows+'<button onclick="sendPanel()" '+(s.sent?"disabled":"")+'>'+(s.sent?"Sent to panel ✓":"Send to selected specialists")+'</button></div>'}
function v4(){if(!s.sent)return'<div class="card">Go back and send the case to specialists.</div>';
 var ns=Object.keys(s.picked).filter(function(k){return s.picked[k]});
 var sp=ns.map(function(n){return'<div class="card"><h2>Specialist view – '+n+'</h2><textarea id="n-'+n+'" rows="3" '+(s.done[n]?"disabled":"")+'>'+esc(s.notes[n]||"")+'</textarea><p><button onclick="submitSpec(\''+n+'\')" '+(s.done[n]?"disabled":"")+'>'+(s.done[n]?"Submitted ✓":"Submit notes")+'</button></p></div>'}).join("");
 var all=ns.every(function(n){return s.done[n]});
 var m='<div class="card"><h2>Generalized Physician – merge</h2><button onclick="mergeRec()" '+(all?"":"disabled")+'>Merge into One Final Recommendation</button>';
 if(s.rec){m+='<p><b>One Final Recommendation</b></p><ul>'+s.rec.notes.map(function(x){return"<li>"+esc(x)+"</li>"}).join("")+'</ul><p>Tests (one bundled visit): '+s.rec.tests.map(function(t){return esc(t.n)}).join(", ")+'</p>'}
 return sp+m+'</div>'}
var TXT={en:["Your plan","Your sugar and blood pressure are high. The doctors recommend the tests below in one bundled visit. Nothing is booked until you approve."],
si:["ඔබේ සැලැස්ම","ඔබේ සීනි සහ රුධිර පීඩනය ඉහළයි. වෛද්‍යවරු පහත පරීක්ෂණ එක් වරක් සිදු කිරීමට නිර්දේශ කරයි. ඔබ අනුමත කරන තෙක් කිසිවක් වෙන්කරන්නේ නැත."],
ta:["உங்கள் திட்டம்","உங்கள் சர்க்கரை மற்றும் இரத்த அழுத்தம் அதிகம். மருத்துவர்கள் கீழ்க்காணும் பரிசோதனைகளை ஒரே முறையில் செய்ய பரிந்துரைக்கிறார்கள். நீங்கள் ஒப்புதல் தரும் வரை எதுவும் பதிவு செய்யப்படாது."]};
function costHtml(){if(!s.rec)return"";return'<div class="sc"><table><tr><th></th><th>Test</th><th class="r">Cost</th></tr>'+s.rec.tests.map(function(t){return'<tr><td><input type="checkbox" '+(s.sel[t.n]?"checked":"")+(s.approved?" disabled":"")+' onchange="toggleTest(\''+t.n.replace(/'/g,"")+'\',this.checked)"></td><td>'+esc(t.n)+' <span class="sub">('+t.by+')</span></td><td class="r">'+money(t.c)+"</td></tr>"}).join("")+'<tr><th></th><th>Total (estimate)</th><th class="r" id="tot">'+money(total())+"</th></tr></table></div>"}
function renderCost(){var t=$("tot");if(t)t.textContent=money(total())}
function v5(){if(!s.rec)return'<div class="card">Merge the recommendation first.</div>';var t=TXT[s.lang];
 var tabs=[["en","English"],["si","සිංහල"],["ta","தமிழ்"]].map(function(a){return'<button class="'+(s.lang===a[0]?"":"g")+'" onclick="setLang(\''+a[0]+'\')">'+a[1]+"</button>"}).join("");
 return'<div class="card"><h2>Patient / nurse view</h2><div class="tabs">'+tabs+'</div><p><b>'+t[0]+'</b></p><p>'+t[1]+'</p>'+costHtml()+'<p class="sub">Membership covers panel review. Tests, medicines and treatment are billed separately and only after approval.</p><button onclick="approve()" '+(s.approved?"disabled":"")+'>'+(s.approved?"Approved ✓":"Approve this estimate")+'</button></div>'}
function smsText(l){var T=money(total());return{en:"NurseLink: Your test plan is ready. Estimate "+T+". Reply 1 to approve, 2 for a nurse call.",si:"NurseLink: ඔබේ පරීක්ෂණ සැලැස්ම සූදානම්. ඇස්තමේන්තුව "+T+". අනුමත කිරීමට 1 යවන්න; නර්සට අමතන්න 2.",ta:"NurseLink: உங்கள் பரிசோதனைத் திட்டம் தயார். மதிப்பீடு "+T+". ஒப்புதலுக்கு 1 அனுப்பவும்; செவிலியர் அழைப்புக்கு 2."}[l]}
function v6(){var tx=smsText(s.smsLang),uni=/[^\x00-\x7F]/.test(tx),len=tx.length,segs=Math.ceil(len/(uni?(len>70?67:70):(len>160?153:160)));
 var tabs=[["en","English"],["si","සිංහල"],["ta","தமிழ்"]].map(function(a){return'<button class="'+(s.smsLang===a[0]?"":"g")+'" onclick="setSms(\''+a[0]+'\')">'+a[1]+"</button>"}).join("");
 var rep=s.smsReply?'<div class="sms me">'+s.smsReply+'</div><div class="sms">'+(s.smsReply==="1"?"Approved. Your nurse will book the bundled visit.":"Your nurse will call you shortly.")+"</div>":"";
 return'<div class="card"><h2>Fallback – SMS for non-smartphone users</h2><div class="tabs">'+tabs+'</div><div class="phone"><div class="sub">SMS · NurseLink</div><div class="sms">'+esc(tx)+"</div>"+rep+'<div class="bar"><button class="g" onclick="smsReply(\'1\')">Reply 1</button><button class="g" onclick="smsReply(\'2\')">Reply 2</button></div></div><p class="sub">'+len+" characters · "+(uni?"Unicode (Sinhala/Tamil), 70 per segment":"GSM-7")+" · "+segs+" SMS segment(s)</p></div>"}
function renderFlow(){$("steps").innerHTML=NAMES.map(function(n,i){return'<div class="st '+(i===s.step?"on":i<s.step?"done":"")+'">'+esc(n)+"</div>"}).join("");
 $("view").innerHTML=[v1,v2,v3,v4,v5,v6][s.step]();
 $("prev").disabled=s.step===0;$("next").disabled=s.step===5||!ok(s.step);
 $("hint").textContent=s.step<5&&!ok(s.step)?"Complete this step to continue":""}
var CL=[["#0117","Hypertension","132/84","normal","12 Oct","Monitoring"],["#0129","Type 2 diabetes","HbA1c 8.1%","elevated","06 Oct","Review booked"],["#0133","Post-cardiac review","128/80","normal","20 Oct","Monitoring"],["#0138","Hypertension","186/122","critical","Today","Escalated"],["#0151","Prediabetes","118/76","normal","02 Nov","Monitoring"],["#0160","Type 2 diabetes","Fasting 152","elevated","09 Oct","Review booked"]];
function live(){var l=s.server[s.server.length-1]||s.queue[s.queue.length-1];
 var st=s.approved?"Plan approved":s.rec?"Recommendation ready":s.sent?"With specialists":s.server.length?"With physician":s.queue.length?"Pending sync":"Baseline due";
 return["#0142","Baseline (new)",l?l.v.sys+"/"+l.v.dia:"–",l?l.level:"none","Today",st]}
function tri(l){return l==="none"?'<span class="sub">–</span>':lvl(l)}
function login(){var id=$("uid").value.trim();if(!id){alert("Enter your staff or client ID.");return}
 s.auth={role:$("role").value,id:id,anon:!!$("anon").checked};s.home=true;save();render()}
function logout(){s.auth=null;save();render()}
function openFlow(){s.home=false;s.step=0;save();render()}
function openHome(){s.home=true;save();render()}
function topHtml(){return'<div class="brand"><span class="logo">N</span><div><b>NurseLink</b><div class="sub">Nurse-mediated health membership</div></div></div><div class="bar"><span class="chip">✓ NDA supported</span>'+(s.auth?'<span class="chip">'+esc(s.auth.role)+' · '+esc(s.auth.id)+'</span>'+(s.home?"":'<button class="g" onclick="openHome()">Dashboard</button>')+'<button class="g" onclick="logout()">Sign out</button>':"")+"</div>"}
function loginHtml(){return'<div class="card login"><h2>Secure sign in</h2><p class="sub">Demo only: any ID works and no real password check happens.</p><label>Role<select id="role" onchange="roleChange(this.value)"><option>Nurse</option><option>Generalized Physician</option><option>Specialist</option><option>Client</option></select></label><label>Staff or client ID<input type="text" id="uid" value="NRS-014"></label><label>Password<input type="password" id="pw" value="demo"></label><label class="chk"><input type="checkbox" id="anon" checked> Anonymous mode (client ID only)</label><ul class="ticks"><li>✓ NDA supported</li><li>✓ Anonymous client IDs</li><li>✓ Consent recorded</li><li>✓ Audit-logged access</li></ul><button onclick="login()">Sign in</button></div>'}
function dashHtml(){var rows=CL.concat([live()]),c=0,e=0,t=0;
 rows.forEach(function(r){if(r[3]==="critical")c++;if(r[3]==="elevated")e++;if(r[4]==="Today")t++});
 var k=[["Caseload",rows.length+" / 75"],["Critical",c],["Elevated",e],["Pending sync",s.queue.length],["Visits today",t]].map(function(x){return'<div class="kpi"><span class="sub">'+x[0]+"</span><b>"+x[1]+"</b></div>"}).join("");
 var tr=rows.map(function(r,i){return"<tr"+(i===rows.length-1?' class="hl"':"")+"><td><b>"+r[0]+"</b></td><td>"+r[1]+"</td><td>"+r[2]+"</td><td>"+tri(r[3])+"</td><td>"+r[4]+"</td><td>"+r[5]+"</td></tr>"}).join("");
 var sch=[["09:30","#0142 · Baseline visit"],["11:00","#0138 · Urgent BP recheck"],["14:00","#0129 · Diabetes review call"]].map(function(x){return'<div class="chk"><b>'+x[0]+"</b> "+x[1]+"</div>"}).join("");
 return'<div class="kpis">'+k+'</div><div class="card"><div class="bar"><h2 style="margin:0">Nurse dashboard – my caseload</h2><span class="sp"></span><button onclick="openFlow()">Start baseline visit (#0142)</button></div><div class="sc"><table><tr><th>Client</th><th>Focus</th><th>Last reading</th><th>Triage</th><th>Next visit</th><th>Status</th></tr>'+tr+'</table></div></div><div class="card"><h2>Today\'s schedule</h2>'+sch+'<p class="sub">Escalation rule: BP ≥180/120, sugar ≥300 mg/dL or SpO2 &lt;92% goes to the Generalized Physician immediately.</p></div>'}
function render(){var a=s.auth,cl=!!a&&a.role==="Client",fl=!!a&&!s.home&&!cl;$("top").innerHTML=topHtml();$("steps").style.display=fl?"":"none";$("nav").style.display=fl?"":"none";
 if(!a){$("view").innerHTML=loginHtml();return}
 if(cl){$("view").innerHTML=clientHtml();return}
 if(s.home){$("view").innerHTML=dashHtml();return}
 renderFlow()}

var LN={en:"English",si:"සිංහල",ta:"தமிழ்"};
function roleChange(r){var m={Nurse:"NRS-014","Generalized Physician":"DR-021",Specialist:"SP-007",Client:"0142"};$("uid").value=m[r]||""}
function togAnon(c){$("nmw").style.display=c?"none":"";$("ndaw").style.display=c?"":"none"}
function saveProfile(){var a=!!$("canon").checked,n=$("cname").value.trim(),ph=$("cphone").value.replace(/[\s-]/g,"");
 if(!a&&!n){alert("Enter your name, or switch on anonymous mode.");return}
 if(a&&!$("cnda").checked){alert("Anonymous mode needs the NDA. Tick the NDA box.");return}
 if(!/^\+?\d{9,12}$/.test(ph)){alert("Enter a valid mobile number, e.g. 0771234567.");return}
 s.cp={name:a?"":n,dob:$("cdob").value,sex:$("csex").value,phone:ph,addr:$("caddr").value.trim(),smart:!!$("csmart").checked,anon:a,nda:!!$("cnda").checked,level:$("lvE").checked?"Essential":"Comprehensive",lang:$("plang").value,saved:true};
 s.lang=s.cp.lang;s.smsLang=s.cp.lang;save();render()}
function clientHtml(){var c=s.cp,ck=function(b){return b?" checked":""},op=function(v,t){return'<option value="'+v+'"'+(c.lang===v?" selected":"")+">"+t+"</option>"};
 var chips='<span class="chip">Client ID '+esc(s.auth.id)+'</span> <span class="chip">'+(c.anon?"Anonymous mode":"Standard mode")+'</span> <span class="chip">'+c.level+' care</span> <span class="chip">'+LN[c.lang]+"</span>";
 return'<div class="card"><h2>My profile</h2><div class="bar">'+chips+(c.saved?' <span class="badge o">✓ Saved</span>':"")+'</div>'+
 (c.saved&&!c.smart?'<p class="sub">No smartphone: updates and cost approvals will reach you by SMS.</p>':"")+'</div>'+
 '<div class="card"><h2>Profile info</h2><div class="two"><label id="nmw" style="display:'+(c.anon?"none":"")+'">Full name<input type="text" id="cname" value="'+esc(c.name)+'"></label><label>Date of birth<input type="date" id="cdob" value="'+esc(c.dob)+'"></label><label>Sex<select id="csex"><option value="">Select</option><option'+(c.sex==="Female"?" selected":"")+'>Female</option><option'+(c.sex==="Male"?" selected":"")+'>Male</option><option'+(c.sex==="Prefer not to say"?" selected":"")+'>Prefer not to say</option></select></label><label>Mobile number<input type="text" id="cphone" value="'+esc(c.phone)+'" placeholder="0771234567"></label></div><label>Visit address<input type="text" id="caddr" value="'+esc(c.addr)+'"></label><label class="chk"><input type="checkbox" id="csmart"'+ck(c.smart)+'> I use a smartphone</label></div>'+
 '<div class="card"><h2>Anonymous mode</h2><label class="chk"><input type="checkbox" id="canon"'+ck(c.anon)+' onchange="togAnon(this.checked)"> Use my client ID only. My name is not shown to the panel.</label><label class="chk" id="ndaw" style="display:'+(c.anon?"":"none")+'"><input type="checkbox" id="cnda"'+ck(c.nda)+'> I have signed the NDA <span class="chip">✓ NDA supported</span></label><p class="sub">Anonymity can be lifted in emergencies or where the law requires.</p></div>'+
 '<div class="card"><h2>Care level</h2><label class="opt"><input type="radio" name="lvl" id="lvE"'+ck(c.level==="Essential")+'><span><b>Essential</b> · nurse, Generalized Physician, up to 3 specialists</span></label><label class="opt"><input type="radio" name="lvl" id="lvC"'+ck(c.level==="Comprehensive")+'><span><b>Comprehensive</b> · nurse, Generalized Physician, up to 5 specialists</span></label></div>'+
 '<div class="card"><h2>Language preference</h2><label>Summaries and SMS<select id="plang">'+op("en","English")+op("si","සිංහල (Sinhala)")+op("ta","தமிழ் (Tamil)")+'</select></label></div><button onclick="saveProfile()">Save profile</button>'}

render();
