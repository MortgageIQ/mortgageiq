import { useState, useEffect, useRef, useCallback } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const STATE_TAX={AL:0.41,AK:1.04,AZ:0.62,AR:0.63,CA:0.75,CO:0.52,CT:2.14,DE:0.57,FL:0.89,GA:0.92,HI:0.28,ID:0.69,IL:2.27,IN:0.85,IA:1.57,KS:1.41,KY:0.86,LA:0.55,ME:1.36,MD:1.09,MA:1.23,MI:1.54,MN:1.12,MS:0.65,MO:1.01,MT:0.84,NE:1.73,NV:0.60,NH:2.18,NJ:2.49,NM:0.80,NY:1.72,NC:0.84,ND:0.98,OH:1.59,OK:0.90,OR:0.97,PA:1.58,RI:1.63,SC:0.57,SD:1.08,TN:0.71,TX:1.80,UT:0.63,VT:1.90,VA:0.82,WA:0.98,WV:0.59,WI:1.85,WY:0.61,DC:0.56};
const STATE_NAMES={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",DC:"Washington D.C."};

const LOAN_TYPES={
  conventional:{name:"Conventional",color:"#3B82F6",icon:"🏦",minDown:3,originFee:0.01,appraisal:500,titleRate:0.005,escrowRate:0.004,recording:125,inspection:400,upfrontMIP:0,annualMIP:0,fundingFee:0,guarantee:0,pmiRate:0.0085,pmiNote:"PMI required if <20% down. Drops at 80% LTV.",eligibility:"Available to most borrowers. Best rates with 620+ credit score.",pros:["No upfront mortgage insurance","PMI removable at 80% LTV","Flexible property types","Competitive rates with good credit"],cons:["PMI required under 20% down","Stricter credit requirements","Higher entry than FHA","PMI adds monthly cost"]},
  fha:{name:"FHA",color:"#10B981",icon:"🏛️",minDown:3.5,originFee:0.01,appraisal:550,titleRate:0.005,escrowRate:0.004,recording:125,inspection:400,upfrontMIP:0.0175,annualMIP:0.0055,fundingFee:0,guarantee:0,pmiRate:0,pmiNote:"MIP required for life of loan if <10% down.",eligibility:"580+ credit for 3.5% down. 500–579 needs 10% down. Great for first-time buyers.",pros:["Low 3.5% minimum down","Lenient credit requirements","Gift funds allowed","Assumable loan"],cons:["MIP for life of loan","1.75% upfront MIP","Loan limits apply","Property must meet FHA standards"]},
  va:{name:"VA",color:"#8B5CF6",icon:"🎖️",minDown:0,originFee:0.01,appraisal:525,titleRate:0.005,escrowRate:0.004,recording:125,inspection:400,upfrontMIP:0,annualMIP:0,fundingFee:0.023,guarantee:0,pmiRate:0,pmiNote:"No PMI — ever. One of the biggest VA benefits.",eligibility:"Active duty, veterans, and eligible surviving spouses. COE required.",pros:["Zero down payment","No PMI ever","Competitive rates","Funding fee can be financed"],cons:["VA funding fee 2.3%","Primary residence only","Service requirements","VA appraisal required"]},
  usda:{name:"USDA",color:"#F59E0B",icon:"🌾",minDown:0,originFee:0.01,appraisal:500,titleRate:0.005,escrowRate:0.004,recording:125,inspection:400,upfrontMIP:0,annualMIP:0.0035,fundingFee:0,guarantee:0.01,pmiRate:0,pmiNote:"Annual fee 0.35% instead of PMI.",eligibility:"Rural/suburban areas only. Income limits apply (~115% of area median).",pros:["Zero down payment","Low 0.35% annual fee","Below-market rates","Lower upfront than FHA"],cons:["Geographic restrictions","Income limits","1% upfront guarantee fee","Longer approval"]}
};

const TABS=["calc","afford","closing","compare","refi","leads"];
const TLABELS={calc:"🏠 Calculator",afford:"💰 Affordability",closing:"🧾 Closing Costs",compare:"⚖️ Compare",refi:"🔄 Refinance",leads:"📋 Get Quotes"};
const SUGG=["What can I afford on $85k/year?","Explain PMI and how to avoid it","15yr vs 30yr — which is better?","Should I put more money down?","What's a good DTI ratio?","How do mortgage points work?","FHA vs conventional loan?","What closing costs should I expect?"];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const $=(n)=>n==null||isNaN(n)||n===0?"$0":`$${Number(n).toLocaleString("en-US",{maximumFractionDigits:0})}`;
const commas=(n)=>n>0?Number(n).toLocaleString("en-US",{maximumFractionDigits:0}):"";

function pmt(p,r,y){
  if(!p||!r||!y)return 0;
  const mr=r/100/12,n=y*12;
  if(mr===0)return p/n;
  return(p*mr*Math.pow(1+mr,n))/(Math.pow(1+mr,n)-1);
}

function getT(dark){
  return dark
    ?{bg:"#080D18",surf:"#0F1628",surf2:"#162035",border:"#1E2D45",text:"#F1F5F9",muted:"#64748B",sub:"#94A3B8",accent:"#3B82F6",heroA:"#0A1528",heroB:"#1E3A8A",iB:"#162035",iBo:"#1E2D45",chatBg:"#0F1628",aiBg:"#162035",aiBo:"#1E2D45",green:"#10B981",red:"#EF4444",orange:"#F59E0B",shadow:"0 8px 32px rgba(0,0,0,0.5)"}
    :{bg:"#EEF2FF",surf:"#FFFFFF",surf2:"#F5F7FF",border:"#E0E7FF",text:"#0F172A",muted:"#64748B",sub:"#94A3B8",accent:"#1D4ED8",heroA:"#0F1F5C",heroB:"#1D4ED8",iB:"#FFFFFF",iBo:"#E0E7FF",chatBg:"#FFFFFF",aiBg:"#F5F7FF",aiBo:"#E0E7FF",green:"#059669",red:"#DC2626",orange:"#D97706",shadow:"0 4px 20px rgba(29,78,216,0.1)"};
}

// ─── NUM INPUT ────────────────────────────────────────────────────────────────
// Stores raw number externally; shows plain digits while focused, commas when blurred
function NumInput({value, onChange, prefix, suffix, placeholder, inputStyle}){
  const [editing, setEditing]=useState(false);
  const [draft, setDraft]=useState("");

  function handleFocus(){
    setEditing(true);
    setDraft(value>0?String(value):"");
  }
  function handleChange(e){
    const v=e.target.value.replace(/[^0-9.]/g,"");
    setDraft(v);
    const n=parseFloat(v);
    if(!isNaN(n))onChange(n);
    else if(v===""||v===".")onChange(0);
  }
  function handleBlur(){
    setEditing(false);
    setDraft("");
  }

  const display=editing?draft:(value>0?commas(value):"");

  return(
    <div style={{position:"relative"}}>
      {prefix&&<span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",fontSize:13,pointerEvents:"none",zIndex:1}}>{prefix}</span>}
      <input
        style={{...inputStyle,paddingLeft:prefix?24:14,paddingRight:suffix?28:14}}
        value={display}
        placeholder={placeholder||""}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        inputMode="decimal"
      />
      {suffix&&<span style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",fontSize:13,pointerEvents:"none"}}>{suffix}</span>}
    </div>
  );
}

// ─── EQUITY CHART ─────────────────────────────────────────────────────────────
function EquityChart({loan,rate,term,homePrice,T}){
  const [hIdx,setHIdx]=useState(null);
  const svgRef=useRef(null);
  if(!loan||!rate||!term)return null;

  // Layout — extra right padding for payment axis label
  const W=460,H=210,PL=56,PR=52,PT=16,PB=36;
  const iW=W-PL-PR,iH=H-PT-PB;

  // Build yearly data points including interest paid that year
  const pts=[];
  let bal=loan;
  const mr=rate/100/12,mo=pmt(loan,rate,term);

  for(let y=0;y<=term;y++){
    // Compute average monthly interest payment during this year
    let yearlyInterest=0,tempBal=bal;
    for(let m=0;m<12&&tempBal>0;m++){
      const ip=tempBal*mr;
      const pp=Math.min(mo-ip,tempBal);
      yearlyInterest+=ip;
      tempBal=Math.max(0,tempBal-pp);
    }
    const avgMonthlyInterest=Math.min(mo,y===0?bal*mr:yearlyInterest/12);
    pts.push({year:y,bal,eq:homePrice-bal,pct:((homePrice-bal)/homePrice)*100,moInt:avgMonthlyInterest,moPrin:Math.min(mo,mo-avgMonthlyInterest)});
    // Advance balance a full year
    for(let m=0;m<12&&bal>0;m++){const ip=bal*mr,pp=Math.min(mo-ip,bal);bal=Math.max(0,bal-pp);}
  }

  // Left axis: balance/equity scaled to homePrice
  const xS=i=>PL+(i/term)*iW;
  const yS=v=>PT+iH-(v/homePrice)*iH;

  // Right axis: monthly payment components (interest portion) scaled to mo
  const maxPmt=mo;
  const yPmt=v=>PT+iH-(v/maxPmt)*iH;

  // Paths
  const bPath=pts.map((p,i)=>`${i===0?"M":"L"}${xS(p.year).toFixed(1)},${yS(p.bal).toFixed(1)}`).join(" ");
  const ePath=pts.map((p,i)=>`${i===0?"M":"L"}${xS(p.year).toFixed(1)},${yS(p.eq).toFixed(1)}`).join(" ");
  const iPath=pts.map((p,i)=>`${i===0?"M":"L"}${xS(p.year).toFixed(1)},${yPmt(p.moInt).toFixed(1)}`).join(" ");
  const eArea=ePath+` L${xS(term).toFixed(1)},${yS(0).toFixed(1)} L${xS(0).toFixed(1)},${yS(0).toFixed(1)} Z`;
  const bArea=bPath+` L${xS(term).toFixed(1)},${(PT+iH).toFixed(1)} L${xS(0).toFixed(1)},${(PT+iH).toFixed(1)} Z`;

  // Ticks
  const yTicks=[0,0.25,0.5,0.75,1].map(f=>({v:homePrice*f,y:yS(homePrice*f)}));
  const pmtTicks=[0,0.25,0.5,0.75,1].map(f=>({v:maxPmt*f,y:yPmt(maxPmt*f)}));
  const xStep=term<=15?5:10;
  const xTicks=[];
  for(let i=0;i<=term;i+=xStep)xTicks.push({v:i,x:xS(i)});

  const hpt=hIdx!=null?pts[Math.min(hIdx,pts.length-1)]:null;

  return(
    <div style={{userSelect:"none"}}>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}
        onMouseMove={e=>{
          const r=svgRef.current?.getBoundingClientRect();
          if(!r)return;
          const x=(e.clientX-r.left)/r.width*W;
          setHIdx(Math.max(0,Math.min(term,Math.round((x-PL)/iW*term))));
        }}
        onMouseLeave={()=>setHIdx(null)}>
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25"/><stop offset="100%" stopColor="#3B82F6" stopOpacity="0.03"/></linearGradient>
          <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444" stopOpacity="0.12"/><stop offset="100%" stopColor="#EF4444" stopOpacity="0.02"/></linearGradient>
        </defs>

        {/* Left Y-axis grid + labels (balance/equity) */}
        {yTicks.map((t,i)=>(
          <g key={i}>
            <line x1={PL} y1={t.y} x2={PL+iW} y2={t.y} stroke={T.border} strokeWidth="1" strokeDasharray="3,4"/>
            <text x={PL-4} y={t.y+4} fontSize="7.5" fill={T.sub} textAnchor="end">
              {t.v>=1e6?`$${(t.v/1e6).toFixed(1)}M`:t.v>=1000?`$${(t.v/1000).toFixed(0)}k`:"$0"}
            </text>
          </g>
        ))}

        {/* Right Y-axis labels (monthly payment) */}
        {pmtTicks.filter((_,i)=>i>0).map((t,i)=>(
          <text key={i} x={PL+iW+4} y={t.y+4} fontSize="7.5" fill="#A78BFA" textAnchor="start">
            {t.v>=1000?`$${(t.v/1000).toFixed(1)}k`:`$${Math.round(t.v)}`}
          </text>
        ))}

        {/* Right axis line */}
        <line x1={PL+iW} y1={PT} x2={PL+iW} y2={PT+iH} stroke={T.border} strokeWidth="1"/>

        {/* X-axis labels */}
        {xTicks.map((t,i)=>(
          <text key={i} x={t.x} y={H-4} fontSize="7.5" fill={T.sub} textAnchor="middle">Yr {t.v}</text>
        ))}

        {/* Areas */}
        <path d={bArea} fill="url(#bg2)"/>
        <path d={eArea} fill="url(#eg)"/>

        {/* Lines */}
        <path d={bPath} fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d={ePath} fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinejoin="round"/>
        {/* Monthly interest payment line — dashed purple, right axis */}
        <path d={iPath} fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinejoin="round" strokeDasharray="5,3"/>

        {/* Hover crosshair + tooltip */}
        {hpt&&(()=>{
          const cx=xS(hpt.year);
          const cy1=yS(hpt.bal);
          const cy2=yS(hpt.eq);
          const cy3=yPmt(hpt.moInt);
          const tx=cx>W*0.58?cx-148:cx+8;
          const ty=Math.max(PT,Math.min(cy1,cy2,cy3)-6);
          return(
            <g>
              <line x1={cx} y1={PT} x2={cx} y2={PT+iH} stroke={T.muted} strokeWidth="1" strokeDasharray="3,3"/>
              <circle cx={cx} cy={cy1} r="3.5" fill="#EF4444" stroke="white" strokeWidth="1.5"/>
              <circle cx={cx} cy={cy2} r="3.5" fill="#3B82F6" stroke="white" strokeWidth="1.5"/>
              <circle cx={cx} cy={cy3} r="3.5" fill="#A78BFA" stroke="white" strokeWidth="1.5"/>
              <rect x={tx} y={ty} width="142" height="82" rx="7" fill={T.surf} stroke={T.border} strokeWidth="1"/>
              <text x={tx+9} y={ty+15} fontSize="9" fontWeight="700" fill={T.text}>Year {hpt.year}</text>
              <circle cx={tx+9} cy={ty+27} r="3" fill="#EF4444"/>
              <text x={tx+17} y={ty+31} fontSize="8" fill={T.muted}>{"Balance: "}<tspan fontWeight="600" fill="#EF4444">{$(hpt.bal)}</tspan></text>
              <circle cx={tx+9} cy={ty+43} r="3" fill="#3B82F6"/>
              <text x={tx+17} y={ty+47} fontSize="8" fill={T.muted}>{"Equity: "}<tspan fontWeight="600" fill="#3B82F6">{$(hpt.eq)}</tspan></text>
              <circle cx={tx+9} cy={ty+59} r="3" fill="#A78BFA"/>
              <text x={tx+17} y={ty+63} fontSize="8" fill={T.muted}>{"Int/mo: "}<tspan fontWeight="600" fill="#A78BFA">{$(hpt.moInt)}</tspan></text>
              <text x={tx+9} y={ty+77} fontSize="7" fill={T.sub}>{hpt.pct.toFixed(1)}% equity owned</text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div style={{display:"flex",gap:18,justifyContent:"center",marginTop:8,flexWrap:"wrap"}}>
        {[
          {c:"#3B82F6",l:"Equity",dash:false},
          {c:"#EF4444",l:"Balance",dash:false},
          {c:"#A78BFA",l:"Monthly Interest",dash:true},
        ].map(x=>(
          <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.muted}}>
            <svg width="18" height="6" style={{flexShrink:0}}>
              <line x1="0" y1="3" x2="18" y2="3" stroke={x.c} strokeWidth="2.5" strokeDasharray={x.dash?"5,3":"none"} strokeLinecap="round"/>
            </svg>
            {x.l}
          </div>
        ))}
      </div>
      <div style={{fontSize:10.5,color:T.sub,textAlign:"center",marginTop:5,lineHeight:1.4}}>
        The purple line shows how your monthly interest cost shrinks as your balance decreases — your payment stays fixed but more goes to principal over time.
      </div>
    </div>
  );
}

// ─── CLOSING COSTS ────────────────────────────────────────────────────────────
function ClosingCosts({hp,dp,T}){
  const [sel,setSel]=useState("conventional");
  const loan=Math.max(0,hp-dp);
  const dpPct=hp>0?(dp/hp)*100:0;

  function costs(key){
    const lt=LOAN_TYPES[key];
    const origin=loan*lt.originFee;
    const title=hp*lt.titleRate;
    const escrow=loan*lt.escrowRate;
    const prepaid=Math.round(loan*0.005+1200);
    const upfront=loan*(lt.upfrontMIP+lt.fundingFee+lt.guarantee);
    const sub=origin+lt.appraisal+title+escrow+lt.recording+lt.inspection+upfront+prepaid;
    const mmi=key==="conventional"&&dpPct<20?Math.round((loan*lt.pmiRate)/12):Math.round((loan*lt.annualMIP)/12);
    return{origin,title,escrow,prepaid,upfront,sub,mmi,appraisal:lt.appraisal,recording:lt.recording,inspection:lt.inspection};
  }

  const curr=LOAN_TYPES[sel];
  const c=costs(sel);
  const all=Object.keys(LOAN_TYPES).map(k=>({k,...costs(k)}));
  const IS2={background:T.iB,border:`1.5px solid ${T.iBo}`,borderRadius:10,padding:"10px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:14,color:T.text,width:"100%",outline:"none"};
  const rows=[
    {l:"Loan Origination (1%)",v:c.origin,note:"Lender processing fee"},
    {l:"Appraisal",v:c.appraisal,note:"Required by all lenders"},
    {l:"Title Insurance & Search",v:c.title,note:"Protects ownership rights"},
    {l:"Escrow / Settlement",v:c.escrow,note:"Third-party closing agent"},
    {l:"Recording Fees",v:c.recording,note:"County/municipal"},
    {l:"Home Inspection",v:c.inspection,note:"Highly recommended"},
    {l:"Prepaid (tax, ins, int)",v:c.prepaid,note:"Upfront escrow reserves"},
    ...(c.upfront>0?[{l:sel==="fha"?"Upfront MIP (1.75%)":sel==="va"?"VA Funding Fee (2.3%)":"USDA Guarantee Fee (1%)",v:c.upfront,note:"Program fee",hi:true}]:[]),
  ];

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
        {Object.entries(LOAN_TYPES).map(([k,lt])=>{
          const cv=costs(k);const active=sel===k;
          return(
            <button key={k} onClick={()=>setSel(k)}
              style={{background:active?lt.color+"18":T.surf,border:`2px solid ${active?lt.color:T.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
              <div style={{fontSize:18,marginBottom:3}}>{lt.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:active?lt.color:T.text,marginBottom:2}}>{lt.name}</div>
              <div style={{fontSize:11,color:T.muted}}>Closing: <span style={{fontWeight:600,color:active?lt.color:T.text}}>{$(cv.sub)}</span></div>
              <div style={{fontSize:10,color:T.sub,marginTop:1}}>Min down: {lt.minDown}%</div>
            </button>
          );
        })}
      </div>
      <div style={{background:curr.color+"12",border:`1px solid ${curr.color}30`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12.5,color:T.muted,lineHeight:1.55}}>
        <strong style={{color:curr.color}}>Eligibility: </strong>{curr.eligibility}
      </div>
      <div style={{background:T.surf,borderRadius:12,border:`1px solid ${T.border}`,marginBottom:12,overflow:"hidden"}}>
        <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.sub,letterSpacing:"1.5px",textTransform:"uppercase"}}>Itemized — {curr.name} Loan</div>
        {rows.map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 14px",borderBottom:i<rows.length-1?`1px solid ${T.border}`:undefined}}>
            <div>
              <div style={{fontSize:12.5,color:r.hi?T.orange:T.text,fontWeight:r.hi?600:400}}>{r.l}</div>
              <div style={{fontSize:10,color:T.sub}}>{r.note}</div>
            </div>
            <div style={{fontSize:13,fontWeight:600,color:r.hi?T.orange:T.text,marginLeft:8,flexShrink:0}}>{$(r.v)}</div>
          </div>
        ))}
        <div style={{padding:"9px 14px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",background:T.surf2}}>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>Total Est. Closing Costs</span>
          <span style={{fontSize:16,fontWeight:700,color:curr.color}}>{$(c.sub)}</span>
        </div>
      </div>
      {c.mmi>0&&(
        <div style={{background:T.orange+"10",border:`1px solid ${T.orange}30`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12.5,color:T.muted}}>
          <strong style={{color:T.orange}}>⚠️ Ongoing: </strong>{$(c.mmi)}/mo {sel==="conventional"?"PMI":sel==="fha"?"MIP":"Annual Fee"} — {curr.pmiNote}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div style={{background:T.green+"0E",border:`1px solid ${T.green}30`,borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.green,marginBottom:6}}>✓ PROS</div>
          {curr.pros.map((p,i)=><div key={i} style={{fontSize:11.5,color:T.muted,marginBottom:3,lineHeight:1.4}}>• {p}</div>)}
        </div>
        <div style={{background:T.red+"08",border:`1px solid ${T.red}20`,borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.red,marginBottom:6}}>✗ CONS</div>
          {curr.cons.map((c2,i)=><div key={i} style={{fontSize:11.5,color:T.muted,marginBottom:3,lineHeight:1.4}}>• {c2}</div>)}
        </div>
      </div>
      <div style={{background:T.surf,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,fontSize:10,fontWeight:700,color:T.sub,letterSpacing:"1.5px",textTransform:"uppercase"}}>Side-by-Side Comparison</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
            <thead><tr style={{background:T.surf2}}>
              {["Loan Type","Min Down","Closing","Upfront Fee","Monthly MI"].map(h=>(
                <th key={h} style={{padding:"7px 11px",textAlign:h==="Loan Type"?"left":"right",color:T.sub,fontWeight:600}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{all.map(row=>{
              const lt=LOAN_TYPES[row.k];const active=row.k===sel;
              return(
                <tr key={row.k} onClick={()=>setSel(row.k)} style={{background:active?lt.color+"10":"transparent",cursor:"pointer",transition:"background .15s"}}>
                  <td style={{padding:"7px 11px"}}><span style={{marginRight:5}}>{lt.icon}</span><span style={{fontWeight:active?700:500,color:active?lt.color:T.text}}>{lt.name}</span></td>
                  <td style={{padding:"7px 11px",textAlign:"right",color:T.muted}}>{lt.minDown}%</td>
                  <td style={{padding:"7px 11px",textAlign:"right",fontWeight:600,color:active?lt.color:T.text}}>{$(row.sub)}</td>
                  <td style={{padding:"7px 11px",textAlign:"right",color:T.muted}}>{$(row.upfront)}</td>
                  <td style={{padding:"7px 11px",textAlign:"right",color:row.mmi>0?T.orange:T.green}}>{row.mmi>0?`${$(row.mmi)}/mo`:"None ✓"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function MortgageIQ(){
  const [dark,setDark]=useState(()=>typeof window!=="undefined"?window.matchMedia("(prefers-color-scheme: dark)").matches:false);
  useEffect(()=>{
    const mq=window.matchMedia("(prefers-color-scheme: dark)");
    const h=e=>setDark(e.matches);
    mq.addEventListener("change",h);
    return()=>mq.removeEventListener("change",h);
  },[]);

  const T=getT(dark);

  // All raw-number state
  const [hp,setHp]=useState(450000);
  const [dp,setDp]=useState(90000);
  const [rate,setRate]=useState(6.8);
  const [tPreset,setTPreset]=useState(30);
  const [customT,setCustomT]=useState(25);
  const [useCustom,setUseCustom]=useState(false);
  const [taxMo,setTaxMo]=useState(375);
  const [taxOverride,setTaxOverride]=useState(false);
  const [ins,setIns]=useState(125);
  const [selState,setSelState]=useState("");
  const [calcTab,setCalcTab]=useState("breakdown");
  const [toolTab,setToolTab]=useState("calc");

  const [income,setIncome]=useState(90000);
  const [debts,setDebts]=useState(400);
  const [affDp,setAffDp]=useState(20);
  const [affRate,setAffRate]=useState(6.8);
  const [affTerm,setAffTerm]=useState(30);

  const [cHp,setCHp]=useState(450000);
  const [cDp,setCDp]=useState(90000);
  const [r15,setR15]=useState(6.1);
  const [r30,setR30]=useState(6.8);

  const [rBal,setRBal]=useState(380000);
  const [rOld,setROld]=useState(7.5);
  const [rNew,setRNew]=useState(6.3);
  const [rTerm,setRTerm]=useState(30);
  const [rCost,setRCost]=useState(4500);

  const [lName,setLName]=useState("");
  const [lEmail,setLEmail]=useState("");
  const [lPhone,setLPhone]=useState("");
  const [lDone,setLDone]=useState(false);

  const [msgs,setMsgs]=useState([{role:"assistant",content:"Hi! I'm your MortgageIQ advisor. I can see your calculator numbers and I'm here to help with any mortgage questions. What would you like to know?"}]);
  const [chatIn,setChatIn]=useState("");
  const [chatLoad,setChatLoad]=useState(false);
  const endRef=useRef(null);

  // Derived
  const dpPct=hp>0?(dp/hp)*100:0;
  const loan=Math.max(0,hp-dp);
  const effT=useCustom?(customT||30):tPreset;
  const moPI=pmt(loan,rate,effT);
  const stateTaxEst=selState?Math.round((hp*(STATE_TAX[selState]||1))/100/12):0;
  const taxN=taxOverride?taxMo:(selState?stateTaxEst:taxMo);
  const pmi=dpPct<20&&loan>0?Math.round((loan*0.0085)/12):0;
  const total=moPI+taxN+ins+pmi;
  const totalInt=moPI*effT*12-loan;

  useEffect(()=>{
    if(selState&&!taxOverride)setTaxMo(Math.round((hp*(STATE_TAX[selState]||1))/100/12));
  },[selState,hp]);

  function buildAmort(p,r,y){
    const rows=[];let bal=p;const mr=r/100/12,mo=pmt(p,r,y);
    for(let i=1;i<=y*12&&bal>0;i++){
      const ip=bal*mr,pp=Math.min(mo-ip,bal);bal=Math.max(0,bal-pp);
      if(i<=12||i%12===0)rows.push({m:i,ip,pp,bal});
    }
    return rows;
  }
  const amort=buildAmort(loan,rate,effT);

  // Affordability
  const grossMo=income/12;
  const maxTot=grossMo*0.36-debts;
  const maxPI=maxTot-375-125;
  const affDpF=affDp/100;
  const maxLoan=(()=>{const mr=affRate/100/12,n=affTerm*12;if(mr===0||maxPI<=0)return 0;return maxPI*(Math.pow(1+mr,n)-1)/(mr*Math.pow(1+mr,n));})();
  const maxHome=affDpF<1?maxLoan/(1-affDpF):0;

  // Compare
  const cLoan=Math.max(0,cHp-cDp);
  const mo15=pmt(cLoan,r15,15),mo30=pmt(cLoan,r30,30);
  const int15=mo15*180-cLoan,int30=mo30*360-cLoan;

  // Refi
  const oldPmt=pmt(rBal,rOld,rTerm),newPmt=pmt(rBal,rNew,rTerm);
  const moSave=oldPmt-newPmt;
  const breakEven=moSave>0?Math.ceil(rCost/moSave):null;

  // Equity at N months
  function eqAt(months){
    let b=loan,mr=rate/100/12,mo=pmt(loan,rate,effT);
    for(let i=0;i<months&&b>0;i++){const ip=b*mr,pp=Math.min(mo-ip,b);b=Math.max(0,b-pp);}
    return hp-b;
  }

  const SYS=`You are MortgageIQ, a friendly expert mortgage advisor AI. Be concise (≤150 words unless truly needed), clear, warm.
Calculator: Home ${$(hp)} | Down ${$(dp)} (${dpPct.toFixed(1)}%) | Loan ${$(loan)} | Rate ${rate}% | Term ${effT}yr
Monthly: P&I ${$(moPI)} | Tax ${$(taxN)} | Ins ${$(ins)} | PMI ${$(pmi)} | Total ${$(total)}${selState?` | State: ${STATE_NAMES[selState]} (${STATE_TAX[selState]}% avg)`:""}`;

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const send=useCallback(async(txt)=>{
    const msg=txt||chatIn.trim();if(!msg||chatLoad)return;
    setChatIn("");
    const next=[...msgs,{role:"user",content:msg}];setMsgs(next);setChatLoad(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:SYS,messages:next.map(m=>({role:m.role,content:m.content}))})});
      const d=await res.json();
      setMsgs([...next,{role:"assistant",content:d.content?.map(c=>c.text||"").join("")||"Try again."}]);
    }catch{setMsgs([...next,{role:"assistant",content:"Something went wrong. Please try again."}]);}
    finally{setChatLoad(false);}
  },[chatIn,msgs,chatLoad,SYS]);

  // Style objects — defined here but NOT as components, just plain objects
  const IS={background:T.iB,border:`1.5px solid ${T.iBo}`,borderRadius:10,padding:"10px 14px",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,color:T.text,width:"100%",outline:"none",transition:"border-color .15s"};

  // Term button renderer — plain function, not a React component
  function termBtns(val,setVal,terms,withCustom){
    return(
      <div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {terms.map(y=>(
            <button key={y} onClick={()=>{setVal(y);if(withCustom)setUseCustom(false);}}
              style={{flex:1,minWidth:44,padding:"8px 4px",borderRadius:8,border:`1.5px solid ${!useCustom&&val===y?T.accent:T.border}`,background:!useCustom&&val===y?T.accent:"transparent",color:!useCustom&&val===y?"white":T.muted,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12.5,fontWeight:500,transition:"all .15s"}}>
              {y}yr
            </button>
          ))}
          {withCustom&&(
            <button onClick={()=>setUseCustom(true)}
              style={{flex:1,minWidth:52,padding:"8px 6px",borderRadius:8,border:`1.5px solid ${useCustom?T.accent:T.border}`,background:useCustom?T.accent:"transparent",color:useCustom?"white":T.muted,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12.5,fontWeight:500,transition:"all .15s"}}>
              Custom
            </button>
          )}
        </div>
        {withCustom&&useCustom&&(
          <div style={{marginTop:8}}>
            <NumInput value={customT} onChange={setCustomT} suffix="yrs" placeholder="e.g. 25" inputStyle={IS}/>
          </div>
        )}
      </div>
    );
  }

  // Stat card — plain function returning JSX (not a React component)
  function statCard(l,v,s,c){
    return(
      <div style={{background:T.surf2,borderRadius:10,border:`1px solid ${T.border}`,padding:"13px 15px"}}>
        <div style={{fontSize:10,color:T.sub,marginBottom:3,fontWeight:600}}>{l}</div>
        <div style={{fontSize:17,fontFamily:"Fraunces,serif",fontWeight:700,color:c||T.text}}>{v}</div>
        {s&&<div style={{fontSize:10,color:T.sub,marginTop:2}}>{s}</div>}
      </div>
    );
  }

  const lbl={fontSize:11,fontWeight:600,color:T.sub,display:"block",marginBottom:5,letterSpacing:"0.3px"};
  const SH={fontSize:10,fontWeight:700,color:T.sub,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:14};
  const card=(children,extra={})=><div style={{background:T.surf,borderRadius:14,border:`1px solid ${T.border}`,overflow:"hidden",...extra}}>{children}</div>;

  function NI(l,val,setVal,opts={}){
    return(
      <div>
        <label style={lbl}>{l}{opts.extra}</label>
        <NumInput value={val} onChange={setVal} prefix={opts.pre} suffix={opts.suf} placeholder={opts.ph} inputStyle={IS}/>
      </div>
    );
  }

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        input:focus,textarea:focus,select:focus{outline:none;border-color:#3B82F6!important;box-shadow:0 0 0 3px rgba(59,130,246,0.1)!important;}
        select option{background:#1C2538}
        .dot{width:5px;height:5px;border-radius:50%;animation:bd 1.2s infinite;display:inline-block;background:#94A3B8}
        .d2{animation-delay:.2s}.d3{animation-delay:.4s}
        @keyframes bd{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        .sbtn{background:#3B82F6;border:none;border-radius:9px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
        .sbtn:hover:not(:disabled){background:#2563EB;transform:scale(1.04)}
        .sbtn:disabled{background:#475569;cursor:not-allowed}
        .atr:nth-child(even){background:rgba(59,130,246,0.02)}.atr:hover{background:rgba(59,130,246,0.05)}
        .tog{width:42px;height:23px;border-radius:12px;border:none;cursor:pointer;position:relative;transition:background .2s;padding:0;flex-shrink:0}
        .knob{width:17px;height:17px;background:white;border-radius:50%;position:absolute;top:3px;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,0.25);pointer-events:none}
        .chip{border-radius:18px;padding:5px 12px;font-size:11.5px;font-family:'DM Sans',sans-serif;cursor:pointer;white-space:nowrap;transition:all .15s;border:1.5px solid}
        .chip:hover{border-color:#3B82F6!important;color:#3B82F6!important}
        input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;border:none!important;box-shadow:none!important;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;background:#3B82F6;border-radius:50%;cursor:pointer;border:2px solid white;box-shadow:0 1px 4px rgba(59,130,246,0.35)}
        .ttab{padding:6px 13px;border-radius:7px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;transition:all .15s;white-space:nowrap}
        .hero{font-size:44px;font-family:'Fraunces',serif;font-weight:700;color:white;letter-spacing:-2px;line-height:1}
      `}</style>

      {/* HEADER */}
      <div style={{background:T.surf,borderBottom:`1px solid ${T.border}`,padding:"0 18px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:T.shadow,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"white",fontSize:13,fontWeight:700,fontFamily:"Fraunces,serif"}}>M</span>
          </div>
          <span style={{fontFamily:"Fraunces,serif",fontWeight:700,fontSize:17,color:T.text,letterSpacing:"-0.3px"}}>MortgageIQ</span>
          <span style={{background:dark?"rgba(59,130,246,0.18)":"#EFF6FF",color:"#3B82F6",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20}}>BETA</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:12,color:T.muted}}>30yr avg: <strong style={{color:"#3B82F6"}}>6.33%</strong></span>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{fontSize:13}}>{dark?"🌙":"☀️"}</span>
            <button className="tog" onClick={()=>setDark(d=>!d)} style={{background:dark?"#3B82F6":"#CBD5E1"}}>
              <div className="knob" style={{left:dark?"22px":"3px"}}/>
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{background:T.surf,borderBottom:`1px solid ${T.border}`,padding:"0 16px",display:"flex",gap:2,overflowX:"auto",flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t} className="ttab" onClick={()=>setToolTab(t)}
            style={{background:toolTab===t?T.accent:"transparent",color:toolTab===t?"white":T.muted,margin:"7px 0"}}>
            {TLABELS[t]}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>

        {/* LEFT */}
        <div style={{width:500,flexShrink:0,overflowY:"auto",padding:16,borderRight:`1px solid ${T.border}`,background:T.bg}}>

          {/* ══ CALCULATOR ══ */}
          {toolTab==="calc"&&<>
            {/* Hero */}
            <div style={{background:`linear-gradient(135deg,${T.heroA},${T.heroB})`,borderRadius:16,padding:20,marginBottom:14,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:140,height:140,background:"rgba(255,255,255,0.025)",borderRadius:"50%"}}/>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:4}}>Est. Monthly Payment</div>
              <div className="hero">{total>0?$(total):"—"}</div>
              <div style={{fontSize:11.5,color:"rgba(255,255,255,0.45)",marginTop:5}}>{$(moPI)} P&I · {$(taxN)} tax · {$(ins)} ins{pmi>0?` · ${$(pmi)} PMI`:""}</div>
              {total>0&&<div style={{marginTop:13,height:4,borderRadius:2,overflow:"hidden",display:"flex",gap:1}}>
                {[{v:moPI,c:"#60A5FA"},{v:taxN,c:"#93C5FD"},{v:ins,c:"#BFDBFE"},{v:pmi,c:T.orange}].filter(x=>x.v>0).map((x,i)=>(
                  <div key={i} style={{flex:x.v/total,background:x.c}}/>
                ))}
              </div>}
            </div>

            {/* Inputs */}
            {card(<>
              <div style={{padding:16}}>
                <div style={SH}>Loan Details</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
                  {NI("Home Price",hp,v=>{setHp(v);if(selState&&!taxOverride)setTaxMo(Math.round((v*(STATE_TAX[selState]||1))/100/12));},{pre:"$"})}
                  {NI("Down Payment",dp,setDp,{pre:"$",extra:<span style={{color:dpPct>=20?T.green:T.orange,fontWeight:700,marginLeft:5}}>{dpPct.toFixed(1)}%</span>})}
                </div>
                <div style={{marginBottom:11}}>
                  <input type="range" min={0} max={hp||600000} step={1000} value={dp}
                    onChange={e=>setDp(parseFloat(e.target.value))}
                    style={{background:`linear-gradient(to right,#3B82F6 ${Math.min(dpPct,100)}%,${dark?"#2D3F5A":"#E0E7FF"} ${Math.min(dpPct,100)}%)`}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.sub,marginTop:2}}>
                    <span>0%</span><span style={{color:T.green,fontWeight:600}}>20% = no PMI</span><span>50%</span>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
                  {NI("Interest Rate",rate,setRate,{suf:"%"})}
                  <div>
                    <label style={lbl}>Loan Term</label>
                    {termBtns(tPreset,setTPreset,[10,15,20,30],true)}
                  </div>
                </div>
                <div style={{marginBottom:11}}>
                  <label style={lbl}>State <span style={{color:T.sub,fontWeight:400}}>(auto-estimates property tax)</span></label>
                  <select style={{...IS,cursor:"pointer"}} value={selState} onChange={e=>{setSelState(e.target.value);setTaxOverride(false);}}>
                    <option value="">— Select State —</option>
                    {Object.entries(STATE_NAMES).sort((a,b)=>a[1].localeCompare(b[1])).map(([k,v])=>(
                      <option key={k} value={k}>{v} — {STATE_TAX[k]}% avg</option>
                    ))}
                  </select>
                  {selState&&<div style={{fontSize:11,color:T.green,marginTop:4}}>✓ Using {STATE_TAX[selState]}% avg for {STATE_NAMES[selState]}</div>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
                  {NI("Property Tax /mo",taxN,v=>{setTaxMo(v);setTaxOverride(true);},{pre:"$",ph:selState?String(stateTaxEst):"375"})}
                  {NI("Home Insurance /mo",ins,setIns,{pre:"$"})}
                </div>
                {pmi>0&&<div style={{background:dark?"rgba(245,158,11,0.08)":"#FFFBEB",border:`1px solid ${dark?"rgba(245,158,11,0.25)":"#FDE68A"}`,borderRadius:8,padding:"9px 13px",fontSize:12,color:T.orange,marginTop:11}}>
                  ⚠️ PMI {$(pmi)}/mo — below 20% down. Ask the AI how to eliminate it.
                </div>}
              </div>
            </>,{marginBottom:12})}

            {/* Sub tabs */}
            {card(<>
              <div style={{padding:"9px 13px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:3}}>
                {["breakdown","amortization","summary"].map(t=>(
                  <button key={t} className="ttab" onClick={()=>setCalcTab(t)}
                    style={{background:calcTab===t?T.accent:"transparent",color:calcTab===t?"white":T.muted,fontSize:11.5,padding:"5px 12px"}}>
                    {t==="breakdown"?"Breakdown":t==="amortization"?"Amortization":"Summary"}
                  </button>
                ))}
              </div>
              <div style={{padding:14}}>
                {calcTab==="breakdown"&&<>
                  {[{l:"Principal & Interest",v:moPI,c:"#3B82F6"},{l:"Property Tax",v:taxN,c:"#60A5FA"},{l:"Home Insurance",v:ins,c:"#93C5FD"},...(pmi>0?[{l:"PMI",v:pmi,c:T.orange}]:[])].map(x=>(
                    <div key={x.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:8,height:8,borderRadius:2,background:x.c}}/>
                        <span style={{fontSize:13,color:T.muted}}>{x.l}</span>
                      </div>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontSize:11,color:T.sub}}>{total>0?((x.v/total)*100).toFixed(0):0}%</span>
                        <span style={{fontSize:14,fontWeight:600,color:T.text,minWidth:64,textAlign:"right"}}>{$(x.v)}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",paddingTop:10}}>
                    <span style={{fontSize:13,fontWeight:600,color:T.text}}>Total Monthly</span>
                    <span style={{fontSize:16,fontWeight:700,color:T.accent}}>{$(total)}</span>
                  </div>
                </>}
                {calcTab==="amortization"&&<div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                    <thead><tr style={{color:T.sub}}>{["Mo.","Principal","Interest","Balance"].map(h=><th key={h} style={{padding:"5px 7px",fontWeight:600,textAlign:"left"}}>{h}</th>)}</tr></thead>
                    <tbody>{amort.slice(0,24).map(row=>(
                      <tr key={row.m} className="atr">
                        <td style={{padding:"5px 7px",color:T.sub}}>{row.m}</td>
                        <td style={{padding:"5px 7px",color:T.green,fontWeight:500}}>{$(row.pp)}</td>
                        <td style={{padding:"5px 7px",color:T.red}}>{$(row.ip)}</td>
                        <td style={{padding:"5px 7px",color:T.text,fontWeight:500}}>{$(row.bal)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>}
                {calcTab==="summary"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                  {statCard("Loan Amount",$(loan),`${(100-dpPct).toFixed(1)}% financed`)}
                  {statCard("Total Interest",$(Math.max(0,totalInt)),"over loan life",T.red)}
                  {statCard("Total Cost",$(loan+Math.max(0,totalInt)),"principal + interest")}
                  {statCard("Loan Term",`${effT} yrs`,useCustom?"custom":"preset")}
                </div>}
              </div>
            </>,{marginBottom:14})}

            {/* Equity chart */}
            {loan>0&&rate>0&&card(<>
              <div style={{padding:"14px 16px 0"}}>
                <div style={SH}>Equity, Balance, & Monthly Payment Over Time</div>
                <div style={{fontSize:12,color:T.muted,marginBottom:10,lineHeight:1.5}}>Hover over the chart to see your balance, equity, and monthly interest cost at any year.</div>
              </div>
              <div style={{padding:"0 16px"}}>
                <EquityChart loan={loan} rate={rate} term={effT} homePrice={hp||loan} T={T}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:16}}>
                <div style={{background:T.surf2,borderRadius:8,padding:"10px 12px",border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:10,color:T.sub,marginBottom:2}}>Equity at Yr 5</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#3B82F6"}}>{$(eqAt(60))}</div>
                </div>
                <div style={{background:T.surf2,borderRadius:8,padding:"10px 12px",border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:10,color:T.sub,marginBottom:2}}>Equity at Yr 10</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#3B82F6"}}>{$(eqAt(120))}</div>
                </div>
                <div style={{background:T.surf2,borderRadius:8,padding:"10px 12px",border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:10,color:T.sub,marginBottom:2}}>Full Payoff</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.green}}>{$(hp)}</div>
                </div>
              </div>
            </>)}
          </>}

          {/* ══ AFFORDABILITY ══ */}
          {toolTab==="afford"&&<>
            {card(<div style={{padding:16}}>
              <div style={SH}>How Much Can You Afford?</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
                {NI("Annual Income",income,setIncome,{pre:"$"})}
                {NI("Monthly Debts",debts,setDebts,{pre:"$"})}
                {NI("Down Payment %",affDp,setAffDp,{suf:"%"})}
                {NI("Interest Rate",affRate,setAffRate,{suf:"%"})}
              </div>
              <label style={lbl}>Loan Term</label>
              {termBtns(affTerm,setAffTerm,[15,20,30],false)}
            </div>,{marginBottom:12})}
            <div style={{background:`linear-gradient(135deg,${T.heroA},${T.heroB})`,borderRadius:16,padding:20,marginBottom:12}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:4}}>Max Home Price</div>
              <div className="hero">{maxHome>0?$(maxHome):"—"}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:4}}>Based on 36% debt-to-income guideline</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {statCard("Max Loan Amount",$(Math.max(0,maxLoan)))}
              {statCard("Max Monthly P&I",$(Math.max(0,maxPI)))}
              {statCard("Down Payment Needed",$(maxHome*affDpF))}
              {statCard("DTI Budget Left",maxTot>0?$(maxTot):"Over limit",null,maxTot<=0?T.red:T.text)}
            </div>
          </>}

          {/* ══ CLOSING COSTS ══ */}
          {toolTab==="closing"&&<ClosingCosts hp={hp} dp={dp} T={T}/>}

          {/* ══ COMPARE ══ */}
          {toolTab==="compare"&&<>
            {card(<div style={{padding:16}}>
              <div style={SH}>15 vs 30 Year Comparison</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
                {NI("Home Price",cHp,setCHp,{pre:"$"})}
                {NI("Down Payment",cDp,setCDp,{pre:"$"})}
                {NI("15yr Rate",r15,setR15,{suf:"%"})}
                {NI("30yr Rate",r30,setR30,{suf:"%"})}
              </div>
            </div>,{marginBottom:12})}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[{l:"15-Year",mo:mo15,int:int15,c:"#3B82F6",tot:mo15*180},{l:"30-Year",mo:mo30,int:int30,c:"#8B5CF6",tot:mo30*360}].map(x=>(
                <div key={x.l} style={{background:T.surf,borderRadius:14,border:`2px solid ${x.c}33`,padding:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:x.c,marginBottom:8}}>{x.l}</div>
                  <div style={{fontSize:26,fontFamily:"Fraunces,serif",fontWeight:700,color:T.text,marginBottom:3}}>{$(x.mo)}<span style={{fontSize:12,color:T.sub}}>/mo</span></div>
                  <div style={{fontSize:12,color:T.muted,marginBottom:2}}>Interest: <span style={{color:T.red,fontWeight:600}}>{$(Math.max(0,x.int))}</span></div>
                  <div style={{fontSize:12,color:T.muted}}>Total paid: <span style={{fontWeight:600,color:T.text}}>{$(x.tot)}</span></div>
                </div>
              ))}
            </div>
            {mo15>0&&mo30>0&&<div style={{background:dark?"rgba(16,185,129,0.08)":"#ECFDF5",border:`1px solid ${dark?"rgba(16,185,129,0.2)":"#BBF7D0"}`,borderRadius:12,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,color:T.green,marginBottom:4}}>💡 15yr saves you in total interest</div>
              <div style={{fontSize:26,fontFamily:"Fraunces,serif",fontWeight:700,color:T.green}}>{$(Math.max(0,int30-int15))}</div>
              <div style={{fontSize:12,color:T.muted,marginTop:4}}>Monthly is {$(mo15-mo30)} more. Ask the AI if 15yr fits your budget.</div>
            </div>}
          </>}

          {/* ══ REFINANCE ══ */}
          {toolTab==="refi"&&<>
            {card(<div style={{padding:16}}>
              <div style={SH}>Refinance Break-Even Calculator</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
                {NI("Current Balance",rBal,setRBal,{pre:"$"})}
                {NI("Closing Costs",rCost,setRCost,{pre:"$"})}
                {NI("Current Rate",rOld,setROld,{suf:"%"})}
                {NI("New Rate",rNew,setRNew,{suf:"%"})}
              </div>
              <label style={lbl}>New Term</label>
              {termBtns(rTerm,setRTerm,[15,20,30],false)}
            </div>,{marginBottom:12})}
            <div style={{background:`linear-gradient(135deg,${T.heroA},${T.heroB})`,borderRadius:16,padding:20,marginBottom:12}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:4}}>Monthly Savings</div>
              <div style={{fontSize:44,fontFamily:"Fraunces,serif",fontWeight:700,color:moSave>0?"#4ADE80":"#F87171",letterSpacing:"-2px",lineHeight:1}}>{$(Math.abs(moSave))}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:4}}>{$(oldPmt)}/mo → {$(newPmt)}/mo</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {statCard("Break-Even Point",breakEven?`${breakEven} months`:"Not beneficial",null,breakEven&&breakEven<=36?T.green:T.red)}
              {statCard("Break-Even Years",breakEven?`${(breakEven/12).toFixed(1)} yrs`:"—")}
              {statCard("5yr Net Savings",moSave>0?$(moSave*60-rCost):"—",null,T.green)}
              {statCard("Rate Reduction",`${(rOld-rNew).toFixed(2)}%`,null,rOld>rNew?T.green:T.red)}
            </div>
          </>}

          {/* ══ LEADS ══ */}
          {toolTab==="leads"&&(!lDone
            ?card(<div style={{padding:20}}>
                <div style={{fontFamily:"Fraunces,serif",fontWeight:700,fontSize:22,color:T.text,marginBottom:6,lineHeight:1.2}}>Get personalized lender quotes</div>
                <div style={{fontSize:13.5,color:T.muted,lineHeight:1.65,marginBottom:14}}>Connect with vetted lenders who compete for your loan. No obligation — just real rates.</div>
                <div style={{background:dark?"rgba(59,130,246,0.1)":"#EFF6FF",borderRadius:10,padding:"11px 14px",marginBottom:16,fontSize:13,color:"#3B82F6"}}>
                  📊 <strong>{$(loan)}</strong> at <strong>{rate}%</strong> for <strong>{effT}yr</strong> = <strong>{$(moPI)}/mo P&I</strong>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:11}}>
                  <div><label style={lbl}>Full Name</label><input style={IS} placeholder="Jane Smith" value={lName} onChange={e=>setLName(e.target.value)}/></div>
                  <div><label style={lbl}>Email</label><input style={IS} type="email" placeholder="jane@example.com" value={lEmail} onChange={e=>setLEmail(e.target.value)}/></div>
                  <div><label style={lbl}>Phone <span style={{color:T.sub,fontWeight:400}}>(optional)</span></label><input style={IS} placeholder="(555) 000-0000" value={lPhone} onChange={e=>setLPhone(e.target.value)}/></div>
                  <button onClick={()=>{if(lName&&lEmail)setLDone(true);}}
                    style={{background:lName&&lEmail?"linear-gradient(135deg,#1D4ED8,#3B82F6)":"#334155",border:"none",borderRadius:10,padding:"13px",color:"white",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,cursor:lName&&lEmail?"pointer":"not-allowed",marginTop:2}}>
                    Get My Free Quotes →
                  </button>
                </div>
                <div style={{fontSize:10.5,color:T.sub,marginTop:11,textAlign:"center"}}>🔒 Your info is never sold. We match you with up to 3 vetted lenders.</div>
              </div>)
            :card(<div style={{padding:28,textAlign:"center"}}>
                <div style={{fontSize:44,marginBottom:14}}>🎉</div>
                <div style={{fontFamily:"Fraunces,serif",fontWeight:700,fontSize:22,color:T.text,marginBottom:8}}>You're all set, {lName.split(" ")[0]}!</div>
                <div style={{fontSize:13.5,color:T.muted,lineHeight:1.7,marginBottom:18}}>Matched with lenders for your {$(loan)} loan. Expect quotes at <strong>{lEmail}</strong> within 24 hrs.</div>
                <button onClick={()=>setLDone(false)} style={{background:"transparent",border:`1.5px solid ${T.border}`,borderRadius:8,padding:"8px 18px",color:T.muted,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12}}>Start over</button>
              </div>)
          )}
        </div>

        {/* RIGHT: CHAT */}
        <div style={{flex:1,display:"flex",flexDirection:"column",background:T.chatBg,minWidth:0}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#1D4ED8,#60A5FA)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:15}}>🏠</span>
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:13,color:T.text}}>MortgageIQ Advisor</div>
              <div style={{fontSize:11,color:T.green,display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:5,height:5,background:T.green,borderRadius:"50%",display:"inline-block"}}/>
                Live · context-aware
              </div>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:9,minHeight:0}}>
            {msgs.map((m,i)=>(
              <div key={i} style={m.role==="user"
                ?{background:"#3B82F6",color:"white",borderRadius:"15px 15px 3px 15px",padding:"9px 13px",maxWidth:"80%",fontSize:13.5,lineHeight:1.55,alignSelf:"flex-end"}
                :{background:T.aiBg,color:T.text,borderRadius:"15px 15px 15px 3px",padding:"9px 13px",maxWidth:"88%",fontSize:13.5,lineHeight:1.65,alignSelf:"flex-start",border:`1px solid ${T.aiBo}`}}>
                {m.content}
              </div>
            ))}
            {chatLoad&&<div style={{background:T.aiBg,borderRadius:"15px 15px 15px 3px",padding:"11px 14px",alignSelf:"flex-start",border:`1px solid ${T.aiBo}`,display:"flex",gap:4,alignItems:"center"}}>
              <div className="dot"/><div className="dot d2"/><div className="dot d3"/>
            </div>}
            <div ref={endRef}/>
          </div>
          {msgs.length<=2&&<div style={{padding:"0 14px 9px",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0}}>
            {SUGG.map(s=>(
              <button key={s} className="chip" onClick={()=>send(s)} style={{background:T.surf2,borderColor:T.border,color:T.muted}}>{s}</button>
            ))}
          </div>}
          <div style={{padding:"9px 12px 13px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
            <div style={{display:"flex",gap:7,alignItems:"flex-end",background:T.surf2,border:`1.5px solid ${T.border}`,borderRadius:11,padding:"7px 7px 7px 13px"}}>
              <textarea value={chatIn} onChange={e=>setChatIn(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder="Ask anything about your mortgage..."
                rows={1}
                style={{flex:1,background:"transparent",border:"none",fontFamily:"'DM Sans',sans-serif",fontSize:13.5,color:T.text,resize:"none",lineHeight:1.5,maxHeight:100,overflowY:"auto",outline:"none"}}/>
              <button className="sbtn" onClick={()=>send()} disabled={chatLoad||!chatIn.trim()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <div style={{fontSize:10.5,color:T.sub,textAlign:"center",marginTop:6}}>Not financial advice · Consult a licensed mortgage professional</div>
          </div>
        </div>
      </div>
    </div>
  );
}
