/* TrueCost before/after dashboard. Data: window.TC_DATA (built from VerticalFarm_Dataset2_Simulation_3.xlsx). */
(() => {
const D = window.TC_DATA, Y = { y25: D["2025"], y26: D["2026"] };
const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const C = { navy:"#003B5C", blue:"#0067B9", sky:"#27B7EC", orange:"#C05600", amber:"#D69E2E", old:"#A3B1BF", mint:"#7FD1B9", gold:"#F2B705", gray:"#A0AEC0", ink:"#0F172A", mute:"#64748B" };
const CROPS = ["C01","C02","C03","C04","C05","C06","C07","C08","C09"];
const SHORT = {C01:"Butterhead",C02:"Mixed greens",C03:"Spinach",C04:"Kale",C05:"Arugula",C06:"Basil",C07:"Cherry tom.",C08:"Microgreens",C09:"Strawberries"};
const SETUP = {C01:1,C02:1,C08:1,C03:2,C04:2,C05:2,C06:3,C07:3,C09:3};
const ACCTS = ["H-SM","H-ST","H-FM","R-01","R-02","R-03","R-04","R-05","R-06"];
const ASHORT = {"H-SM":"Small box","H-ST":"Standard box","H-FM":"Family box","R-01":"Trattoria","R-02":"Harvest K.","R-03":"Copper Spoon","R-04":"Riverside","R-05":"Green Fork","R-06":"Lantern"};
const CHN = { hh:"Household Subscription", re:"Restaurant" };
const CHLAB = { all:"All channels", hh:"Households", re:"Restaurants" };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = (v,d=0) => (v<0?"−":"")+"$"+Math.abs(v).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const pct = (v,d=1) => (v<0?"−":"")+Math.abs(v*100).toFixed(d)+"%";
const kfmt = v => (v<0?"−":"")+"$"+(Math.abs(v)/1000).toFixed(Math.abs(v)<10000&&Math.abs(v)%1000?1:0)+"K";
if (reduce) document.documentElement.classList.add("rm");
let view = (location.hash||"").slice(1); if (!["y25","y26","cmp"].includes(view)) view = "y25";
let ch = "all"; const charts = []; let io;

/* ---------- data helpers ---------- */
const tot = y => ch==="all" ? y.total : y.ch[CHN[ch]];
const mval = (m,k) => ch==="all" ? m[k] : m[k+"_"+ch];
const series = (y,k) => y.monthly.map(m => mval(m,k));
const ret = y => ch==="re" ? y.monthly.map(()=>1) : y.ret_monthly;
const retEnd = y => ch==="re" ? 1 : y.ret_monthly[11];
const cropView = (y,id) => { const c=y.crop[id]; if (ch==="all") return c; const s=c[ch]; return s ? {...s,name:c.name} : null; };
const status = (y,id,k) => { const s=y.crop[id][k]; return s ? {cm:s.cm,np:s.np,cls:s.np>0?"ok":s.cm>0?"mid":"bad"} : null; };
const covAt = (y,m) => { if (y===Y.y25) return {lines:[],acc:false,n:0}; const lines=CROPS.filter(c=>SETUP[c]<=m+1); const acc=lines.length===9; return {lines,acc,n:lines.length*2+(acc?9:0)}; };

const KPIS = [
 {id:"k1",n:"KPI 1",t:"True cost per unit",icon:"dollar-sign",tone:"blue",better:"lower",get:y=>tot(y).tcu,fmt:v=>"$"+v.toFixed(3),sp:y=>series(y,"tcu"),sub:()=>"Full cost of one unit sold",d:(a,b)=>({txt:(b<a?"−":"+")+"$"+Math.abs(b-a).toFixed(3),good:b<a})},
 {id:"k2",n:"KPI 2",t:"Contribution margin",icon:"percent",tone:"green",better:"higher",get:y=>tot(y).cm,fmt:v=>pct(v),sp:y=>series(y,"cm"),sub:()=>"After variable cost",d:(a,b)=>({txt:(b>=a?"+":"−")+Math.abs((b-a)*100).toFixed(1)+" pts",good:b>a})},
 {id:"k3",n:"KPI 3",t:"Margin visibility",icon:"eye",tone:"violet",better:"higher",get:y=>y.cov_end,fmt:v=>pct(v,0),sp:y=>y.monthly.map(m=>m.cov),sub:y=>y===Y.y25?"0 of 27 costed":"27 of 27 · avg "+pct(y.cov_avg),d:(a,b)=>({txt:"+"+Math.round((b-a)*100)+" pts",good:true})},
 {id:"k4",n:"KPI 4",t:"Waste rate",icon:"recycle",tone:"orange",better:"lower",get:y=>tot(y).waste,fmt:v=>pct(v),sp:y=>series(y,"waste"),sub:y=>money(tot(y).wcost)+" composted",d:(a,b)=>({txt:(b>=a?"+":"−")+Math.abs((b-a)*100).toFixed(1)+" pts",good:b<a})},
 {id:"k5",n:"KPI 5",t:"Customer retention",icon:"users",tone:"amber",better:"higher",get:y=>retEnd(y),fmt:v=>pct(v),sp:y=>ret(y),sub:y=>ch==="re"?"6 of 6 restaurants":Math.round(y.ret_monthly[11]*85)+" of 85 households",d:(a,b)=>({txt:Math.abs(b-a)<1e-9?"no change":(b>=a?"+":"−")+Math.abs((b-a)*100).toFixed(1)+" pts",good:b>=a,flat:Math.abs(b-a)<1e-9})},
 {id:"k6",n:"KPI 6",t:"Net profit",icon:"circle-dollar-sign",tone:"green",better:"higher",get:y=>tot(y).np,fmt:v=>money(v),sp:y=>series(y,"np"),sub:()=>"After $66K overhead",d:(a,b)=>({txt:a<0?"loss → profit":(b>=a?"+":"−")+Math.abs((b-a)/Math.abs(a)*100).toFixed(1)+"%",good:b>a})}
];

/* ---------- chart helpers ---------- */
const merge = (a,b) => { const o = Array.isArray(a)?[...a]:{...a}; for (const k in b) { o[k] = (b[k] && typeof b[k]==="object" && !Array.isArray(b[k]) && a && typeof a[k]==="object" && !Array.isArray(a[k])) ? merge(a[k],b[k]) : b[k]; } return o; };
const BASE = {chart:{fontFamily:"Inter, Arial, sans-serif",toolbar:{show:false},zoom:{enabled:false},parentHeightOffset:0,animations:{enabled:!reduce,easing:"easeinout",speed:900,animateGradually:{enabled:true,delay:70},dynamicAnimation:{enabled:true,speed:500}}},
 grid:{borderColor:"#EEF1F4",strokeDashArray:4,padding:{left:6,right:10}},dataLabels:{enabled:false},legend:{show:false},
 xaxis:{axisBorder:{show:false},axisTicks:{show:false},labels:{style:{colors:C.mute,fontSize:"12px"}}},
 yaxis:{labels:{style:{colors:C.mute,fontSize:"12px"}}},tooltip:{theme:"light",style:{fontSize:"13px"}},states:{hover:{filter:{type:"darken",value:.9}}}};
function mk(el, opts, lazyRender = true) {
 if (!el) return; const c = new ApexCharts(el, merge(BASE, opts)); charts.push(c);
 if (!lazyRender || reduce) { c.render(); return c; }
 const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { c.render(); o.disconnect(); } }, {threshold:.15}); o.observe(el); return c;
}
const killCharts = () => { while (charts.length) { try { charts.pop().destroy(); } catch(_){} } };
const hbar = (el, items, {fmt=v=>v.toFixed(0)+"%", h=300, max=null, colors}={}) => mk(el, {chart:{type:"bar",height:h},series:[{name:"",data:items.map(i=>+i.v.toFixed(2))}],
 plotOptions:{bar:{horizontal:true,borderRadius:4,borderRadiusApplication:"end",barHeight:"62%",distributed:true,dataLabels:{position:"top"}}},colors:colors||items.map(i=>i.c),
 dataLabels:{enabled:true,offsetX:28,style:{fontSize:"12px",fontWeight:600,colors:[C.ink]},formatter:v=>fmt(v)},
 xaxis:{categories:items.map(i=>i.l),tickAmount:4,labels:{formatter:v=>fmt(+v)},max:max??undefined},yaxis:{labels:{style:{colors:C.ink,fontSize:"12.5px",fontWeight:500},maxWidth:130}},
 grid:{xaxis:{lines:{show:true}},yaxis:{lines:{show:false}}},tooltip:{y:{formatter:(v,o)=>items[o.dataPointIndex].tip||fmt(v),title:{formatter:()=>""}}}});

/* ---------- shell: sidebar, crumb ---------- */
$("#mk").innerHTML = ic("leaf");
$("#burger").innerHTML = ic("menu");
const VIEWS = [["y25","chart-column","Dashboard 1","2025 · before TrueCost"],["y26","chart-line","Dashboard 2","2026 · with TrueCost"],["cmp","arrow-left-right","Before vs after","2025 against 2026"]];
function sidebar(){
 $("#views").innerHTML = VIEWS.map(([k,i,t])=>`<button class="nav" data-v="${k}" aria-current="${k===view}">${ic(i,"sm")}${t}</button>`).join("");
 $("#kpinav").innerHTML = KPIS.map(k=>`<a href="#${k.id}" data-k="${k.id}">${ic(k.icon,"sm")}${k.t}<span class="k">${k.n.replace("KPI ","")}</span></a>`).join("") + (view==="cmp"?`<a href="#rules" data-k="rules">${ic("list-checks","sm")}Rules and sources</a>`:"");
 $$("#views .nav").forEach(b=>b.onclick=()=>{view=b.dataset.v;try{history.replaceState(null,"","#"+view);}catch(_){} closeSb(); render(); scrollTo({top:0,behavior:"smooth"});});
 $$("#kpinav a").forEach(a=>a.onclick=e=>{e.preventDefault();closeSb();jump(a.dataset.k);});
 $("#crumb").innerHTML = `Vertical farm ${ic("chevron-right","sm")} <b>${VIEWS.find(v=>v[0]===view)[2]}</b>`;
}
const closeSb = () => $("#sb").classList.remove("open");
$("#burger").onclick = () => $("#sb").classList.toggle("open");
function jump(id){ const s=document.getElementById(id); if(!s) return; s.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"}); s.animate?.([{boxShadow:"0 0 0 0 rgba(0,103,185,0)"},{boxShadow:"0 0 0 4px rgba(0,103,185,.25)"},{boxShadow:"0 0 0 0 rgba(0,103,185,0)"}],{duration:1400,delay:400}); }

/* ---------- KPI strip ---------- */
function strip(){
 const y = view==="y25"?Y.y25:Y.y26;
 return `<div class="kpis">${KPIS.map(k=>{const a=k.get(Y.y25),b=k.get(Y.y26),d=k.d(a,b);
  const badge = view==="y25" ? `<span class="badge gray">${k.better} is better</span>` : `<span class="badge ${d.flat?"gray":d.good?"blue":"orange"}">${d.flat?"":ic(d.good?(k.better==="lower"?"arrow-down-right":"arrow-up-right"):"arrow-up-right","sm")}${d.txt}</span>`;
  const val = view==="cmp" ? `<div class="v" style="font-size:clamp(16px,1.4vw,19px);white-space:normal">${k.fmt(a)} <span class="muted">→</span> <span class="to">${k.fmt(b)}</span></div>` : `<div class="v" data-to="${k.get(y)}" data-f="${k.id}">${k.fmt(k.get(y))}</div>`;
  return `<button class="card kpi" data-go="${k.id}"><div class="t"><span class="iconbox ${k.tone}">${ic(k.icon)}</span>${badge}</div><div class="lbl">${k.n} · ${k.t}</div>${val}<div class="sub">${esc(k.sub(view==="y25"?Y.y25:Y.y26))}</div><div class="spark" data-sp="${k.id}"></div></button>`;}).join("")}</div>`;
}
function stripInit(){
 $$("[data-sp]").forEach(el=>{const k=KPIS.find(x=>x.id===el.dataset.sp);const s=[];
  if(view!=="y26") s.push({name:"2025",data:k.sp(Y.y25)}); if(view!=="y25") s.push({name:"2026",data:k.sp(Y.y26)});
  const cols = view==="cmp"?[C.old,C.blue]:[view==="y25"?C.navy:C.blue];
  mk(el,{chart:{type:"area",height:46,sparkline:{enabled:true}},series:s,colors:cols,stroke:{width:view==="cmp"?[1.6,2.2]:2.2,curve:"smooth",dashArray:view==="cmp"?[4,0]:0},fill:{type:"gradient",gradient:{opacityFrom:view==="cmp"?[0,.28]:.28,opacityTo:0}},tooltip:{enabled:false}},false);});
 $$(".kpi .v[data-to]").forEach(el=>{const k=KPIS.find(x=>x.id===el.dataset.f);const to=+el.dataset.to;if(reduce||!window.gsap)return;const o={v:0};gsap.to(o,{v:to,duration:1.2,ease:"power3.out",onUpdate:()=>el.textContent=k.fmt(o.v)});});
 $$(".kpi").forEach(b=>b.onclick=()=>jump(b.dataset.go));
}

/* ---------- year view ---------- */
function yearView(){
 const is25=view==="y25", y=is25?Y.y25:Y.y26, T=tot(y);
 const lossCrops=CROPS.map(id=>cropView(y,id)).filter(c=>c&&c.np<0);
 const head = is25
  ? `<div><div class="row" style="gap:8px;margin-bottom:10px"><span class="badge orange">${ic("calendar","sm")}Jan 4, 2025 to Jan 2, 2026</span><span class="badge gray">Dataset 1</span></div><h1>Dashboard 1 · 2025, before TrueCost</h1><p>Prices were set by feel and nothing was costed, so the founder never saw these numbers at the time. ${CHLAB[ch]}.</p></div>`
  : `<div><div class="row" style="gap:8px;margin-bottom:10px"><span class="badge blue">${ic("calendar","sm")}Jan 3, 2026 to Jan 1, 2027</span><span class="badge gray">Dataset 2 · simulated</span></div><h1>Dashboard 2 · 2026, first year with TrueCost</h1><p>Same farm, crops and box prices. TrueCost was set up crop by crop from January to March. ${CHLAB[ch]}.</p></div>`;
 const sec = (id,no,better,title,desc,formula,big,body,extra="") => `<section class="card sec" id="${id}"><div class="card-h"><div><div class="kno">${no} · ${better} is better</div><h2>${title}</h2><p class="desc">${desc}</p>${formula?`<span class="formula">${formula}</span>`:""}</div>${big?`<div class="big">${big}</div>`:""}${extra}</div><div class="card-b">${body}</div></section>`;
 return `<div class="head">${head}</div>${tabs()}${strip()}
 ${sec("k1","KPI 1","Lower","True cost per unit vs selling price, by crop","Each bar is what one unit really costs, split into six parts. The square marker is the average price the farm got. A bar taller than its marker loses money after overhead.","TCU = (labor + energy + water + packaging + waste + overhead) ÷ units sold",`<b>$${T.tcu.toFixed(2)}</b><span>per unit sold</span>`,
  `<div class="legend" style="margin-bottom:6px">${[["Labor",C.blue],["Energy",C.sky],["Water & nutrients",C.mint],["Packaging",C.gold],["Waste",C.orange],["Overhead",C.gray]].map(([l,c])=>`<span><i style="background:${c}"></i>${l}</span>`).join("")}<span><i style="background:${C.navy}"></i>Sale price</span></div><div id="c1" class="chart"></div>`)}
 ${sec("k2","KPI 2","Higher","Contribution margin by crop, channel and account","Share of each sales dollar left after the costs that rise and fall with volume. Overhead is not taken out here; that is KPI 6.","CM % = (revenue − variable cost) ÷ revenue",null,
  `<div class="split"><div><div id="c2" class="chart"></div><p class="small muted" id="c2cap" style="margin-top:6px"></p></div><div><div class="sub-h">Margin traffic lights · every crop in each channel</div><div class="board" id="board"></div><div class="legend" style="margin-top:10px"><span><i style="background:var(--blue-soft);border:1px solid #9CC3E8"></i>Profit after overhead</span><span><i style="background:var(--amber-soft);border:1px solid #E9C77B"></i>Covers variable cost only</span><span><i style="background:var(--orange-soft);border:1px solid #EDB48B"></i>Below variable cost</span></div></div></div>`,
  `<div class="seg" role="group" aria-label="Group by" id="cmBy"><button data-by="crop" aria-pressed="true">Crop</button><button data-by="channel" aria-pressed="false">Channel</button><button data-by="acct" aria-pressed="false">Account</button></div>`)}
 ${sec("k3","KPI 3","Higher","Margin visibility coverage","27 things to cost: 9 crops in 2 channels and 9 accounts (3 box sizes, 6 restaurants). A tile lights up once its margin is calculated from real cost data. Press play to watch the year.","MVC = (lines + accounts with a calculated margin) ÷ 27",`<b id="covBig">0</b><span id="covSub">of 27</span>`,
  `<div class="split"><div><div class="tiles" id="tiles"></div><div class="scrub"><button class="play" id="covPlay" aria-label="Play the year">${ic("play","sm")}</button><input type="range" min="0" max="11" value="11" id="covM" aria-label="Month"><output id="covOut"></output></div></div><div><div id="c3" style="min-height:240px"></div><p class="small muted">${is25?"<b class='strong'>0% all year.</b> No crop, channel or account was ever costed, so every price was a guess.":"<b class='strong'>22% in January, 44% in February, 100% from March.</b> Three crops a month, following the Veggie Compass advice to start with two or three. Year average "+pct(y.cov_avg)+"."}</p></div></div>`)}
 ${sec("k4","KPI 4","Lower","Waste rate and the cost of what gets composted","Share of the harvest that never sells, by crop, and what that produce cost to grow.","Waste rate = units wasted ÷ units produced",`<b>${pct(T.waste)}</b><span>${money(T.wcost)} composted</span>`,
  `<div class="split even"><div><div class="sub-h">Waste rate by crop</div><div id="c4a" class="chart"></div></div><div><div class="sub-h">By month · rate and cost</div><div id="c4b" class="chart"></div></div></div>`)}
 ${sec("k5","KPI 5","Higher","Customer retention, households and restaurants","Each dot is one of the 85 households subscribed in January. Faded dots have cancelled by the month you pick. New subscribers who join later don't count toward retention.","CRR = (customers at end − new customers) ÷ customers at start",`<b id="retBig"></b><span id="retSub"></span>`,
  `<div class="split"><div><div class="dots" id="dots"></div><div class="scrub" style="max-width:520px"><button class="play" id="retPlay" aria-label="Play the year">${ic("play","sm")}</button><input type="range" min="0" max="11" value="11" id="retM" aria-label="Month"><output id="retOut"></output></div><div class="sub-h" style="margin-top:16px">Restaurants · 6 of 6 kept all year</div><div class="rest">${ACCTS.slice(3).map(a=>`<span class="badge blue">${ic("check","sm")}${esc(y.acct[a].name)}</span>`).join("")}</div></div><div><div id="c5" style="min-height:260px"></div></div></div>`)}
 ${sec("k6","KPI 6","Higher","Net profit after overhead, month by month","The real bottom line: revenue minus all costs, including the fixed $66,000 overhead. Monthly, scaled to calendar-month length.","Net profit = revenue − total cost = contribution − overhead",`<b>${money(T.np)}</b><span>for the year</span>`,
  `<div class="split"><div><div id="c6" class="chart"></div><p class="small muted">${is25?"April to August lose money: strawberries and cherry tomatoes are in season and priced below their full cost.":"The fruit months now earn a small profit instead of losing about $570 a month."}</p></div><div><div class="sub-h">Net profit by crop</div><div id="c6b" class="chart"></div></div></div>
  <div class="note ${is25?"orange":"blue"}">${ic(is25?"triangle-alert":"circle-check")}<div><b>${is25?"What the data says.":"What changed."}</b> ${is25?`The farm looks fine in total, but ${lossCrops.map(c=>esc(c.name)).join(", ")||"no crop"} lose ${money(-lossCrops.reduce((a,c)=>a+c.np,0))} after overhead, and restaurants lose ${money(-Y.y25.ch.Restaurant.np)} as a channel. Nobody could see it, because nothing was costed.`:`Net profit rises to ${money(Y.y26.total.np)} (+22.8%) on almost the same sales. Restaurants go from a ${money(-Y.y25.ch.Restaurant.np)} loss to a ${money(Y.y26.ch.Restaurant.np)} profit, and household box prices did not change.`}</div></div>`)}`;
}
function tabs(){return `<div class="vtabs">${VIEWS.map(([k,i,t,s])=>`<button class="vtab" data-v="${k}" aria-pressed="${k===view}"><span class="iconbox">${ic(i)}</span><span><b>${t}</b><small>${s}</small></span></button>`).join("")}</div>`;}
const timers=[];
function scrubber(inp,btn,fn){const r=$(inp),b=$(btn);r.oninput=()=>fn(+r.value);let t=null;b.onclick=()=>{if(t){clearInterval(t);t=null;b.innerHTML=ic("play","sm");return;}let m=0;r.value=0;fn(0);b.innerHTML=ic("pause","sm");t=setInterval(()=>{m++;if(m>11){clearInterval(t);t=null;b.innerHTML=ic("play","sm");return;}r.value=m;fn(m);},reduce?60:650);timers.push(()=>clearInterval(t));};}
function yearCharts(){
 const is25=view==="y25", y=is25?Y.y25:Y.y26;
 const comps=[["labor_u","Labor",C.blue],["energy_u","Energy",C.sky],["water_nutrient_u","Water & nutrients",C.mint],["packaging_u","Packaging",C.gold],["waste_u","Waste",C.orange],["overhead_u","Overhead",C.gray]];
 const cs=CROPS.map(id=>({id,...cropView(y,id)})).filter(c=>c.units).sort((a,b)=>a.tcu-b.tcu);
 const src=c=>ch==="all"?y.crop[c.id]:c;
 mk($("#c1"),{chart:{type:"bar",height:360,stacked:true},series:comps.map(([k,l])=>({name:l,data:cs.map(c=>+src(c)[k].toFixed(3))})),colors:comps.map(x=>x[2]),
  plotOptions:{bar:{columnWidth:"52%",borderRadius:3,borderRadiusApplication:"end",borderRadiusWhenStacked:"last"}},stroke:{width:1,colors:["#fff"]},
  xaxis:{categories:cs.map(c=>SHORT[c.id])},yaxis:{labels:{formatter:v=>"$"+v.toFixed(0)}},tooltip:{shared:true,intersect:false,y:{formatter:v=>"$"+v.toFixed(2)}},
  annotations:{points:cs.map(c=>{const p=ch==="all"?y.crop[c.id].price_u:c.price_u;return{x:SHORT[c.id],y:p,marker:{size:7,fillColor:C.navy,strokeColor:"#fff",strokeWidth:2,shape:"square"},label:{text:"$"+p.toFixed(2),offsetY:-4,borderWidth:0,style:{background:C.navy,color:"#fff",fontSize:"11px",fontWeight:600,padding:{left:5,right:5,top:2,bottom:2}}}};})}});
 // KPI 2
 let by="crop",c2=null;
 const drawCM=()=>{ if(c2){c2.destroy();charts.splice(charts.indexOf(c2),1);} $("#c2").innerHTML="";
  let items; if(by==="crop") items=CROPS.map(id=>cropView(y,id)).filter(Boolean).map(c=>({l:c.name,v:c.cm*100,p:c.np,r:c.rev}));
  else if(by==="channel") items=[["Household boxes","Household Subscription"],["Restaurants","Restaurant"]].filter(([_,k])=>ch==="all"||CHN[ch]===k).map(([l,k])=>({l,v:y.ch[k].cm*100,p:y.ch[k].np,r:y.ch[k].rev}));
  else items=ACCTS.filter(a=>ch==="all"||(ch==="hh"?a[0]==="H":a[0]==="R")).map(a=>({l:y.acct[a].name,v:y.acct[a].cm*100,p:y.acct[a].np,r:y.acct[a].rev}));
  items.sort((a,b)=>b.v-a.v); items.forEach(i=>{i.c=i.v<0?C.orange:i.p<0?C.amber:C.blue;i.tip=`CM ${i.v.toFixed(1)}% · revenue ${money(i.r)} · net ${money(i.p)}`;});
  c2=hbar($("#c2"),items,{h:Math.max(170,items.length*36+50),max:80});
  const amber=items.filter(i=>i.p<0&&i.v>0);
  $("#c2cap").innerHTML=`Overall <b class="strong">${pct(tot(y).cm)}</b>. ${amber.length?`Amber bars (${amber.map(i=>esc(i.l)).join(", ")}) cover their variable cost but not their share of overhead, so dropping them would cut profit unless the space earns more.`:"Every item covers its variable cost and overhead."}`;};
 drawCM(); $$("#cmBy button").forEach(b=>b.onclick=()=>{by=b.dataset.by;$$("#cmBy button").forEach(x=>x.setAttribute("aria-pressed",x===b));drawCM();});
 $("#board").innerHTML=`<div class="h">Crop</div><div class="h">Households</div><div class="h">Restaurants</div>`+CROPS.map(id=>`<div class="c">${esc(y.crop[id].name)}</div>`+["hh","re"].map(k=>{const s=status(y,id,k);return s?`<div class="cell ${s.cls}" title="Net profit ${money(s.np)}">${(s.cm*100).toFixed(0)}%<span>${money(s.np)}</span></div>`:`<div class="cell na">n/a</div>`;}).join("")).join("")+(is25?`<div class="veil" id="veil"><div class="box"><b>Hidden from the founder in 2025</b><span class="small muted">Visibility was 0%. These are the margins TrueCost later found in the 2025 data.</span><div style="margin-top:12px"><button class="btn btn-primary btn-sm" id="reveal">${ic("eye","sm")}Reveal</button></div></div></div>`:"");
 if(is25) $("#reveal").onclick=()=>{const v=$("#veil");v.style.opacity=0;setTimeout(()=>v.remove(),500);};
 // KPI 3
 const tl=$("#tiles"),list=[...CROPS.flatMap(id=>[["hh",id],["re",id]]),...ACCTS.map(a=>["acct",a])];
 tl.innerHTML=list.map(([k,id])=>`<div class="tile ${k==="acct"?"acct":""}" data-k="${k}" data-id="${id}" title="${k==="acct"?esc(y.acct[id].name):esc(y.crop[id].name)+(k==="hh"?" · households":" · restaurants")}">${k==="acct"?esc(ASHORT[id]):esc(SHORT[id].split(" ")[0])+"<br>"+(k==="hh"?"Box":"Rest.")}</div>`).join("");
 const setCov=m=>{const c=covAt(y,m);tl.querySelectorAll(".tile").forEach(t=>t.classList.toggle("on",t.dataset.k==="acct"?c.acc:c.lines.includes(t.dataset.id)));$("#covBig").textContent=c.n+" of 27";$("#covSub").textContent=Math.round(c.n/27*100)+"% at the end of "+MN[m];$("#covOut").textContent=MN[m]+" "+(is25?2025:2026);};
 setCov(11);scrubber("#covM","#covPlay",setCov);
 mk($("#c3"),{chart:{type:"area",height:240},series:[{name:"Coverage",data:y.monthly.map(m=>Math.round(m.cov*100))}],colors:[is25?C.orange:C.blue],stroke:{curve:"stepline",width:3},fill:{type:"gradient",gradient:{opacityFrom:.3,opacityTo:.02}},markers:{size:4,strokeWidth:2,strokeColors:"#fff"},xaxis:{categories:MN},yaxis:{min:0,max:100,tickAmount:4,labels:{formatter:v=>v+"%"}},tooltip:{y:{formatter:v=>v+"% at month end"}}});
 // KPI 4
 const ws=CROPS.map(id=>({id,...cropView(y,id)})).filter(c=>c.units).sort((a,b)=>b.waste-a.waste);
 hbar($("#c4a"),ws.map(c=>({l:SHORT[c.id],v:c.waste*100,c:c.waste>.15?C.orange:"#E8A574",tip:`${(c.waste*100).toFixed(1)}% · ${money(c.wcost)} of produce`})),{fmt:v=>v.toFixed(0)+"%",h:320,max:40});
 mk($("#c4b"),{chart:{type:"line",height:320},series:[{name:"Waste cost (all channels)",type:"column",data:y.monthly.map(m=>Math.round(m.wcost))},{name:"Waste rate",type:"line",data:series(y,"waste").map(v=>+(v*100).toFixed(2))}],colors:["#F6D3BC",C.orange],stroke:{width:[0,3],curve:"smooth"},plotOptions:{bar:{columnWidth:"55%",borderRadius:4}},markers:{size:[0,4],strokeColors:"#fff",strokeWidth:2},
  xaxis:{categories:MN},yaxis:[{seriesName:"Waste cost (all channels)",opposite:true,labels:{formatter:v=>"$"+(v/1000).toFixed(1)+"K"}},{seriesName:"Waste rate",min:0,max:16,labels:{formatter:v=>v.toFixed(0)+"%"}}],legend:{show:true,position:"bottom",fontSize:"12px",markers:{size:5}},tooltip:{shared:true,intersect:false,y:{formatter:(v,o)=>o.seriesIndex?v.toFixed(1)+"%":money(v)}}});
 // KPI 5
 const dots=$("#dots");dots.innerHTML=Array.from({length:85},()=>`<div class="dot"></div>`).join("");
 const setRet=m=>{const r=ch==="re"?1:y.ret_monthly[m],kept=Math.round(r*85);dots.querySelectorAll(".dot").forEach((d,i)=>d.classList.toggle("off",ch!=="re"&&i>=kept));$("#retBig").textContent=ch==="re"?"100%":(r*100).toFixed(1)+"%";$("#retSub").textContent=ch==="re"?"6 of 6 restaurants":`${kept} of 85 kept by ${MN[m]}`;$("#retOut").textContent=MN[m]+" "+(is25?2025:2026);};
 setRet(11);scrubber("#retM","#retPlay",setRet);
 mk($("#c5"),{chart:{type:"area",height:260},series:[{name:"Households",data:y.ret_monthly.map(v=>+(v*100).toFixed(1))},{name:"Restaurants",data:MN.map(()=>100)}],colors:[is25?C.navy:C.blue,C.sky],stroke:{width:[3,2],curve:"smooth",dashArray:[0,6]},fill:{type:"gradient",gradient:{opacityFrom:[.28,0],opacityTo:[.02,0]}},markers:{size:[3,0]},xaxis:{categories:MN},yaxis:{min:50,max:100,tickAmount:5,labels:{formatter:v=>v.toFixed(0)+"%"}},legend:{show:true,position:"bottom",fontSize:"12px"},tooltip:{shared:true,y:{formatter:v=>v.toFixed(1)+"% of January customers"}}});
 // KPI 6
 const np=series(y,"np");
 mk($("#c6"),{chart:{type:"bar",height:310},series:[{name:"Net profit",data:np.map(v=>Math.round(v))}],plotOptions:{bar:{columnWidth:"58%",borderRadius:5,borderRadiusApplication:"end",colors:{ranges:[{from:-1e9,to:-.01,color:C.orange}]}}},colors:[C.blue],xaxis:{categories:MN},yaxis:{labels:{formatter:kfmt}},
  tooltip:{y:{formatter:(v,o)=>{const m=y.monthly[o.dataPointIndex];return money(v)+(ch==="all"?`  (boxes ${money(m.np_hh)} · restaurants ${money(m.np_re)})`:"");}}}});
 const pc=CROPS.map(id=>({id,...cropView(y,id)})).filter(c=>c.units).sort((a,b)=>b.np-a.np);
 mk($("#c6b"),{chart:{type:"bar",height:310},series:[{name:"Net profit",data:pc.map(c=>Math.round(c.np))}],plotOptions:{bar:{horizontal:true,barHeight:"62%",borderRadius:4,colors:{ranges:[{from:-1e9,to:-.01,color:C.orange}]}}},colors:[C.blue],xaxis:{categories:pc.map(c=>SHORT[c.id]),labels:{formatter:v=>kfmt(+v)}},yaxis:{labels:{style:{colors:C.ink,fontWeight:500}}},grid:{xaxis:{lines:{show:true}},yaxis:{lines:{show:false}}},tooltip:{y:{formatter:(v,o)=>money(v)+" · CM "+pct(pc[o.dataPointIndex].cm)}}});
}

/* ---------- compare view ---------- */
const RULES=[["R1","Waste −20%","KPI 4, 1, 2, 6","Clowes, Hanson & Swannell (2019), Champions 12.3: 114 restaurants cut food waste 26% in year one by measuring it. Range across studies 19 to 36%; we used the low end."],
 ["R2","+15% on 4 restaurant prices below cost","KPI 2, 6","Ernst & Woods (2011), University of Kentucky: restaurants pay local growers 5 to 25% above wholesale; midpoint used. Basil, cherry tomatoes, strawberries and spinach only. Household box prices unchanged."],
 ["R3","Those 4 lines sell 7.5% less","KPI 1, 2, 6","Price elasticity −0.5 (Powell et al., 2013; Andreyeva et al., 2010)."],
 ["R4","Coverage 0% → 100% by March","KPI 3","Hendrickson et al. (2016), Veggie Compass, University of Wisconsin: small farms costing crops with a free spreadsheet, starting with 2 or 3 crops."],
 ["R5","Labor minutes per unit −5%","KPI 1, 2, 6","Clay Bottom Farm, Goshen, Indiana (Hartman, The Lean Farm, 2015; Hobby Farms, 2019): a small CSA and restaurant farm that tracked time per crop, halved labor hours and doubled income. We used half its yearly rate."],
 ["R6","Household churn: half the gap to 75%","KPI 5","Galt et al. (2019), Sustainability: the average California CSA keeps 62.9%, successful ones 75 to 80%. Weakest-sourced rule; profit does not depend on it."]];
const MINI={k1:"Average true cost per unit by channel",k2:"Average contribution margin by channel",k3:"Average margin visibility by channel",k4:"Average waste rate by channel",k5:"December retention by channel",k6:"Net profit by channel"};
function cmpView(){
 const a=tot(Y.y25),b=tot(Y.y26);const cents=t=>({v:t.var/t.rev,o:t.oh/t.rev,p:t.np/t.rev});const ca=cents(a),cb=cents(b);
 const bar=c=>`<div class="dbar"><span data-w="${c.v*100}" style="background:#7C8B99">Variable ${(c.v*100).toFixed(1)}¢</span><span data-w="${Math.max(0,c.o*100)}" style="background:${C.navy}">Overhead ${(c.o*100).toFixed(1)}¢</span><span data-w="${Math.max(0,c.p*100)}" style="background:${c.p<0?C.orange:C.blue}">Profit ${(c.p*100).toFixed(1)}¢</span></div>`;
 const card=(k,title,body,fig,extra="")=>{const A=k.get(Y.y25),B=k.get(Y.y26),d=k.d(A,B);return `<section class="card sec" id="${k.id}"><div class="card-b" style="padding-top:22px"><div class="cmp"><div><div class="kno">${ic(k.icon,"sm")}${k.n} · ${k.better} is better</div><h2>${title}</h2><p class="desc">${body}</p><div class="legend" style="margin-top:12px"><span><i class="ln" style="background:${C.old}"></i>2025 before</span><span><i class="ln" style="background:${C.blue}"></i>2026 with TrueCost</span><span><i style="background:rgba(0,103,185,.16)"></i>Difference</span></div><div id="${fig}" style="min-height:280px"></div></div>
  <div><div class="pair"><div><small>2025 · before</small><b>${k.fmt(A)}</b></div><div><small>2026 · after</small><b>${k.fmt(B)}</b></div></div><div class="chg">Change <span class="badge ${d.flat?"gray":d.good?"blue":"orange"}">${d.txt}</span></div>${extra}<div class="mini"><div class="mini-h">${MINI[k.id]}</div><div id="${fig}b"></div></div></div></div></div></section>`;};
 const kept25=Math.round(Y.y25.ret_monthly[11]*85),kept26=Math.round(Y.y26.ret_monthly[11]*85);
 return `<div class="head"><div><div class="row" style="gap:8px;margin-bottom:10px"><span class="badge blue">${ic("calendar","sm")}52 weeks each</span><span class="badge gray">Same formulas, totals ÷ totals</span></div><h1>Before vs after, month by month</h1><p>2025 and 2026 on the same January to December axis, so every gap is the effect of TrueCost. ${CHLAB[ch]}.</p></div></div>${tabs()}${strip()}
 <section class="card sec"><div class="card-b" style="padding:24px"><div class="headline"><div><div class="kno">${ic("sparkles","sm")}The headline</div><h2 style="font-size:clamp(22px,2.4vw,30px)">Net profit ${ch==="re"?"turns from a loss to a profit":"up "+((b.np-a.np)/Math.abs(a.np)*100).toFixed(1)+"%"} on almost the same sales</h2><p class="desc" style="margin-top:10px">Sales moved ${((b.rev-a.rev)/a.rev*100).toFixed(1)}% (${money(a.rev)} → ${money(b.rev)}) but variable cost fell ${(-(b.var-a.var)/a.var*100).toFixed(1)}%. Overhead stayed at about $66,000, so the saving goes straight to profit: ${money(a.np)} → <b style="color:var(--blue)">${money(b.np)}</b>.</p><p class="small muted" style="margin-top:10px">KPI 2 is what's left after variable cost (first segment). KPI 6 is what's left after overhead too.</p></div>
 <div class="dollar"><div class="sub-h">Where each $1 of sales goes</div><div class="drow">2025${bar(ca)}</div><div class="drow">2026${bar(cb)}</div><p class="small muted" style="margin-top:10px">Contribution margin ${pct(a.cm)} → ${pct(b.cm)} · Net margin ${pct(a.np/a.rev)} → ${pct(b.np/b.rev)}</p></div></div></div></section>
 ${card(KPIS[0],"True cost per unit, each month","Less waste (R1) and fewer labor minutes (R5) make every unit cheaper. Summer is higher in both years because fruit crops use more light and space.","x1")}
 ${card(KPIS[1],"Contribution margin, each month","Higher in every month of 2026. Restaurants gain the most because four underpriced lines were repriced from cost.","x2")}
 ${card(KPIS[2],"Margin visibility coverage, each month","The shaded area is the difference: in 2025 the founder could see nothing; by March 2026 every line and account has a calculated margin.","x3",`<div class="tiles" style="margin-top:14px">${Array.from({length:27},(_,i)=>`<div class="tile on ${i>=18?"acct":""}" style="font-size:0"></div>`).join("")}</div><p class="small muted" style="margin-top:8px">0 of 27 → 27 of 27 · 2026 average ${pct(Y.y26.cov_avg)}</p>`)}
 ${card(KPIS[3],"Waste rate, each month","Lower in every month. The waste log with a cause picklist lets the team harvest to real orders.","x4",`<p class="small muted" style="margin-top:10px">Waste cost ${money(a.wcost)} → ${money(b.wcost)} (${money(b.wcost-a.wcost)})</p>`)}
 ${card(KPIS[4],"Household retention, each month","Share of January's 85 subscribers still active. The gap opens in summer and ends 7 points higher in December, with box prices unchanged.","x5",`<div class="grid g2" style="gap:12px;margin-top:14px"><div><div class="small muted" style="margin-bottom:6px">2025 · ${kept25} of 85</div><div class="dots" style="grid-template-columns:repeat(10,minmax(0,1fr));gap:3px">${Array.from({length:85},(_,i)=>`<div class="dot ${i<kept25?"old":"off"}"></div>`).join("")}</div></div><div><div class="small muted" style="margin-bottom:6px">2026 · ${kept26} of 85</div><div class="dots" style="grid-template-columns:repeat(10,minmax(0,1fr));gap:3px">${Array.from({length:85},(_,i)=>`<div class="dot ${i<kept26?"":"off"}"></div>`).join("")}</div></div></div><p class="small muted" style="margin-top:10px">Restaurants kept 6 of 6 in both years, so the 15% rise on four items lost no account.</p>`)}
 ${card(KPIS[5],"Net profit, each month","April to August used to lose money every month. In 2026 those months are small profits. The shaded area adds up to the extra profit.","x6")}
 <section class="card sec" id="rules"><div class="card-h"><div><div class="kno">${ic("list-checks","sm")}Why the numbers moved</div><h2>Six improvement rules, each with a named source</h2><p class="desc">Only variables inside a KPI formula were changed. Wage, electricity price, overhead, box prices and the other restaurant prices stayed the same.</p></div></div>
 <div class="card-b"><div class="table-wrap"><table><thead><tr><th>Rule</th><th>Change in 2026</th><th>KPIs</th><th>Source and why it applies</th></tr></thead><tbody>${RULES.map(r=>`<tr><td><span class="badge dark">${r[0]}</span></td><td style="min-width:170px;font-weight:600">${esc(r[1])}</td><td style="white-space:nowrap" class="muted">${r[2]}</td><td>${esc(r[3])}</td></tr>`).join("")}</tbody></table></div>
 <div class="note blue">${ic("badge-check")}<div><b>A real farm did this.</b> Clay Bottom Farm used the same "measure first, then act" approach as TrueCost and became more profitable. Our first-year gain (+22.8%) is far below what it reached over seven years, so it's a careful estimate.</div></div>
 <div class="note orange">${ic("triangle-alert")}<div><b>Still to fix.</b> Strawberries and cherry tomatoes (both channels) and basil for restaurants still lose money after overhead, but all cover their variable cost. Dropping them would cut profit unless the rack space goes to a better crop, like microgreens.</div></div></div></section>`;
}
function cmpCharts(){
 $$(".dbar span").forEach((s,i)=>{if(reduce||!window.gsap){s.style.width=s.dataset.w+"%";return;}gsap.to(s,{width:s.dataset.w+"%",duration:1.2,ease:"power3.out",delay:.3+i*.08});});
 const line=(id,a,b,fmt,o={})=>mk($("#"+id),{chart:{type:"rangeArea",height:290},
  series:[{type:"rangeArea",name:"Difference",data:MN.map((m,i)=>({x:m,y:[Math.min(a[i],b[i]),Math.max(a[i],b[i])]}))},{type:"line",name:"2025 before",data:MN.map((m,i)=>({x:m,y:a[i]}))},{type:"line",name:"2026 with TrueCost",data:MN.map((m,i)=>({x:m,y:b[i]}))}],
  colors:["#0067B9",C.old,C.blue],fill:{opacity:[.16,1,1]},stroke:{width:[0,2.5,3.5],curve:o.step?"stepline":"smooth",dashArray:[0,6,0]},markers:{size:[0,3,4],strokeColors:"#fff",strokeWidth:2,hover:{size:6}},
  yaxis:{min:o.min,max:o.max,tickAmount:5,labels:{formatter:fmt}},tooltip:{shared:true,intersect:false,custom:({dataPointIndex:i})=>`<div style="padding:10px 12px;font-size:13px"><div style="font-weight:600;margin-bottom:6px">${MN[i]}</div><div><span style="color:${C.old}">●</span> 2025: <b>${fmt(a[i])}</b></div><div><span style="color:${C.blue}">●</span> 2026: <b>${fmt(b[i])}</b></div><div style="margin-top:4px;color:${C.mute}">Difference: <b style="color:${C.ink}">${o.diff?o.diff(b[i]-a[i]):fmt(b[i]-a[i])}</b></div></div>`}});
 const sp=v=>(v>=0?"+":"−")+Math.abs(v).toFixed(1)+" pts";
 const HH="Household Subscription",RE="Restaurant",G3=y=>[y.total,y.ch[HH],y.ch[RE]],L3=["All sales","Households","Restaurants"];
 const gbar=(id,cats,a,b,fmt,dfmt)=>mk($("#"+id),{chart:{type:"bar",height:230},series:[{name:"2025 before",data:a},{name:"2026 with TrueCost",data:b}],colors:[C.old,C.blue],
  plotOptions:{bar:{columnWidth:"62%",borderRadius:3,borderRadiusApplication:"end",dataLabels:{position:"top"}}},
  dataLabels:{enabled:true,offsetY:-18,style:{fontSize:"10.5px",fontWeight:600,colors:[C.mute,C.ink]},formatter:v=>fmt(v)},
  legend:{show:true,position:"bottom",fontSize:"11.5px",markers:{size:5},itemMargin:{horizontal:8}},
  xaxis:{categories:cats,labels:{style:{colors:C.ink,fontSize:"11.5px",fontWeight:500}}},
  yaxis:{show:false,min:Math.min(...a,...b,0)*1.3,max:Math.max(...a,...b,0)*1.22||1},grid:{show:false,padding:{top:6,left:0,right:0}},
  tooltip:{shared:true,intersect:false,y:{formatter:v=>fmt(v)},custom:undefined},
  annotations:{xaxis:[]},states:{hover:{filter:{type:"darken",value:.92}}}}) ;
 const pp=v=>(+v).toFixed(1)+"%";
 gbar("x1b",L3,G3(Y.y25).map(t=>+t.tcu.toFixed(3)),G3(Y.y26).map(t=>+t.tcu.toFixed(3)),v=>"$"+(+v).toFixed(2));
 gbar("x2b",L3,G3(Y.y25).map(t=>+(t.cm*100).toFixed(1)),G3(Y.y26).map(t=>+(t.cm*100).toFixed(1)),pp);
 gbar("x3b",L3,[0,0,0],[1,1,1].map(()=>+(Y.y26.cov_avg*100).toFixed(1)),pp);
 gbar("x4b",L3,G3(Y.y25).map(t=>+(t.waste*100).toFixed(1)),G3(Y.y26).map(t=>+(t.waste*100).toFixed(1)),pp);
 gbar("x5b",["Households","Restaurants"],[+(Y.y25.ret_monthly[11]*100).toFixed(1),100],[+(Y.y26.ret_monthly[11]*100).toFixed(1),100],pp);
 gbar("x6b",L3,G3(Y.y25).map(t=>Math.round(t.np)),G3(Y.y26).map(t=>Math.round(t.np)),v=>kfmt(+v));
 line("x1",series(Y.y25,"tcu"),series(Y.y26,"tcu"),v=>"$"+(+v).toFixed(2),{min:2.5,max:4.5,diff:v=>(v<0?"−":"+")+"$"+Math.abs(v).toFixed(3)});
 line("x2",series(Y.y25,"cm").map(v=>v*100),series(Y.y26,"cm").map(v=>v*100),v=>(+v).toFixed(1)+"%",{min:30,max:70,diff:sp});
 line("x3",Y.y25.monthly.map(m=>m.cov*100),Y.y26.monthly.map(m=>m.cov*100),v=>(+v).toFixed(0)+"%",{step:true,min:0,max:100,diff:v=>"+"+v.toFixed(0)+" pts"});
 line("x4",series(Y.y25,"waste").map(v=>v*100),series(Y.y26,"waste").map(v=>v*100),v=>(+v).toFixed(1)+"%",{min:0,diff:sp});
 line("x5",ret(Y.y25).map(v=>v*100),ret(Y.y26).map(v=>v*100),v=>(+v).toFixed(1)+"%",{min:50,max:100,diff:sp});
 line("x6",series(Y.y25,"np"),series(Y.y26,"np"),v=>kfmt(+v),{diff:v=>(v>=0?"+":"−")+money(Math.abs(v))});
}

/* ---------- render ---------- */
function animateIn(){
 if(reduce||!window.gsap) return;
 gsap.killTweensOf(".head > div, .vtab, .kpi, .sec");
 gsap.fromTo(".head > div",{y:14,opacity:0},{y:0,opacity:1,duration:.5,ease:"power3.out",clearProps:"all"});
 gsap.fromTo(".kpi",{y:16,opacity:0},{y:0,opacity:1,duration:.55,stagger:.05,ease:"power3.out",delay:.08,clearProps:"all"});
 if(window.ScrollTrigger){ScrollTrigger.getAll().forEach(t=>t.kill());gsap.utils.toArray(".sec").forEach(s=>gsap.fromTo(s,{y:28,opacity:0},{y:0,opacity:1,duration:.7,ease:"power3.out",clearProps:"all",scrollTrigger:{trigger:s,start:"top 92%",once:true}}));}
}
function render(){
 timers.forEach(f=>f());timers.length=0;killCharts();
 sidebar();
 $("#app").innerHTML=view==="cmp"?cmpView():yearView();
 $$(".vtab").forEach(b=>b.onclick=()=>{view=b.dataset.v;try{history.replaceState(null,"","#"+view);}catch(_){}render();scrollTo({top:0,behavior:"smooth"});});
 stripInit(); view==="cmp"?cmpCharts():yearCharts(); animateIn();
}
$$("#chseg button").forEach(b=>b.onclick=()=>{ch=b.dataset.ch;$$("#chseg button").forEach(x=>x.setAttribute("aria-pressed",x===b));const y0=scrollY;render();scrollTo(0,y0);});
addEventListener("hashchange",()=>{const v=location.hash.slice(1);if(["y25","y26","cmp"].includes(v)&&v!==view){view=v;render();}});
if(window.gsap&&window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
render();
})();
