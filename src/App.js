import React, { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://wuiblzjwolncpafjmkch.supabase.co";
const SUPABASE_KEY = "sb_publishable_3VMO11omiSHPr-1Zss6zTg_reswd0E0";
const ADMIN_USER = "admin";
const ADMIN_PASS_KEY = "wbm_pass";
const DEFAULT_PASS = "wbm@2026";
const SESSION_KEY = "wbm_v12_session";
const SESSION_TIMEOUT = 30 * 60 * 1000;
const RECOVERY_CODE = "WBM-RECOVERY-2026-ADNAN";

// Country codes mapping
const COUNTRY_CODES = {
  "+92": { name: "Pakistan", flag: "🇵🇰", code: "PK" },
  "+971": { name: "UAE", flag: "🇦🇪", code: "AE" },
  "+966": { name: "Saudi Arabia", flag: "🇸🇦", code: "SA" },
  "+965": { name: "Kuwait", flag: "🇰🇼", code: "KW" },
  "+968": { name: "Oman", flag: "🇴🇲", code: "OM" },
  "+973": { name: "Bahrain", flag: "🇧🇭", code: "BH" },
  "+974": { name: "Qatar", flag: "🇶🇦", code: "QA" },
  "+1": { name: "USA/Canada", flag: "🇺🇸", code: "US" },
  "+44": { name: "UK", flag: "🇬🇧", code: "GB" },
  "+91": { name: "India", flag: "🇮🇳", code: "IN" },
  "+90": { name: "Turkey", flag: "🇹🇷", code: "TR" },
  "+61": { name: "Australia", flag: "🇦🇺", code: "AU" },
  "+49": { name: "Germany", flag: "🇩🇪", code: "DE" },
  "+33": { name: "France", flag: "🇫🇷", code: "FR" },
  "+39": { name: "Italy", flag: "🇮🇹", code: "IT" },
  "+34": { name: "Spain", flag: "🇪🇸", code: "ES" },
  "+31": { name: "Netherlands", flag: "🇳🇱", code: "NL" },
  "+86": { name: "China", flag: "🇨🇳", code: "CN" },
  "+81": { name: "Japan", flag: "🇯🇵", code: "JP" },
  "+82": { name: "South Korea", flag: "🇰🇷", code: "KR" },
  "+60": { name: "Malaysia", flag: "🇲🇾", code: "MY" },
  "+65": { name: "Singapore", flag: "🇸🇬", code: "SG" },
  "+20": { name: "Egypt", flag: "🇪🇬", code: "EG" },
  "+234": { name: "Nigeria", flag: "🇳🇬", code: "NG" },
  "+27": { name: "South Africa", flag: "🇿🇦", code: "ZA" },
  "+55": { name: "Brazil", flag: "🇧🇷", code: "BR" },
  "+52": { name: "Mexico", flag: "🇲🇽", code: "MX" },
};

function detectCountryFromNumber(num) {
  const clean = num.replace(/\s/g, "");
  // Try longest prefix first
  const prefixes = Object.keys(COUNTRY_CODES).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (clean.startsWith(prefix)) return COUNTRY_CODES[prefix];
  }
  return null;
}

function getNumberInfo(num) {
  const country = detectCountryFromNumber(num);
  return country || { name: "Other", flag: "🌍", code: "XX" };
}

// ─── SUPABASE ─────────────────────────────────────────────
const sb = {
  async query(method, path, body) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return text ? JSON.parse(text) : [];
    } catch (e) { console.error(e); return null; }
  },
  getSites: () => sb.query("GET", "sites?select=*&order=installed_at.desc", null),
  upsertSite: (site) => sb.query("POST", "sites?on_conflict=id", {
    id: site.id, name: site.name, url: site.url,
    enabled: site.enabled, payment: site.payment,
    numbers: site.numbers, secret_key: site.secretKey || "",
    installed_at: site.installedAt, last_active: site.lastActive,
    clicks: site.clicks || 0, impressions: site.impressions || 0,
    verified: site.verified || false, plan: site.plan || "basic",
  }),
  updateSite: (id, data) => sb.query("PATCH", `sites?id=eq.${id}`, data),
  deleteSite: (id) => sb.query("DELETE", `sites?id=eq.${id}`, null),
};

// ─── HELPERS ──────────────────────────────────────────────
function genId() { return "s_" + Math.random().toString(36).substr(2, 8); }
function fmtDate(iso) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }); }
function timeAgo(iso) { if (!iso) return "—"; const d = Math.floor((Date.now() - new Date(iso)) / 86400000); if (d === 0) return "Today"; if (d === 1) return "Yesterday"; if (d < 30) return `${d}d ago`; return `${Math.floor(d / 30)}mo ago`; }
function mapRow(r) {
  return {
    id: r.id, name: r.name, url: r.url,
    enabled: r.enabled, payment: r.payment,
    numbers: r.numbers || [], secretKey: r.secret_key || "",
    installedAt: r.installed_at, lastActive: r.last_active,
    clicks: r.clicks || 0, impressions: r.impressions || 0,
    verified: r.verified || false, plan: r.plan || "basic",
  };
}

// ─── SESSION ──────────────────────────────────────────────
function getSession() {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (!s) return null;
    const p = JSON.parse(s);
    if (Date.now() - p.time > SESSION_TIMEOUT) { localStorage.removeItem(SESSION_KEY); return null; }
    return p;
  } catch (e) { return null; }
}
function setSession() { localStorage.setItem(SESSION_KEY, JSON.stringify({ time: Date.now() })); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

// ─── SCRIPT GENERATOR v12 ─────────────────────────────────
function genScript(site) {
  if (!site.enabled || site.payment !== "paid") {
    return `<!-- WBManager | ${site.name} | INACTIVE -->\n<script>\n(function(){\n  var el=document.getElementById("wbm-fab");\n  if(el)el.remove();\n})();\n<\/script>`;
  }

  const nums = JSON.stringify(site.numbers);
  const secret = site.secretKey ? `"${site.secretKey}"` : "null";
  const isBasic = site.plan === "basic";

  return `<!-- WBManager Geo | ${site.name} | ${isBasic ? "BASIC" : "PRO"} | v12 -->
<script>
(function(){
  var CFG={
    siteId:"${site.id}",
    numbers:${nums},
    key:${secret},
    siteUrl:"${site.url}",
    plan:"${site.plan||"basic"}",
    supabaseUrl:"${SUPABASE_URL}",
    supabaseKey:"${SUPABASE_KEY}"
  };

  // ── Geo Routing: Group numbers by country code ──────────
  function groupByCountry(numbers){
    var groups={};
    numbers.forEach(function(num){
      var clean=num.replace(/\\s/g,"");
      // Detect country prefix (longest match first)
      var prefixes=["+974","+973","+968","+966","+965","+971","+234","+234",
        "+92","+91","+90","+86","+82","+81","+65","+61","+60","+55","+52",
        "+49","+44","+39","+34","+33","+31","+27","+20","+1"];
      var matched=false;
      for(var i=0;i<prefixes.length;i++){
        if(clean.startsWith(prefixes[i])){
          if(!groups[prefixes[i]])groups[prefixes[i]]=[];
          groups[prefixes[i]].push(num);
          matched=true; break;
        }
      }
      if(!matched){
        if(!groups["other"])groups["other"]=[];
        groups["other"].push(num);
      }
    });
    return groups;
  }

  // ── Detect visitor country via IP ───────────────────────
  function getVisitorCountry(cb){
    fetch("https://ipapi.co/json/",{signal:AbortSignal.timeout(3000)})
      .then(function(r){return r.json();})
      .then(function(data){cb(data.country_calling_code||null);})
      .catch(function(){cb(null);});
  }

  // ── Pick best number based on visitor country ───────────
  function pickNumber(visitorCallingCode){
    var groups=groupByCountry(CFG.numbers);
    var allPrefixes=Object.keys(groups);
    // Find home country (most numbers = home)
    var homePfx=allPrefixes[0];
    var maxLen=0;
    allPrefixes.forEach(function(p){
      if((groups[p]||[]).length>maxLen){maxLen=(groups[p]||[]).length;homePfx=p;}
    });
    // Match visitor country
    if(visitorCallingCode){
      var code=visitorCallingCode.startsWith("+")?visitorCallingCode:"+"+visitorCallingCode;
      if(groups[code]&&groups[code].length>0){
        // Visitor country found — pick random from that group
        var arr=groups[code];
        return arr[Math.floor(Math.random()*arr.length)];
      }
    }
    // Fallback: home country numbers
    if(groups[homePfx]&&groups[homePfx].length>0){
      var arr2=groups[homePfx];
      return arr2[Math.floor(Math.random()*arr2.length)];
    }
    // Last fallback: any random number
    return CFG.numbers[Math.floor(Math.random()*CFG.numbers.length)];
  }

  // ── Check Supabase status ───────────────────────────────
  function checkStatus(cb){
    fetch(CFG.supabaseUrl+"/rest/v1/sites?id=eq."+CFG.siteId+"&select=enabled,payment,plan",{
      headers:{"apikey":CFG.supabaseKey,"Authorization":"Bearer "+CFG.supabaseKey}
    }).then(function(r){return r.json();}).then(function(data){
      if(data&&data[0])cb(data[0].enabled===true&&data[0].payment==="paid",data[0].plan||"basic");
      else cb(false,"basic");
    }).catch(function(){cb(true,CFG.plan);});
  }

  var WA_SVG='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.533 5.853L0 24l6.305-1.508A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.214-3.732.893.924-3.638-.234-.374A9.818 9.818 0 1112 21.818z"/></svg>';

  var st=document.createElement("style");
  st.textContent=
    "#wbm-fab{position:fixed;bottom:24px;right:24px;z-index:2147483647;}"+
    "#wbm-fab a{display:flex;align-items:center;justify-content:center;"+
    "width:60px;height:60px;background:#25D366;border-radius:50%;"+
    "text-decoration:none;box-shadow:0 4px 20px rgba(37,211,102,.55);"+
    "transition:transform .25s;animation:wbm-glow 2.5s ease-in-out infinite;}"+
    "#wbm-fab a:hover{transform:scale(1.12);}"+
    "@keyframes wbm-glow{0%,100%{box-shadow:0 4px 20px rgba(37,211,102,.55);}50%{box-shadow:0 4px 36px rgba(37,211,102,.9);}}";
  document.head.appendChild(st);

  // ── Price Detection (all currencies) ───────────────────
  function getPrice(){
    var meta=document.querySelector('[property="product:price:amount"],[itemprop="price"]');
    if(meta){var cur=document.querySelector('[property="product:price:currency"],[itemprop="priceCurrency"]');return ((cur?cur.content||cur.innerText:"")||"")+" "+(meta.content||meta.innerText||"").replace(/[^0-9.,]/g,"");}
    var body=document.body.innerText||"";
    var pats=[/Price[:\\s]+PKR[\\s]?([\\d,]+)/i,/PKR[\\s]?([\\d,]+)/i,/Rs\\.?[\\s]?([\\d,]+)/i,/\\$\\s?([\\d,]+\\.?\\d{0,2})/,/£\\s?([\\d,]+\\.?\\d{0,2})/,/€\\s?([\\d,]+[.,]?\\d{0,2})/,/₹\\s?([\\d,]+)/,/AED[\\s]?([\\d,]+)/i,/SAR[\\s]?([\\d,]+)/i,/KWD[\\s]?([\\d,]+\\.?\\d{0,3})/i,/QAR[\\s]?([\\d,]+)/i,/OMR[\\s]?([\\d,]+\\.?\\d{0,3})/i,/BHD[\\s]?([\\d,]+\\.?\\d{0,3})/i,/Price[:\\s]+([\\d,]+\\.?\\d{0,2})/i];
    var syms=["PKR ","PKR ","Rs. ","$ ","£ ","€ ","₹ ","AED ","SAR ","KWD ","QAR ","OMR ","BHD ",""];
    for(var i=0;i<pats.length;i++){var m=body.match(pats[i]);if(m&&m[1])return (syms[i]||"")+m[1];}
    return "";
  }

  function getImage(){
    var og=document.querySelector('meta[property="og:image"]');
    if(og&&og.content)return og.content.replace(/\\/w\\d+-h\\d+(-[^/]*)?(?=\\/|$)/,"");
    var img=document.querySelector(".post-body img,.entry-content img,.product img,article img");
    if(img)return (img.src||img.getAttribute("data-src")||"").replace(/\\/w\\d+-h\\d+(-[^/]*)?(?=\\/|$)/,"");
    return "";
  }

  function getTitle(){
    var el=document.querySelector("h1.post-title,h1.entry-title,h1.product_title,.post-title,.entry-title,h1");
    return el?el.innerText.trim():document.title.split("|")[0].trim();
  }

  function getLink(){
    var c=document.querySelector('link[rel="canonical"]');
    return c?c.href:location.href.split("?")[0].split("#")[0];
  }

  function isSinglePage(){
    var cards=document.querySelectorAll(".post-outer,.hentry,li.product,.product-card");
    if(cards.length>1)return false;
    var canonical=(document.querySelector('link[rel="canonical"]')||{}).href||"";
    var isHome=(canonical===CFG.siteUrl||canonical===CFG.siteUrl+"/"||location.pathname==="/"||location.pathname==="");
    return !isHome;
  }

  function buildMsg(plan){
    if(plan==="basic"){
      return "Assalam-o-Alaikum!\\n\\nI am interested in your products.\\n\\nStore: "+CFG.siteUrl;
    }
    if(!isSinglePage())return "Assalam-o-Alaikum!\\n\\nI am visiting your store:\\n"+getLink();
    var title=getTitle(),price=getPrice(),link=getLink();
    var msg="Assalam-o-Alaikum, I want to order this product:\\n\\n";
    msg+="*Product:* "+title+"\\n";
    if(price)msg+="*Price:* "+price+"\\n";
    if(CFG.key)msg+="*Secret ID:* "+CFG.key+"\\n";
    msg+="*Link:* "+link;
    return msg;
  }

  function addFAB(number,plan){
    if(document.getElementById("wbm-fab"))return;
    var msg=buildMsg(plan);
    var cleanNum=number.replace(/\\D/g,"");
    var wrap=document.createElement("div");wrap.id="wbm-fab";
    var a=document.createElement("a");
    a.href="https://wa.me/"+cleanNum+"?text="+encodeURIComponent(msg);
    a.target="_blank";a.rel="noopener noreferrer";
    a.setAttribute("aria-label","Chat on WhatsApp");
    a.innerHTML=WA_SVG;
    wrap.appendChild(a);document.body.appendChild(wrap);
  }

  function removeFAB(){var el=document.getElementById("wbm-fab");if(el)el.remove();}

  function init(){
    checkStatus(function(active,plan){
      if(!active){removeFAB();return;}
      // Get visitor country then pick best number
      getVisitorCountry(function(callingCode){
        var number=pickNumber(callingCode);
        addFAB(number,plan);
      });
    });
    // Recheck every 5 minutes
    setInterval(function(){
      checkStatus(function(active,plan){
        removeFAB();
        if(!active)return;
        getVisitorCountry(function(callingCode){
          var number=pickNumber(callingCode);
          addFAB(number,plan);
        });
      });
    },5*60*1000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else setTimeout(init,300);
})();
<\/script>
<!-- End WBManager Geo v12 -->`;
}

function waReminderMsg(site) {
  const n = site.numbers[0].replace(/\D/g, "");
  const msg = `Assalam o Alaikum! 👋\n\n⚠️ *WhatsApp Button Service — Payment Pending*\n\nAapki website *${site.url}* ki service ki payment pending hai.\n\nKripya jald payment karein.\n\nShukriya! 🙏\n— WBManager Team`;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}

// ─── CSS ──────────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f0f4f8;font-family:'DM Sans','Segoe UI',sans-serif;color:#1e293b;}
::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:#e2e8f0;} ::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:3px;}
.wbm-root{display:flex;min-height:100vh;}
.sidebar{width:230px;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:200;transition:transform .25s;box-shadow:2px 0 12px rgba(0,0,0,.06);}
.sidebar.hidden{transform:translateX(-230px);}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:199;}
.sidebar-overlay.show{display:block;}
.main-wrap{flex:1;display:flex;flex-direction:column;min-width:0;}
.main-wrap.with-sidebar{margin-left:230px;}
.topbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:0 20px;height:62px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.05);}
.page{padding:20px;max-width:1080px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:16px;}
.stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;}
.stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 12px;display:flex;flex-direction:column;gap:5px;box-shadow:0 1px 4px rgba(0,0,0,.05);transition:all .2s;}
.stat-card:hover{box-shadow:0 4px 16px rgba(37,211,102,.15);border-color:#86efac;}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.05);}
.card-title{font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.8px;text-transform:uppercase;margin-bottom:14px;}
.site-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;transition:all .2s;}
.site-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);}
.chip{background:#f1f5f9;color:#64748b;font-size:11px;padding:3px 9px;border-radius:20px;white-space:nowrap;border:1px solid #e2e8f0;}
.badge{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;}
.badge-green{background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0;}
.badge-gray{background:#f1f5f9;color:#94a3b8;border:1px solid #e2e8f0;}
.badge-blue{background:#dbeafe;color:#2563eb;border:1px solid #bfdbfe;}
.badge-amber{background:#fef9c3;color:#ca8a04;border:1px solid #fde68a;}
.badge-ver{background:#dcfce7;color:#16a34a;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;border:1px solid #bbf7d0;}
.badge-basic{background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;}
.badge-pro{background:linear-gradient(135deg,#fef9c3,#fde68a);color:#92400e;border:1px solid #fbbf24;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;}
.btn-p{background:linear-gradient(135deg,#25D366,#1aab52);color:#fff;border:none;border-radius:9px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(37,211,102,.3);}
.btn-g{background:#fff;color:#64748b;border:1px solid #e2e8f0;border-radius:9px;padding:10px 16px;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;}
.btn-a{border:1px solid #e2e8f0;border-radius:8px;padding:7px 11px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;background:#f8fafc;color:#475569;}
.btn-pay{border-radius:8px;padding:7px 12px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;}
.btn-pay.paid{background:#dcfce7;color:#16a34a;border-color:#86efac;}
.btn-pay.pend{background:#fef9c3;color:#ca8a04;border-color:#fde68a;}
.btn-ver{background:#dbeafe;color:#2563eb;border:1px solid #bfdbfe;border-radius:8px;padding:7px 12px;cursor:pointer;font-size:12px;font-weight:600;}
.plan-btn{border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap;border:2px solid #e2e8f0;background:#f8fafc;color:#64748b;transition:all .2s;}
.plan-btn.basic-active{background:#f0f9ff;color:#0369a1;border-color:#bae6fd;}
.plan-btn.pro-active{background:linear-gradient(135deg,#fef9c3,#fde68a);color:#92400e;border-color:#fbbf24;}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fg{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;}
.lbl{font-size:12px;font-weight:700;color:#64748b;}
.inp{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:11px 13px;color:#1e293b;font-size:14px;outline:none;width:100%;}
.inp:focus{border-color:#25D366;box-shadow:0 0 0 3px rgba(37,211,102,.1);}
.nav-btn{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;border:none;background:transparent;color:#64748b;cursor:pointer;font-size:14px;font-weight:500;width:100%;text-align:left;transition:all .15s;}
.nav-btn:hover,.nav-btn.active{background:#dcfce7;color:#16a34a;font-weight:700;}
.tab-btn{background:transparent;border:none;color:#94a3b8;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;}
.tab-btn.active{background:#f0fdf4;color:#16a34a;font-weight:700;}
.alert-w{background:#fef9c3;border:1px solid #fde68a;color:#854d0e;border-radius:10px;padding:12px 16px;font-size:13px;margin-bottom:14px;}
.info-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;font-size:13px;color:#0369a1;margin-bottom:14px;line-height:1.7;}
.success-box{background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 16px;font-size:13px;color:#166534;margin-bottom:14px;line-height:1.7;}
.plan-box{border-radius:12px;padding:16px;margin-bottom:14px;}
.plan-box.basic{background:#f0f9ff;border:2px solid #bae6fd;}
.plan-box.pro{background:linear-gradient(135deg,#fffbeb,#fef9c3);border:2px solid #fbbf24;}
.script-box{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;overflow:auto;font-size:11px;color:#7dd3fc;line-height:1.7;font-family:monospace;max-height:280px;white-space:pre-wrap;word-break:break-word;}
.msg-preview{border-radius:10px;padding:14px 16px;font-size:12px;margin-bottom:10px;line-height:1.8;font-family:monospace;}
.msg-preview.basic{background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;}
.msg-preview.pro{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.modal-ov{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;}
.modal{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:30px 26px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2);}
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f0fdf4,#f0f9ff);padding:16px;}
.login-card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:40px 32px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.1);}
.toast{position:fixed;top:16px;right:16px;z-index:9999;padding:12px 20px;border-radius:11px;color:#fff;font-weight:700;font-size:13px;box-shadow:0 4px 24px rgba(0,0,0,.2);max-width:320px;}
.feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;}
.feat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;display:flex;gap:10px;}
.loading{display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:14px;}
.spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#25D366;border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.toggle-btn{position:relative;width:44px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:background .2s;flex-shrink:0;}
.toggle-btn.on{background:#25D366;}
.toggle-btn.off{background:#cbd5e1;}
.toggle-btn::after{content:"";position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
.toggle-btn.on::after{left:23px;}
.toggle-btn.off::after{left:3px;}
.live-badge{background:#dcfce7;color:#16a34a;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #86efac;margin-left:6px;}
.geo-badge{background:#fdf4ff;color:#7c3aed;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #e9d5ff;margin-left:4px;}

/* Number groups */
.num-group{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;}
.num-group-header{display:flex;align-items:center;gap:6px;margin-bottom:8px;font-weight:700;font-size:12px;color:#1e293b;}
.num-tag{display:inline-flex;align-items:center;gap:4px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:3px 10px;font-size:12px;color:#475569;margin:2px;}

/* Plan cards */
.plan-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
.plan-card{border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;border:2px solid transparent;}
.plan-card.basic{background:#f0f9ff;border-color:#bae6fd;}
.plan-card.pro{background:linear-gradient(135deg,#fffbeb,#fef9c3);border-color:#fbbf24;}
.plan-card.selected.basic{border-color:#0369a1;box-shadow:0 0 0 3px rgba(3,105,161,.15);}
.plan-card.selected.pro{border-color:#d97706;box-shadow:0 0 0 3px rgba(217,119,6,.15);}
.plan-card-title{font-weight:800;font-size:14px;margin-bottom:4px;}
.plan-card.basic .plan-card-title{color:#0369a1;}
.plan-card.pro .plan-card-title{color:#92400e;}
.plan-price{font-size:18px;font-weight:800;margin-bottom:8px;}
.plan-card.basic .plan-price{color:#0369a1;}
.plan-card.pro .plan-price{color:#d97706;}
.plan-feature{font-size:11px;color:#64748b;margin-bottom:3px;}
.plan-feature::before{content:"✓ ";color:#16a34a;font-weight:700;}
.plan-feature.no::before{content:"✗ ";color:#94a3b8;}

@media(min-width:900px){
  .sidebar{transform:translateX(0)!important;}
  .main-wrap{margin-left:230px!important;}
  .sidebar-overlay{display:none!important;}
  .menu-btn{display:none!important;}
  .stats-grid{grid-template-columns:repeat(6,1fr);}
}
@media(max-width:899px){.stats-grid{grid-template-columns:repeat(3,1fr);}.form-grid{grid-template-columns:1fr;}.page{padding:14px;}.feat-grid{grid-template-columns:1fr;}.plan-compare{grid-template-columns:1fr;}}
@media(max-width:500px){.stats-grid{grid-template-columns:repeat(2,1fr);}.page{padding:10px;}.card{padding:14px;}}
`;

function injectCSS() {
  if (document.getElementById("wbm-css")) return;
  const s = document.createElement("style"); s.id = "wbm-css"; s.textContent = CSS;
  document.head.appendChild(s);
}

// ─── LOGIN ─────────────────────────────────────────────────
function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [rec, setRec] = useState("");
  const [np, setNp] = useState(""); const [cp, setCp] = useState("");
  const [err, setErr] = useState(""); const [show, setShow] = useState(false);
  const savedPass = localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASS;

  function doLogin() {
    setErr("");
    if (!u.trim() || !p.trim()) { setErr("Username aur password zaroor bharein!"); return; }
    if (u.trim() === ADMIN_USER && p === savedPass) { setSession(); onLogin(); }
    else setErr("Username ya password galat hai!");
  }
  function doRecover() { setErr(""); if (rec.trim() === RECOVERY_CODE) setMode("newpass"); else setErr("Recovery code galat hai!"); }
  function doNewPass() {
    setErr("");
    if (np.length < 6) { setErr("Password min 6 characters!"); return; }
    if (np !== cp) { setErr("Passwords match nahi!"); return; }
    localStorage.setItem(ADMIN_PASS_KEY, np); setMode("login");
    alert("✅ Password change ho gaya!");
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: "#dcfce7", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 12px" }}>💬</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>WBManager</div>
          <div style={{ display: "inline-flex", gap: 6, alignItems: "center", marginTop: 8 }}>
            <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, border: "1px solid #86efac" }}>v12.0</span>
            <span style={{ background: "#fdf4ff", color: "#7c3aed", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, border: "1px solid #e9d5ff" }}>🌍 GEO ROUTING</span>
          </div>
        </div>
        {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 10, padding: "11px 14px", fontSize: 13, marginBottom: 16, textAlign: "center" }}>⚠️ {err}</div>}

        {mode === "login" && (<>
          <div className="fg"><label className="lbl">USERNAME</label><input className="inp" placeholder="admin" value={u} onChange={e => { setU(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && doLogin()} /></div>
          <div className="fg" style={{ marginBottom: 8 }}>
            <label className="lbl">PASSWORD</label>
            <div style={{ position: "relative" }}>
              <input className="inp" style={{ paddingRight: 44 }} type={show ? "text" : "password"} placeholder="••••••••" value={p} onChange={e => { setP(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && doLogin()} />
              <span onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 18 }}>{show ? "🙈" : "👁"}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <span onClick={() => { setMode("recover"); setErr(""); }} style={{ fontSize: 12, color: "#16a34a", cursor: "pointer", fontWeight: 600 }}>🔑 Forgot Password?</span>
          </div>
          <button className="btn-p" style={{ width: "100%", padding: 13, fontSize: 15, borderRadius: 10 }} onClick={doLogin}>Login →</button>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", marginTop: 14, fontSize: 12, color: "#0369a1" }}>🕐 Auto-logout: 30 min idle</div>
        </>)}
        {mode === "recover" && (<>
          <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#854d0e" }}>🔑 Recovery code: <b style={{ fontFamily: "monospace" }}>WBM-RECOVERY-2026-ADNAN</b></div>
          <div className="fg"><label className="lbl">RECOVERY CODE</label><input className="inp" placeholder="WBM-RECOVERY-..." value={rec} onChange={e => { setRec(e.target.value); setErr(""); }} /></div>
          <button className="btn-p" style={{ width: "100%", padding: 12, borderRadius: 10, marginBottom: 10 }} onClick={doRecover}>Verify →</button>
          <button className="btn-g" style={{ width: "100%", padding: 10, borderRadius: 10 }} onClick={() => { setMode("login"); setErr(""); }}>← Back</button>
        </>)}
        {mode === "newpass" && (<>
          <div className="success-box">✅ Verified! Naya password set karein.</div>
          <div className="fg"><label className="lbl">NEW PASSWORD</label><input className="inp" type="password" value={np} onChange={e => { setNp(e.target.value); setErr(""); }} /></div>
          <div className="fg" style={{ marginBottom: 20 }}><label className="lbl">CONFIRM</label><input className="inp" type="password" value={cp} onChange={e => { setCp(e.target.value); setErr(""); }} /></div>
          <button className="btn-p" style={{ width: "100%", padding: 12, borderRadius: 10 }} onClick={doNewPass}>Set Password →</button>
        </>)}
      </div>
    </div>
  );
}

// ─── NUMBER GROUPS DISPLAY ────────────────────────────────
function NumberGroups({ numbers }) {
  const groups = {};
  numbers.forEach(num => {
    const info = getNumberInfo(num);
    const key = info.code;
    if (!groups[key]) groups[key] = { info, nums: [] };
    groups[key].nums.push(num);
  });
  return (
    <div>
      {Object.values(groups).map(g => (
        <div key={g.info.code} className="num-group">
          <div className="num-group-header">
            <span>{g.info.flag}</span>
            <span>{g.info.name}</span>
            <span style={{ color: "#94a3b8", fontWeight: 400 }}>({g.nums.length} number{g.nums.length > 1 ? "s" : ""})</span>
          </div>
          <div>{g.nums.map(n => <span key={n} className="num-tag">📱 {n}</span>)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────
const EF = { name: "", url: "", secretKey: "", numbers: [""], payment: "paid", plan: "basic" };

export default function App() {
  useEffect(() => { injectCSS(); }, []);
  const [loggedIn, setLoggedIn] = useState(() => !!getSession());
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(EF);
  const [toast, setToast] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("script");
  const [verifying, setVerifying] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [isWide, setIsWide] = useState(window.innerWidth >= 900);
  const [showNumGroups, setShowNumGroups] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (loggedIn && !getSession()) { setLoggedIn(false); }
      if (loggedIn) setSession();
    }, 60000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  useEffect(() => { const fn = () => setIsWide(window.innerWidth >= 900); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);

  const loadSites = useCallback(async () => {
    setLoading(true);
    const data = await sb.getSites();
    if (data) setSites(data.map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { if (loggedIn) loadSites(); }, [loggedIn, loadSites]);

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  function toast_(msg, t = "ok") { setToast({ msg, t }); setTimeout(() => setToast(null), 3500); }
  function logout() { clearSession(); setLoggedIn(false); }
  function goTo(v) { setView(v); setNavOpen(false); setSession(); }
  function openAdd() { setForm({ ...EF, numbers: [""] }); goTo("add"); }
  function openEdit(s) { setSel(s); setForm({ name: s.name, url: s.url, secretKey: s.secretKey || "", numbers: [...s.numbers], payment: s.payment || "paid", plan: s.plan || "basic" }); goTo("edit"); }
  function openScript(s) { setSel(s); setCopied(false); setTab("script"); goTo("script"); }

  async function handleSave() {
    const nums = form.numbers.filter(n => n.trim());
    if (!form.name.trim() || !form.url.trim() || !nums.length) { toast_("Sab required fields bharein!", "err"); return; }
    setSaving(true);
    const siteData = {
      id: view === "add" ? genId() : sel.id,
      name: form.name.trim(), url: form.url.trim(),
      enabled: form.payment === "paid",
      numbers: nums, secretKey: form.secretKey.trim(),
      installedAt: view === "add" ? new Date().toISOString() : sel.installedAt,
      lastActive: new Date().toISOString(),
      payment: form.payment, plan: form.plan,
      clicks: view === "add" ? 0 : sel.clicks,
      impressions: view === "add" ? 0 : sel.impressions,
      verified: view === "add" ? false : sel.verified,
    };
    const res = await sb.upsertSite(siteData);
    if (res !== null) { toast_(view === "add" ? "Website add ho gayi! ✅" : "Update ho gayi! ✅"); await loadSites(); goTo("dashboard"); }
    else toast_("Error — dobara try karein!", "err");
    setSaving(false);
  }

  async function toggleSite(site) {
    if (site.payment === "pending") { toast_("Pehle payment complete karein!", "err"); return; }
    const newEnabled = !site.enabled;
    setSites(p => p.map(s => s.id === site.id ? { ...s, enabled: newEnabled } : s));
    const res = await sb.updateSite(site.id, { enabled: newEnabled });
    if (res !== null) toast_(newEnabled ? "✅ Button ON!" : "⏸ Button OFF — Foran gayab!");
    else { setSites(p => p.map(s => s.id === site.id ? { ...s, enabled: site.enabled } : s)); toast_("Error!", "err"); }
  }

  async function setPlan(id, plan) {
    setSites(p => p.map(s => s.id === id ? { ...s, plan } : s));
    if (sel?.id === id) setSel(s => ({ ...s, plan }));
    await sb.updateSite(id, { plan });
    toast_(plan === "pro" ? "🚀 Pro Plan active!" : "🔵 Basic Plan active!");
  }

  async function setPayment(id, val) {
    const site = sites.find(s => s.id === id);
    if (!site) return;
    setSites(p => p.map(s => s.id === id ? { ...s, payment: val, enabled: val === "pending" ? false : s.enabled } : s));
    if (sel?.id === id) setSel(s => ({ ...s, payment: val }));
    await sb.updateSite(id, { payment: val, enabled: val === "pending" ? false : site.enabled });
    if (val === "pending") { setTimeout(() => window.open(waReminderMsg(site), "_blank"), 400); toast_("WA reminder ja raha hai 📤", "warn"); }
    else toast_("Payment confirmed! ✅");
  }

  async function doVerify(id) {
    setVerifying(id);
    await sb.updateSite(id, { verified: true });
    setSites(p => p.map(s => s.id === id ? { ...s, verified: true } : s));
    setVerifying(null); toast_("Verified! ✅");
  }

  async function doDelete(id) {
    await sb.deleteSite(id); setSites(p => p.filter(s => s.id !== id));
    setDelItem(null); toast_("Remove ho gayi!", "err");
  }

  function copyScript() {
    navigator.clipboard.writeText(genScript(sel)).then(() => { setCopied(true); toast_("Script copied! ✅"); setTimeout(() => setCopied(false), 2500); });
  }

  const totalClicks = sites.reduce((a, s) => a + (s.clicks || 0), 0);
  const paidC = sites.filter(s => s.payment === "paid").length;
  const pendC = sites.filter(s => s.payment === "pending").length;
  const activeC = sites.filter(s => s.enabled).length;
  const proC = sites.filter(s => s.plan === "pro").length;
  const basicC = sites.filter(s => s.plan === "basic").length;
  const toastBg = { ok: "#16a34a", err: "#dc2626", warn: "#d97706" };

  const STATS = [
    { lb: "Total Sites", val: sites.length, ic: "🌐", cl: "#2563eb" },
    { lb: "Active", val: activeC, ic: "✅", cl: "#16a34a" },
    { lb: "Basic", val: basicC, ic: "🔵", cl: "#0369a1" },
    { lb: "Pro", val: proC, ic: "🚀", cl: "#d97706" },
    { lb: "Paid", val: paidC, ic: "💰", cl: "#7c3aed" },
    { lb: "Pending", val: pendC, ic: "⏳", cl: "#dc2626" },
  ];

  return (
    <div className="wbm-root">
      {toast && <div className="toast" style={{ background: toastBg[toast.t] || toastBg.ok }}>{toast.msg}</div>}
      {delItem && (
        <div className="modal-ov">
          <div className="modal">
            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: "#1e293b", marginBottom: 8, fontWeight: 700 }}>Delete karein?</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 22 }}><b>{delItem.name}</b> permanently remove hogi.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn-g" onClick={() => setDelItem(null)}>Cancel</button>
              <button className="btn-p" style={{ background: "#dc2626", boxShadow: "none" }} onClick={() => doDelete(delItem.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className={`sidebar-overlay${navOpen ? " show" : ""}`} onClick={() => setNavOpen(false)} />

      {/* SIDEBAR */}
      <aside className={`sidebar${!isWide && !navOpen ? " hidden" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 14px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ width: 38, height: 38, background: "#dcfce7", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>WBManager</div>
            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
              <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, border: "1px solid #86efac" }}>v12 LIVE</span>
              <span style={{ background: "#fdf4ff", color: "#7c3aed", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, border: "1px solid #e9d5ff" }}>🌍 GEO</span>
            </div>
          </div>
          {!isWide && <button onClick={() => setNavOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>}
        </div>
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
          <button className={`nav-btn${view === "dashboard" ? " active" : ""}`} onClick={() => goTo("dashboard")}><span>⊞</span> Dashboard</button>
          <button className={`nav-btn${view === "add" ? " active" : ""}`} onClick={openAdd}><span>＋</span> Add Website</button>
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Quick Stats</div>
          {[["🔵", `${basicC} Basic`, "#0369a1"], ["🚀", `${proC} Pro`, "#d97706"], ["✅", `${paidC} Paid`, "#16a34a"], ["⏳", `${pendC} Pending`, "#dc2626"]].map(([ic, lb, cl]) => (
            <div key={lb} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: cl, marginBottom: 6, fontWeight: 600 }}>{ic} {lb}</div>
          ))}
          <button onClick={logout} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 9, padding: "8px", cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 8 }}>🚪 Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className={`main-wrap${isWide ? " with-sidebar" : ""}`}>
        <div className="topbar">
          {!isWide && <button className="menu-btn btn-g" style={{ padding: "8px 12px", fontSize: 18 }} onClick={() => setNavOpen(true)}>☰</button>}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
              {{ dashboard: "Dashboard", add: "Add Website", edit: "Edit Website", script: "Embed Script" }[view]}
              {view === "dashboard" && <><span className="live-badge">● LIVE</span><span className="geo-badge">🌍 GEO</span></>}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{view === "dashboard" ? `${activeC} active · ${basicC} Basic · ${proC} Pro · Geo Routing ON` : sel?.name || "Naya website"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view === "dashboard" && <button className="btn-g" style={{ fontSize: 12, padding: "8px 12px" }} onClick={loadSites}>🔄</button>}
            {view === "dashboard" ? <button className="btn-p" onClick={openAdd}>+ Add</button> : <button className="btn-g" onClick={() => goTo("dashboard")}>← Back</button>}
          </div>
        </div>

        <div className="page">

          {/* DASHBOARD */}
          {view === "dashboard" && (<>
            <div className="stats-grid">
              {STATS.map(s => (
                <div key={s.lb} className="stat-card">
                  <span style={{ fontSize: 22 }}>{s.ic}</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: s.cl, lineHeight: 1 }}>{s.val}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{s.lb}</span>
                </div>
              ))}
            </div>

            {/* Geo Info Box */}
            <div style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#6b21a8", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22 }}>🌍</span>
              <div>
                <b>Geo-based Routing Active!</b><br/>
                <span style={{ fontSize: 12, opacity: .8 }}>Customer ka country IP se detect hoga → usi country ka number use hoga → baaki countries ke liye home country numbers! Sab automatic!</span>
              </div>
            </div>

            {loading ? (
              <div className="loading"><div className="spinner" /><span style={{ color: "#94a3b8" }}>Loading...</span></div>
            ) : (
              <div className="card">
                <div className="card-title">🌐 Websites ({sites.length})</div>
                {sites.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>🌐</div>
                    <p style={{ color: "#94a3b8", marginBottom: 18 }}>Koi website nahi!</p>
                    <button className="btn-p" onClick={openAdd}>+ Add Website</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sites.map(site => (
                      <div key={site.id} className="site-card">
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{site.name}</span>
                              {site.verified && <span className="badge-ver">✓ Verified</span>}
                              <span className={site.plan === "pro" ? "badge-pro" : "badge-basic"}>{site.plan === "pro" ? "🚀 Pro" : "🔵 Basic"}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{site.url}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Button:</span>
                              <button className={`toggle-btn ${site.enabled ? "on" : "off"}`} onClick={() => toggleSite(site)} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: site.enabled ? "#16a34a" : "#94a3b8" }}>{site.enabled ? "ON" : "OFF"}</span>
                            </div>
                            <span className={`badge ${site.payment === "paid" ? "badge-blue" : "badge-amber"}`}>{site.payment === "paid" ? "💰 Paid" : "⏳ Pending"}</span>
                          </div>
                        </div>

                        {/* Numbers with country groups */}
                        <div>
                          <button onClick={() => setShowNumGroups(showNumGroups === site.id ? null : site.id)}
                            style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
                            🌍 {site.numbers.length} Number{site.numbers.length > 1 ? "s" : ""} — Country Groups {showNumGroups === site.id ? "▲" : "▼"}
                          </button>
                          {showNumGroups === site.id && <div style={{ marginTop: 8 }}><NumberGroups numbers={site.numbers} /></div>}
                        </div>

                        {/* Info chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {[`👆 ${site.clicks || 0} clicks`, `📅 ${fmtDate(site.installedAt)}`, `🕐 ${timeAgo(site.lastActive)}`].map(c => <span key={c} className="chip">{c}</span>)}
                        </div>

                        {/* Plan */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Plan:</span>
                          <button className={`plan-btn${site.plan === "basic" ? " basic-active" : ""}`} onClick={() => setPlan(site.id, "basic")}>🔵 Basic</button>
                          <button className={`plan-btn${site.plan === "pro" ? " pro-active" : ""}`} onClick={() => setPlan(site.id, "pro")}>🚀 Pro</button>
                        </div>

                        {/* Payment */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Payment:</span>
                          <button className={`btn-pay${site.payment === "paid" ? " paid" : ""}`} onClick={() => setPayment(site.id, "paid")}>✅ Paid</button>
                          <button className={`btn-pay${site.payment === "pending" ? " pend" : ""}`} onClick={() => setPayment(site.id, "pending")}>⏳ Pending</button>
                          {!site.verified && <button className="btn-ver" onClick={() => doVerify(site.id)} disabled={verifying === site.id}>{verifying === site.id ? "⏳..." : "🔍 Verify"}</button>}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <button className="btn-a" onClick={() => openScript(site)}>📋 Script</button>
                          <button className="btn-a" onClick={() => openEdit(site)}>✏️ Edit</button>
                          <button className="btn-a" style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }} onClick={() => setDelItem(site)}>🗑 Delete</button>
                          <button className="btn-a" style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#86efac" }} onClick={() => window.open(waReminderMsg(site), "_blank")}>📤 WA Reminder</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>)}

          {/* ADD/EDIT */}
          {(view === "add" || view === "edit") && (
            <div className="card">
              <div className="form-grid" style={{ marginBottom: 4 }}>
                <div className="fg"><label className="lbl">Website Name *</label><input className="inp" placeholder="My Online Store" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Website URL *</label><input className="inp" placeholder="https://yoursite.com" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
                <div className="fg" style={{ gridColumn: "1/-1" }}><label className="lbl">Secret ID (optional)</label><input className="inp" placeholder="e.g. SDP001" value={form.secretKey} onChange={e => setForm(f => ({ ...f, secretKey: e.target.value }))} /></div>
              </div>

              <div className="fg">
                <label className="lbl">WhatsApp Numbers * <span style={{ color: "#7c3aed", fontSize: 11 }}>🌍 Country code se auto Geo Routing!</span></label>
                <div style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#6b21a8", marginBottom: 10 }}>
                  💡 Pakistan: <b>+92</b> | UAE: <b>+971</b> | Saudi: <b>+966</b> | Kuwait: <b>+965</b> | USA: <b>+1</b> | UK: <b>+44</b>
                </div>
                {form.numbers.map((n, i) => {
                  const info = n.trim() ? getNumberInfo(n) : null;
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 18 }}>{info ? info.flag : "📱"}</span>
                      <input className="inp" style={{ flex: 1 }} placeholder="+92 300 1234567" value={n} onChange={e => { const a = [...form.numbers]; a[i] = e.target.value; setForm(f => ({ ...f, numbers: a })); }} />
                      {info && <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, whiteSpace: "nowrap" }}>{info.name}</span>}
                      {form.numbers.length > 1 && <button onClick={() => setForm(f => ({ ...f, numbers: f.numbers.filter((_, j) => j !== i) }))} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: 700 }}>✕</button>}
                    </div>
                  );
                })}
                <button onClick={() => setForm(f => ({ ...f, numbers: [...f.numbers, ""] }))} style={{ background: "transparent", border: "2px dashed #e2e8f0", color: "#94a3b8", borderRadius: 9, padding: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, width: "100%" }}>+ Add Number</button>
              </div>

              {/* Preview country groups */}
              {form.numbers.filter(n => n.trim()).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", marginBottom: 8 }}>🌍 Geo Routing Preview:</div>
                  <NumberGroups numbers={form.numbers.filter(n => n.trim())} />
                </div>
              )}

              {/* Plan */}
              <div className="fg">
                <label className="lbl">SELECT PLAN *</label>
                <div className="plan-compare">
                  <div className={`plan-card basic${form.plan === "basic" ? " selected" : ""}`} onClick={() => setForm(f => ({ ...f, plan: "basic" }))}>
                    <div className="plan-card-title">🔵 Basic Plan</div>
                    <div className="plan-price">PKR 499<span style={{ fontSize: 12 }}>/mo</span></div>
                    <div className="plan-feature">Floating WhatsApp button</div>
                    <div className="plan-feature">Inquiry message only</div>
                    <div className="plan-feature">🌍 Geo Routing</div>
                    <div className="plan-feature">Real-time ON/OFF</div>
                    <div className="plan-feature no">Product details nahi</div>
                  </div>
                  <div className={`plan-card pro${form.plan === "pro" ? " selected" : ""}`} onClick={() => setForm(f => ({ ...f, plan: "pro" }))}>
                    <div className="plan-card-title">🚀 Pro Plan</div>
                    <div className="plan-price">PKR 999<span style={{ fontSize: 12 }}>/mo</span></div>
                    <div className="plan-feature">Floating WhatsApp button</div>
                    <div className="plan-feature">🌍 Geo Routing</div>
                    <div className="plan-feature">Product name auto</div>
                    <div className="plan-feature">Price auto detect</div>
                    <div className="plan-feature">Image + Link + Secret ID</div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="card" style={{ background: "#f8fafc", boxShadow: "none" }}>
                <div className="card-title">💰 Payment Status</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className={`btn-pay${form.payment === "paid" ? " paid" : ""}`} onClick={() => setForm(f => ({ ...f, payment: "paid" }))}>✅ Paid</button>
                  <button className={`btn-pay${form.payment === "pending" ? " pend" : ""}`} onClick={() => setForm(f => ({ ...f, payment: "pending" }))}>⏳ Pending</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
                <button className="btn-g" onClick={() => goTo("dashboard")}>Cancel</button>
                <button className="btn-p" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : view === "add" ? "Add Website" : "Save Changes"}</button>
              </div>
            </div>
          )}

          {/* SCRIPT */}
          {view === "script" && sel && (
            <div className="card">
              <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12, flexWrap: "wrap" }}>
                {["script", "messages", "routing", "settings"].map(t => (
                  <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                    {t === "script" ? "📋 Script" : t === "messages" ? "💬 Messages" : t === "routing" ? "🌍 Routing" : "⚙️ Settings"}
                  </button>
                ))}
              </div>

              {tab === "script" && (<>
                {sel.payment === "pending" && <div className="alert-w">⚠️ Payment pending — script inactive.</div>}
                <div className={`plan-box ${sel.plan === "pro" ? "pro" : "basic"}`}>
                  {sel.plan === "pro" ? <><b>🚀 Pro</b> — Product details + Geo Routing</> : <><b>🔵 Basic</b> — Inquiry message + Geo Routing</>}
                </div>
                <div className="success-box">⚡ Real-time control + 🌍 Geo Routing — Customer ka country auto detect!</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{sel.enabled && sel.payment === "paid" ? "✅ Active" : "⛔ Inactive"}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Paste before &lt;/body&gt; — sirf ek baar!</div>
                  </div>
                  <button className="btn-p" style={copied ? { background: "#16a34a" } : {}} onClick={copyScript}>{copied ? "✓ Copied!" : "📋 Copy Script"}</button>
                </div>
                <pre className="script-box">{genScript(sel)}</pre>
              </>)}

              {tab === "messages" && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 16 }}>💬 Message Preview</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", marginBottom: 8 }}>🔵 Basic — Har page:</div>
                  <div className="msg-preview basic">Assalam-o-Alaikum!{"\n\n"}I am interested in your products.{"\n\n"}Store: {sel.url}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d97706", marginBottom: 8, marginTop: 16 }}>🚀 Pro — Product page:</div>
                  <div className="msg-preview pro">
                    Assalam-o-Alaikum, I want to order this product:{"\n\n"}
                    <b>*Product:*</b> Product Name (auto){"\n"}
                    <b>*Price:*</b> PKR 2000 / AED 90 / $25 (auto){"\n"}
                    {sel.secretKey && <><b>*Secret ID:*</b> {sel.secretKey}{"\n"}</>}
                    <b>*Link:*</b> {sel.url}/product
                  </div>
                </div>
              )}

              {tab === "routing" && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 6 }}>🌍 Geo Routing</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Customer ke country ke hisaab se number automatic select hoga:</div>
                  <NumberGroups numbers={sel.numbers} />
                  <div style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "12px 14px", marginTop: 14, fontSize: 12, color: "#6b21a8" }}>
                    <b>🌍 Routing Logic:</b><br/>
                    1. Customer ka IP detect hoga<br/>
                    2. Country ke numbers mein se random pick<br/>
                    3. Agar us country ka number nahi → home country numbers use<br/>
                    4. Sab automatic — customer kuch nahi karta!
                  </div>
                </div>
              )}

              {tab === "settings" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 11, padding: "14px 16px" }}>
                    <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⚡ Real-time Toggle</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button className={`toggle-btn ${sel.enabled ? "on" : "off"}`} onClick={() => { toggleSite(sel); setSel(s => ({ ...s, enabled: !s.enabled })); }} />
                      <span style={{ fontWeight: 700, color: sel.enabled ? "#16a34a" : "#94a3b8" }}>{sel.enabled ? "✅ ON" : "⏸ OFF"}</span>
                    </div>
                  </div>
                  {[
                    { t: "Plan", d: "Basic ya Pro select karein", el: <div style={{ display: "flex", gap: 8 }}><button className={`plan-btn${sel.plan === "basic" ? " basic-active" : ""}`} onClick={() => setPlan(sel.id, "basic")}>🔵 Basic</button><button className={`plan-btn${sel.plan === "pro" ? " pro-active" : ""}`} onClick={() => setPlan(sel.id, "pro")}>🚀 Pro</button></div> },
                    { t: "Payment", d: "Pending → script band + WA reminder", el: <div style={{ display: "flex", gap: 8 }}><button className={`btn-pay${sel.payment === "paid" ? " paid" : ""}`} onClick={() => setPayment(sel.id, "paid")}>✅ Paid</button><button className={`btn-pay${sel.payment === "pending" ? " pend" : ""}`} onClick={() => setPayment(sel.id, "pending")}>⏳ Pending</button></div> },
                    { t: "WA Reminder", d: "Client ko payment reminder bhejein", el: <button className="btn-ver" onClick={() => window.open(waReminderMsg(sel), "_blank")}>📤 Send</button> },
                  ].map(row => (
                    <div key={row.t} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 11, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div><div style={{ color: "#1e293b", fontWeight: 600, fontSize: 13 }}>{row.t}</div><div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>{row.d}</div></div>
                      {row.el}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
