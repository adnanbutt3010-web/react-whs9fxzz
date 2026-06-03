import React, { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://wuiblzjwolncpafjmkch.supabase.co";
const SUPABASE_KEY = "sb_publishable_3VMO11omiSHPr-1Zss6zTg_reswd0E0";
const ADMIN_USER = "admin";
const ADMIN_PASS_KEY = "wbm_pass";
const DEFAULT_PASS = "wbm@2026";
const SESSION_KEY = "wbm_v20_session";
const SESSION_TIMEOUT = 30 * 60 * 1000;
const RECOVERY_CODE = "WBM-RECOVERY-2026-ADNAN";

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
  "+60": { name: "Malaysia", flag: "🇲🇾", code: "MY" },
  "+65": { name: "Singapore", flag: "🇸🇬", code: "SG" },
  "+20": { name: "Egypt", flag: "🇪🇬", code: "EG" },
  "+55": { name: "Brazil", flag: "🇧🇷", code: "BR" },
};

function getNumberInfo(num) {
  const clean = num.replace(/\s/g, "");
  const prefixes = Object.keys(COUNTRY_CODES).sort((a, b) => b.length - a.length);
  for (const p of prefixes) { if (clean.startsWith(p)) return COUNTRY_CODES[p]; }
  return { name: "Other", flag: "🌍", code: "XX" };
}

// ─── SUPABASE ─────────────────────────────────────────────
const sb = {
  async query(method, path, body) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return text ? JSON.parse(text) : [];
    } catch (e) { console.error(e); return null; }
  },
  getSites: () => sb.query("GET", "sites?select=*&order=installed_at.desc", null),
  upsertSite: (s) => sb.query("POST", "sites?on_conflict=id", { id: s.id, name: s.name, url: s.url, enabled: s.enabled, payment: s.payment, numbers: s.numbers, secret_key: s.secretKey || "", installed_at: s.installedAt, last_active: s.lastActive, clicks: s.clicks || 0, impressions: s.impressions || 0, verified: s.verified || false, plan: s.plan || "basic" }),
  updateSite: (id, data) => sb.query("PATCH", `sites?id=eq.${id}`, data),
  deleteSite: (id) => sb.query("DELETE", `sites?id=eq.${id}`, null),
  getSchemaSites: () => sb.query("GET", "schema_sites?select=*&order=created_at.desc", null),
  upsertSchemaSite: (s) => sb.query("POST", "schema_sites?on_conflict=id", { id: s.id, name: s.name, url: s.url, enabled: s.enabled, payment: s.payment, plan: s.plan || "basic", business_name: s.businessName || "", business_type: s.businessType || "Organization", business_desc: s.businessDesc || "", business_phone: s.businessPhone || "", business_email: s.businessEmail || "", business_address: s.businessAddress || "", business_logo: s.businessLogo || "", social_links: s.socialLinks || [], created_at: s.createdAt, verified: s.verified || false }),
  updateSchemaSite: (id, data) => sb.query("PATCH", `schema_sites?id=eq.${id}`, data),
  deleteSchemaSite: (id) => sb.query("DELETE", `schema_sites?id=eq.${id}`, null),
  // Click Logs
  getLogs: (siteId) => sb.query("GET", `click_logs?${siteId ? `site_id=eq.${siteId}&` : ""}select=*&order=clicked_at.desc&limit=100`, null),
  getLogStats: () => sb.query("GET", "click_logs?select=site_id,site_name,country_name,country_code,plan,clicked_at", null),
  insertLog: (log) => sb.query("POST", "click_logs", log),
};

// ─── HELPERS ──────────────────────────────────────────────
function genId() { return "s_" + Math.random().toString(36).substr(2, 8); }
function fmtDate(iso) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }); }
function fmtDateTime(iso) { if (!iso) return "—"; return new Date(iso).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
function timeAgo(iso) { if (!iso) return "—"; const d = Math.floor((Date.now() - new Date(iso)) / 86400000); if (d === 0) return "Today"; if (d === 1) return "Yesterday"; if (d < 30) return `${d}d ago`; return `${Math.floor(d / 30)}mo ago`; }
function mapRow(r) { return { id: r.id, name: r.name, url: r.url, enabled: r.enabled, payment: r.payment, numbers: r.numbers || [], secretKey: r.secret_key || "", installedAt: r.installed_at, lastActive: r.last_active, clicks: r.clicks || 0, impressions: r.impressions || 0, verified: r.verified || false, plan: r.plan || "basic" }; }
function mapSchemaRow(r) { return { id: r.id, name: r.name, url: r.url, enabled: r.enabled, payment: r.payment, plan: r.plan || "basic", businessName: r.business_name || "", businessType: r.business_type || "Organization", businessDesc: r.business_desc || "", businessPhone: r.business_phone || "", businessEmail: r.business_email || "", businessAddress: r.business_address || "", businessLogo: r.business_logo || "", socialLinks: r.social_links || [], createdAt: r.created_at, verified: r.verified || false }; }

// ─── SESSION ──────────────────────────────────────────────
function getSession() { try { const s = localStorage.getItem(SESSION_KEY); if (!s) return null; const p = JSON.parse(s); if (Date.now() - p.time > SESSION_TIMEOUT) { localStorage.removeItem(SESSION_KEY); return null; } return p; } catch (e) { return null; } }
function setSession() { localStorage.setItem(SESSION_KEY, JSON.stringify({ time: Date.now() })); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

// ─── WBM SCRIPT v16 ───────────────────────────────────────
function genWBMScript(site) {
  if (!site.enabled || site.payment !== "paid") return `<!-- WBManager | ${site.name} | INACTIVE -->\n<script>\n(function(){var el=document.getElementById("wbm-fab");if(el)el.remove();})();\n<\/script>`;
  const nums = JSON.stringify(site.numbers);
  const secret = site.secretKey ? `"${site.secretKey}"` : "null";
  return `<!-- WBManager Geo+Logs | ${site.name} | ${site.plan === "pro" ? "PRO" : "BASIC"} | v20 -->
<script>
(function(){
  var CFG={siteId:"${site.id}",siteName:"${site.name}",numbers:${nums},key:${secret},siteUrl:"${site.url}",plan:"${site.plan||"basic"}",supabaseUrl:"${SUPABASE_URL}",supabaseKey:"${SUPABASE_KEY}"};

  function groupByCountry(numbers){var g={};numbers.forEach(function(num){var clean=num.replace(/\\s/g,"");var pfx=["+974","+973","+968","+966","+965","+971","+92","+91","+90","+65","+61","+60","+55","+49","+44","+39","+34","+33","+20","+1"];var ok=false;for(var i=0;i<pfx.length;i++){if(clean.startsWith(pfx[i])){if(!g[pfx[i]])g[pfx[i]]=[];g[pfx[i]].push(num);ok=true;break;}}if(!ok){if(!g.other)g.other=[];g.other.push(num);}});return g;}
  // Country names and calling codes map
  var CMAP={"AF":["Afghanistan","+93"],"AL":["Albania","+355"],"DZ":["Algeria","+213"],"AR":["Argentina","+54"],"AU":["Australia","+61"],"AT":["Austria","+43"],"AZ":["Azerbaijan","+994"],"BH":["Bahrain","+973"],"BD":["Bangladesh","+880"],"BE":["Belgium","+32"],"BR":["Brazil","+55"],"BG":["Bulgaria","+359"],"CA":["Canada","+1"],"CL":["Chile","+56"],"CN":["China","+86"],"CO":["Colombia","+57"],"HR":["Croatia","+385"],"CY":["Cyprus","+357"],"CZ":["Czech Republic","+420"],"DK":["Denmark","+45"],"EG":["Egypt","+20"],"EE":["Estonia","+372"],"FI":["Finland","+358"],"FR":["France","+33"],"GE":["Georgia","+995"],"DE":["Germany","+49"],"GH":["Ghana","+233"],"GR":["Greece","+30"],"HU":["Hungary","+36"],"IN":["India","+91"],"ID":["Indonesia","+62"],"IQ":["Iraq","+964"],"IE":["Ireland","+353"],"IL":["Israel","+972"],"IT":["Italy","+39"],"JM":["Jamaica","+1876"],"JP":["Japan","+81"],"JO":["Jordan","+962"],"KZ":["Kazakhstan","+7"],"KE":["Kenya","+254"],"KW":["Kuwait","+965"],"LB":["Lebanon","+961"],"LY":["Libya","+218"],"MY":["Malaysia","+60"],"MV":["Maldives","+960"],"MX":["Mexico","+52"],"MA":["Morocco","+212"],"NL":["Netherlands","+31"],"NZ":["New Zealand","+64"],"NG":["Nigeria","+234"],"NO":["Norway","+47"],"OM":["Oman","+968"],"PK":["Pakistan","+92"],"PS":["Palestine","+970"],"PH":["Philippines","+63"],"PL":["Poland","+48"],"PT":["Portugal","+351"],"QA":["Qatar","+974"],"RO":["Romania","+40"],"RU":["Russia","+7"],"SA":["Saudi Arabia","+966"],"SN":["Senegal","+221"],"RS":["Serbia","+381"],"SG":["Singapore","+65"],"ZA":["South Africa","+27"],"KR":["South Korea","+82"],"ES":["Spain","+34"],"LK":["Sri Lanka","+94"],"SE":["Sweden","+46"],"CH":["Switzerland","+41"],"SY":["Syria","+963"],"TW":["Taiwan","+886"],"TZ":["Tanzania","+255"],"TH":["Thailand","+66"],"TN":["Tunisia","+216"],"TR":["Turkey","+90"],"UG":["Uganda","+256"],"UA":["Ukraine","+380"],"AE":["UAE","+971"],"GB":["UK","+44"],"US":["USA","+1"],"UZ":["Uzbekistan","+998"],"VN":["Vietnam","+84"],"YE":["Yemen","+967"],"ZW":["Zimbabwe","+263"]};
  function getVisitorCountry(cb){
    // Use geojs.io - most reliable, no rate limits, CORS friendly
    fetch("https://get.geojs.io/v1/ip/country.json")
      .then(function(r){return r.json();})
      .then(function(d){
        if(d&&d.country){
          var info=CMAP[d.country];
          if(info)cb(info[1],info[0]);
          else cb(null,d.country);
        } else t2();
      }).catch(t2);
    function t2(){
      fetch("https://ipwho.is/")
        .then(function(r){return r.json();})
        .then(function(d){
          if(d&&d.country_code&&d.country){
            var info=CMAP[d.country_code];
            cb(info?info[1]:null,d.country);
          } else t3();
        }).catch(t3);
    }
    function t3(){
      fetch("https://api.country.is/")
        .then(function(r){return r.json();})
        .then(function(d){
          if(d&&d.country){
            var info=CMAP[d.country];
            cb(info?info[1]:null,info?info[0]:d.country);
          } else cb(null,"Unknown");
        }).catch(function(){cb(null,"Unknown");});
    }
  }
  function pickNumber(code){var g=groupByCountry(CFG.numbers);var keys=Object.keys(g);var home=keys[0];var mx=0;keys.forEach(function(k){if((g[k]||[]).length>mx){mx=(g[k]||[]).length;home=k;}});if(code){var c=code.startsWith("+")?code:"+"+code;if(g[c]&&g[c].length){var a=g[c];return a[Math.floor(Math.random()*a.length)];}}if(g[home]&&g[home].length){var a2=g[home];return a2[Math.floor(Math.random()*a2.length)];}return CFG.numbers[Math.floor(Math.random()*CFG.numbers.length)];}
  function checkStatus(cb){fetch(CFG.supabaseUrl+"/rest/v1/sites?id=eq."+CFG.siteId+"&select=enabled,payment,plan",{headers:{"apikey":CFG.supabaseKey,"Authorization":"Bearer "+CFG.supabaseKey}}).then(function(r){return r.json();}).then(function(d){if(d&&d[0])cb(d[0].enabled===true&&d[0].payment==="paid",d[0].plan||"basic");else cb(false,"basic");}).catch(function(){cb(true,CFG.plan);});}

  // ── Log click to Supabase ────────────────────────────────
  function logClick(countryCode,countryName,plan){
    var title=getTitle();
    var url=getLink();
    fetch(CFG.supabaseUrl+"/rest/v1/click_logs",{
      method:"POST",
      headers:{"apikey":CFG.supabaseKey,"Authorization":"Bearer "+CFG.supabaseKey,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({site_id:CFG.siteId,site_name:CFG.siteName,country_code:countryCode||"",country_name:countryName||"Unknown",page_url:url,product_title:title,plan:plan})
    }).catch(function(){});
    // Also update clicks count
    fetch(CFG.supabaseUrl+"/rest/v1/sites?id=eq."+CFG.siteId,{
      method:"PATCH",
      headers:{"apikey":CFG.supabaseKey,"Authorization":"Bearer "+CFG.supabaseKey,"Content-Type":"application/json"},
      body:JSON.stringify({last_active:new Date().toISOString()})
    }).catch(function(){});
  }

  var WA_SVG='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.533 5.853L0 24l6.305-1.508A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.214-3.732.893.924-3.638-.234-.374A9.818 9.818 0 1112 21.818z"/></svg>';
  var st=document.createElement("style");st.textContent="#wbm-fab{position:fixed;bottom:24px;right:24px;z-index:2147483647;}#wbm-fab a{display:flex;align-items:center;justify-content:center;width:60px;height:60px;background:#25D366;border-radius:50%;text-decoration:none;animation:wbm-glow 2.5s ease-in-out infinite;}#wbm-fab a:hover{transform:scale(1.12);}@keyframes wbm-glow{0%,100%{box-shadow:0 4px 20px rgba(37,211,102,.55);}50%{box-shadow:0 4px 36px rgba(37,211,102,.9);}}";document.head.appendChild(st);

  function getPrice(){var m=document.querySelector('[property="product:price:amount"],[itemprop="price"]');if(m)return (m.content||m.innerText||"").replace(/[^0-9.,]/g,"");var b=document.body.innerText||"";var ps=[/Price[:\\s]+PKR[\\s]?([\\d,]+)/i,/PKR[\\s]?([\\d,]+)/i,/\\$\\s?([\\d,]+)/,/AED[\\s]?([\\d,]+)/i,/SAR[\\s]?([\\d,]+)/i];for(var i=0;i<ps.length;i++){var mx=b.match(ps[i]);if(mx&&mx[1])return mx[1];}return "";}
  function getTitle(){var el=document.querySelector("h1.post-title,h1.entry-title,h1.product_title,.post-title,.entry-title,h1");return el?el.innerText.trim():document.title.split("|")[0].trim();}
  function getLink(){var c=document.querySelector('link[rel="canonical"]');return c?c.href:location.href.split("?")[0].split("#")[0];}
  function isSinglePage(){var cards=document.querySelectorAll(".post-outer,.hentry,li.product,.product-card");if(cards.length>1)return false;var canonical=(document.querySelector('link[rel="canonical"]')||{}).href||"";var isHome=(canonical===CFG.siteUrl||canonical===CFG.siteUrl+"/"||location.pathname==="/"||location.pathname==="");return !isHome;}
  function buildMsg(plan){if(plan==="basic")return "Assalam-o-Alaikum!\\n\\nI am interested in your products.\\n\\nStore: "+CFG.siteUrl;if(!isSinglePage())return "Assalam-o-Alaikum!\\n\\nI am visiting your store:\\n"+getLink();var title=getTitle(),price=getPrice(),link=getLink();var msg="Assalam-o-Alaikum, I want to order this product:\\n\\n";msg+="*Product:* "+title+"\\n";if(price)msg+="*Price:* "+price+"\\n";if(CFG.key)msg+="*Secret ID:* "+CFG.key+"\\n";msg+="*Link:* "+link;return msg;}

  var _countryCode=null,_countryName="Unknown";

  function addFAB(number,plan){
    if(document.getElementById("wbm-fab"))return;
    var msg=buildMsg(plan);
    var wrap=document.createElement("div");wrap.id="wbm-fab";
    var a=document.createElement("a");
    a.href="https://wa.me/"+number.replace(/\\D/g,"")+"?text="+encodeURIComponent(msg);
    a.target="_blank";a.rel="noopener noreferrer";
    a.innerHTML=WA_SVG;
    // Log click when button is clicked
    a.addEventListener("click",function(){logClick(_countryCode,_countryName,plan);});
    wrap.appendChild(a);document.body.appendChild(wrap);
  }
  function removeFAB(){var el=document.getElementById("wbm-fab");if(el)el.remove();}

  function init(){
    checkStatus(function(active,plan){
      if(!active){removeFAB();return;}
      getVisitorCountry(function(code,name){
        _countryCode=code;_countryName=name;
        var number=pickNumber(code);
        addFAB(number,plan);
      });
    });
    setInterval(function(){
      checkStatus(function(active,plan){
        removeFAB();
        if(!active)return;
        getVisitorCountry(function(code,name){_countryCode=code;_countryName=name;addFAB(pickNumber(code),plan);});
      });
    },5*60*1000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else setTimeout(init,300);
})();
<\/script>`;
}

// ─── SCHEMA SCRIPT v17 (Static + Dynamic) ────────────────
function genSchemaScript(site) {
  if (!site.enabled || site.payment !== "paid") {
    return `<!-- Schema Manager | ${site.name} | INACTIVE -->
<script>
(function(){
  document.querySelectorAll('script[data-wbm-schema]').forEach(function(el){el.remove();});
  var el=document.getElementById('wbm-schema-base');
  if(el)el.remove();
})();
<\/script>`;
  }

  const isPro = site.plan === "pro";
  const bName = (site.businessName || site.name).replace(/"/g, '');
  const bDesc = (site.businessDesc || "").replace(/"/g, '');
  const bPhone = (site.businessPhone || "").replace(/"/g, '');
  const bEmail = (site.businessEmail || "").replace(/"/g, '');
  const bAddr = (site.businessAddress || "").replace(/"/g, '');
  const bLogo = (site.businessLogo || "").replace(/"/g, '');
  const bType = site.businessType || "Organization";
  const socialLinks = JSON.stringify(site.socialLinks || []);

  return `<!-- WBManager Schema | ${site.name} | ${isPro ? "PRO" : "BASIC"} | v20 -->

<!-- STATIC BASE SCHEMA: Google bot detects this immediately -->
<script id='wbm-schema-base' type='application/ld+json'>
{
  "@context": "https://schema.org",
  "@type": "${bType}",
  "name": "${bName}",
  "url": "${site.url}"${bDesc ? `,
  "description": "${bDesc}"` : ""}${bPhone ? `,
  "telephone": "${bPhone}"` : ""}${bEmail ? `,
  "email": "${bEmail}"` : ""}${bAddr ? `,
  "address": {"@type": "PostalAddress", "streetAddress": "${bAddr}"}` : ""}${bLogo ? `,
  "logo": {"@type": "ImageObject", "url": "${bLogo}"}` : ""}${site.socialLinks && site.socialLinks.length ? `,
  "sameAs": ${socialLinks}` : ""}
}
<\/script>

<!-- PRODUCT SCHEMA: Static for Google bot -->
<script id='wbm-product-schema' type='application/ld+json'>
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "${bName}",
  "description": "${bDesc || bName + ' - quality products'}",
  "image": "${bLogo}",
  "brand": {
    "@type": "Brand",
    "name": "${bName}"
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "PKR",
    "price": "1",
    "availability": "https://schema.org/InStock",
    "url": "${site.url}",
    "seller": {
      "@type": "Organization",
      "name": "${bName}"
    },
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": "0",
        "currency": "PKR"
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 1,
          "maxValue": 3,
          "unitCode": "DAY"
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 2,
          "maxValue": 5,
          "unitCode": "DAY"
        }
      },
      "shippingDestination": {
        "@type": "DefinedRegion",
        "addressCountry": "PK"
      }
    },
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": "PK",
      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": 7,
      "returnMethod": "https://schema.org/ReturnByMail",
      "returnFees": "https://schema.org/FreeReturn"
    }
  }
}
<\/script>

<!-- BREADCRUMB SCHEMA: Static for Google bot -->
<script id='wbm-breadcrumb-schema' type='application/ld+json'>
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "${site.url}"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Products",
      "item": "${site.url}"
    }
  ]
}
<\/script>

<!-- ARTICLE SCHEMA: Static for Google bot -->
<script id='wbm-article-schema' type='application/ld+json'>
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${bName}",
  "author": {
    "@type": "Organization",
    "name": "${bName}"
  },
  "publisher": {
    "@type": "Organization",
    "name": "${bName}"${bLogo ? `,
    "logo": {
      "@type": "ImageObject",
      "url": "${bLogo}"
    }` : ""}
  },
  "datePublished": "${new Date().toISOString().split('T')[0]}",
  "dateModified": "${new Date().toISOString().split('T')[0]}"${bLogo ? `,
  "image": "${bLogo}"` : ""}
}
<\/script>

<!-- DYNAMIC UPDATER: Updates schemas with real page data -->
<script>
//<![CDATA[
(function(){
  var CFG={
    siteId:"${site.id}",
    siteUrl:"${site.url}",
    businessName:"${bName}",
    businessType:"${bType}",
    businessDesc:"${bDesc}",
    businessPhone:"${bPhone}",
    businessEmail:"${bEmail}",
    businessAddress:"${bAddr}",
    businessLogo:"${bLogo}",
    socialLinks:${socialLinks},
    plan:"${site.plan||"basic"}",
    supabaseUrl:"${SUPABASE_URL}",
    supabaseKey:"${SUPABASE_KEY}"
  };

  function checkStatus(cb){
    fetch(CFG.supabaseUrl+"/rest/v1/schema_sites?id=eq."+CFG.siteId+"&select=enabled,payment,plan",{
      headers:{"apikey":CFG.supabaseKey,"Authorization":"Bearer "+CFG.supabaseKey}
    }).then(function(r){return r.json();})
    .then(function(d){
      if(d&&d[0])cb(d[0].enabled===true&&d[0].payment==="paid",d[0].plan||"basic");
      else cb(false,"basic");
    }).catch(function(){cb(true,CFG.plan);});
  }

  // ── Price Detection — All currencies ──────────────────
  function detectPrice(){
    var bodyText=document.body.innerText||"";
    // Try meta tags first (most accurate)
    var metaPrice=document.querySelector('[property="product:price:amount"],[itemprop="price"]');
    if(metaPrice){
      var metaCur=document.querySelector('[property="product:price:currency"],[itemprop="priceCurrency"]');
      var p=(metaPrice.content||metaPrice.innerText||"").replace(/[^0-9.,]/g,"");
      if(p)return {price:p,currency:(metaCur?metaCur.content||metaCur.innerText:"PKR")||"PKR"};
    }
    // PKR / RS pattern (aapka original working)
    var pkrPattern=/(?:RS\.?|PKR)\s?([\d,]+)|([\d,]+)\s?(?:PKR|RS\.?)/i;
    var match=bodyText.match(pkrPattern);
    if(match){return {price:(match[1]||match[2]).replace(/,/g,""),currency:"PKR"};}
    // USD
    var dm=bodyText.match(/\$\s?([\d,]+\.?\d{0,2})/);
    if(dm)return {price:dm[1].replace(/,/g,""),currency:"USD"};
    // GBP
    var gm=bodyText.match(/£\s?([\d,]+\.?\d{0,2})/);
    if(gm)return {price:gm[1].replace(/,/g,""),currency:"GBP"};
    // EUR
    var em=bodyText.match(/€\s?([\d,]+[.,]?\d{0,2})/);
    if(em)return {price:em[1].replace(/,/g,""),currency:"EUR"};
    // AED
    var aed=bodyText.match(/AED\s?([\d,]+)/i);
    if(aed)return {price:aed[1].replace(/,/g,""),currency:"AED"};
    // SAR
    var sar=bodyText.match(/SAR\s?([\d,]+)/i);
    if(sar)return {price:sar[1].replace(/,/g,""),currency:"SAR"};
    // INR
    var inr=bodyText.match(/₹\s?([\d,]+)/);
    if(inr)return {price:inr[1].replace(/,/g,""),currency:"INR"};
    // Generic Price: label
    var gen=bodyText.match(/Price[:\s]+([\d,]+)/i);
    if(gen)return {price:gen[1].replace(/,/g,""),currency:"PKR"};
    return null;
  }

  function detectImage(){
    var og=document.querySelector('meta[property="og:image"]');
    if(og&&og.content)return og.content.replace(/\/w\d+-h\d+(-[^/]*)?(?=\/|$)/,"");
    var img=document.querySelector('.post-body img,.entry-content img');
    if(img&&img.src)return img.src;
    return CFG.businessLogo||null;
  }

  function isPostPage(){
    if(/\/\d{4}\/\d{2}\/.+\.html/.test(location.pathname))return true;
    var cards=document.querySelectorAll(".post-outer,.hentry");
    var isHome=(location.pathname==="/"||location.pathname===""||location.pathname==="/index.html");
    var hasPost=!!(document.querySelector(".post-body,.entry-content,.post-title,.entry-title"));
    return !isHome&&hasPost&&cards.length<=1;
  }

  function updateSchemas(plan){
    var isPost=isPostPage();
    var title=document.title.split("|")[0].trim();
    var url=(document.querySelector('link[rel="canonical"]')||{}).href||location.href;
    var img=detectImage();
    var date=(document.querySelector('[property="article:published_time"]')||{}).content||new Date().toISOString();
    var desc=(document.querySelector('meta[name="description"]')||{}).content||CFG.businessDesc||"";

    // Update Organization schema
    var orgEl=document.getElementById("wbm-schema-base");
    if(orgEl){
      try{
        var orgData=JSON.parse(orgEl.textContent);
        orgEl.textContent=JSON.stringify(orgData);
      }catch(e){}
    }

    // Remove old dynamic schemas
    document.querySelectorAll('script[data-wbm-dyn]').forEach(function(el){el.remove();});

    function addDyn(data){
      var el=document.createElement("script");
      el.type="application/ld+json";
      el.setAttribute("data-wbm-dyn","1");
      el.textContent=JSON.stringify(data);
      document.head.appendChild(el);
    }

    // BreadcrumbList
    if(isPost){
      addDyn({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Home","item":CFG.siteUrl},
        {"@type":"ListItem","position":2,"name":title,"item":url}
      ]});
    }

    // Article
    if(isPost){
      var art={"@context":"https://schema.org","@type":"Article","headline":title,"url":url,"datePublished":date,"author":{"@type":"Organization","name":CFG.businessName},"publisher":{"@type":"Organization","name":CFG.businessName}};
      if(desc)art.description=desc;
      if(img)art.image=img;
      if(CFG.businessLogo)art.publisher.logo={"@type":"ImageObject","url":CFG.businessLogo};
      addDyn(art);
    }

    // Product (Pro only) - Update static product schema + add dynamic
    if(plan==="pro"&&isPost){
      var priceInfo=detectPrice();
      // Update the static product schema element
      var prodEl=document.getElementById("wbm-product-schema");
      if(prodEl){
        try{
          var prodData=JSON.parse(prodEl.textContent);
          prodData.name=title;
          if(img)prodData.image=[img];
          if(desc)prodData.description=desc;
          prodData.url=url;
          prodData.brand={"@type":"Brand","name":CFG.businessName};
          if(priceInfo){prodData.offers.price=priceInfo.price;prodData.offers.priceCurrency=priceInfo.currency;}
          prodEl.textContent=JSON.stringify(prodData);
          console.log("WBManager: Product schema updated, Price:",priceInfo?priceInfo.price:"not found");
        }catch(e){}
      }
    } else {
      // Hide product schema on non-product/home pages
      var prodEl2=document.getElementById("wbm-product-schema");
      if(prodEl2&&!isPost)prodEl2.textContent='{"@context":"https://schema.org","@type":"Product","name":"'+CFG.businessName+'"}';
    }

    // WebSite on homepage
    if(!isPost){
      addDyn({"@context":"https://schema.org","@type":"WebSite","name":CFG.businessName,"url":CFG.siteUrl,"potentialAction":{"@type":"SearchAction","target":CFG.siteUrl+"/?q={search_term_string}","query-input":"required name=search_term_string"}});
    }

    // ItemList on listing pages (Pro)
    if(plan==="pro"&&!isPost){
      var items=[];
      document.querySelectorAll(".post-outer,.hentry,.product-card").forEach(function(el,i){
        var t=(el.querySelector("h2,h3,.entry-title,.post-title")||{}).innerText||"";
        var l=(el.querySelector("a")||{}).href||"";
        if(t&&l)items.push({"@type":"ListItem","position":i+1,"name":t,"url":l});
      });
      if(items.length)addDyn({"@context":"https://schema.org","@type":"ItemList","itemListElement":items});
    }
  }

  // ── Main: window load (aapka original approach) ────────
  function run(){
    checkStatus(function(active,plan){
      if(!active){
        document.querySelectorAll('script[data-wbm-dyn]').forEach(function(el){el.remove();});
        var b=document.getElementById("wbm-schema-base");if(b)b.remove();
        var p=document.getElementById("wbm-product-schema");if(p)p.remove();
        return;
      }
      updateSchemas(plan);
    });
  }

  // Use window load like aapka original code
  if(document.readyState==="complete"){run();}
  else{window.addEventListener("load",run);}

  // Recheck every 5 min
  setInterval(function(){
    checkStatus(function(active,plan){
      if(!active)return;
      updateSchemas(plan);
    });
  },5*60*1000);

  // SPA navigation detection
  var lastUrl=location.href;
  new MutationObserver(function(){
    if(location.href!==lastUrl){
      lastUrl=location.href;
      setTimeout(function(){
        checkStatus(function(active,plan){if(!active)return;updateSchemas(plan);});
      },800);
    }
  }).observe(document.body,{childList:true,subtree:true});

})();
//]]>
<\/script>
<!-- End WBManager Schema v17 -->`;
}


function waReminderMsg(site) {
  const n = (site.numbers ? site.numbers[0] : site.businessPhone || "").replace(/\D/g, "");
  if (!n) return "#";
  const msg = `Assalam o Alaikum! 👋\n\n⚠️ *Service Payment Pending*\n\nAapki website *${site.url}* ki service payment pending hai.\n\nKripya jald payment karein.\n\nShukriya!\n— WBManager Team`;
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
.btn-schema{background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:9px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;}
.btn-logs{background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;border:none;border-radius:9px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;}
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
.nav-section{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;padding:10px 14px 4px;}
.nav-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:none;background:transparent;color:#64748b;cursor:pointer;font-size:13px;font-weight:500;width:100%;text-align:left;transition:all .15s;}
.nav-btn:hover{background:#f8fafc;}
.nav-btn.active-wbm{background:#dcfce7;color:#16a34a;font-weight:700;}
.nav-btn.active-schema{background:#fdf4ff;color:#7c3aed;font-weight:700;}
.nav-btn.active-logs{background:#ecfeff;color:#0891b2;font-weight:700;}
.tab-btn{background:transparent;border:none;color:#94a3b8;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;}
.tab-btn.active{background:#f0fdf4;color:#16a34a;font-weight:700;}
.alert-w{background:#fef9c3;border:1px solid #fde68a;color:#854d0e;border-radius:10px;padding:12px 16px;font-size:13px;margin-bottom:14px;}
.success-box{background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 16px;font-size:13px;color:#166534;margin-bottom:14px;line-height:1.7;}
.schema-info{background:#fdf4ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 16px;font-size:13px;color:#6b21a8;margin-bottom:14px;line-height:1.7;}
.logs-info{background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;padding:14px 16px;font-size:13px;color:#0e7490;margin-bottom:14px;line-height:1.7;}
.script-box{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;overflow:auto;font-size:11px;color:#7dd3fc;line-height:1.7;font-family:monospace;max-height:280px;white-space:pre-wrap;word-break:break-word;}
.modal-ov{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;}
.modal{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:30px 26px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2);}
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f0fdf4,#fdf4ff);padding:16px;}
.login-card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:40px 32px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.1);}
.toast{position:fixed;top:16px;right:16px;z-index:9999;padding:12px 20px;border-radius:11px;color:#fff;font-weight:700;font-size:13px;box-shadow:0 4px 24px rgba(0,0,0,.2);max-width:320px;}
.loading{display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:14px;}
.spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#25D366;border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.toggle-btn{position:relative;width:44px;height:24px;border-radius:12px;border:none;cursor:pointer;transition:background .2s;flex-shrink:0;}
.toggle-btn.on{background:#25D366;}
.toggle-btn.off{background:#cbd5e1;}
.toggle-btn::after{content:"";position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
.toggle-btn.on::after{left:23px;}
.toggle-btn.off::after{left:3px;}
.live-badge{background:#dcfce7;color:#16a34a;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #86efac;margin-left:4px;}
.geo-badge{background:#fdf4ff;color:#7c3aed;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #e9d5ff;margin-left:4px;}
.logs-badge{background:#ecfeff;color:#0891b2;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #a5f3fc;margin-left:4px;}
.divider{height:1px;background:#e2e8f0;margin:6px 0;}
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

/* Click Logs Table */
.logs-table{width:100%;border-collapse:collapse;font-size:12px;}
.logs-table th{background:#f8fafc;padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px;text-transform:uppercase;border-bottom:2px solid #e2e8f0;}
.logs-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#475569;vertical-align:middle;}
.logs-table tr:hover td{background:#f8fafc;}
.log-country{display:inline-flex;align-items:center;gap:4px;font-weight:600;color:#1e293b;}
.log-site{font-weight:600;color:#2563eb;font-size:11px;}
.log-plan-basic{background:#f0f9ff;color:#0369a1;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid #bae6fd;}
.log-plan-pro{background:#fef9c3;color:#92400e;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid #fbbf24;}
.log-title{color:#64748b;font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* Stats mini cards */
.mini-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
.mini-stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;}
.mini-stat-val{font-size:22px;font-weight:800;color:#0891b2;}
.mini-stat-label{font-size:11px;color:#94a3b8;margin-top:2px;}

/* Country chart */
.country-bar{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.country-bar-label{font-size:12px;color:#1e293b;font-weight:600;width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.country-bar-track{flex:1;background:#f1f5f9;border-radius:20px;height:8px;overflow:hidden;}
.country-bar-fill{height:100%;border-radius:20px;background:linear-gradient(90deg,#0891b2,#06b6d4);}
.country-bar-count{font-size:11px;color:#64748b;font-weight:600;width:30px;text-align:right;}

.schema-type-badge{display:inline-block;background:#fdf4ff;color:#7c3aed;border:1px solid #e9d5ff;border-radius:20px;font-size:10px;font-weight:700;padding:2px 8px;margin:2px;}

@media(min-width:900px){.sidebar{transform:translateX(0)!important;}.main-wrap{margin-left:230px!important;}.sidebar-overlay{display:none!important;}.menu-btn{display:none!important;}.stats-grid{grid-template-columns:repeat(6,1fr);}}
@media(max-width:899px){.stats-grid{grid-template-columns:repeat(3,1fr);}.form-grid{grid-template-columns:1fr;}.page{padding:14px;}.plan-compare{grid-template-columns:1fr;}.mini-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:500px){.stats-grid{grid-template-columns:repeat(2,1fr);}.page{padding:10px;}.card{padding:14px;}}
`;

function injectCSS() { if (document.getElementById("wbm-css")) return; const s = document.createElement("style"); s.id = "wbm-css"; s.textContent = CSS; document.head.appendChild(s); }

// ─── LOGIN ─────────────────────────────────────────────────
function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [rec, setRec] = useState(""); const [np, setNp] = useState(""); const [cp, setCp] = useState("");
  const [err, setErr] = useState(""); const [show, setShow] = useState(false);
  const savedPass = localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASS;
  function doLogin() { setErr(""); if (!u.trim() || !p.trim()) { setErr("Username aur password zaroor bharein!"); return; } if (u.trim() === ADMIN_USER && p === savedPass) { setSession(); onLogin(); } else setErr("Username ya password galat hai!"); }
  function doRecover() { setErr(""); if (rec.trim() === RECOVERY_CODE) setMode("newpass"); else setErr("Recovery code galat hai!"); }
  function doNewPass() { setErr(""); if (np.length < 6) { setErr("Min 6 characters!"); return; } if (np !== cp) { setErr("Passwords match nahi!"); return; } localStorage.setItem(ADMIN_PASS_KEY, np); setMode("login"); alert("✅ Password change ho gaya!"); }
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, background: "#dcfce7", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</div>
            <div style={{ width: 40, height: 40, background: "#fdf4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔖</div>
            <div style={{ width: 40, height: 40, background: "#ecfeff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📊</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>WBManager Suite</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>v20.0 — WhatsApp + Schema + Click Logs</div>
        </div>
        {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 10, padding: "11px 14px", fontSize: 13, marginBottom: 16, textAlign: "center" }}>⚠️ {err}</div>}
        {mode === "login" && (<>
          <div className="fg"><label className="lbl">USERNAME</label><input className="inp" placeholder="admin" value={u} onChange={e => { setU(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && doLogin()} /></div>
          <div className="fg" style={{ marginBottom: 8 }}><label className="lbl">PASSWORD</label><div style={{ position: "relative" }}><input className="inp" style={{ paddingRight: 44 }} type={show ? "text" : "password"} placeholder="••••••••" value={p} onChange={e => { setP(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && doLogin()} /><span onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 18 }}>{show ? "🙈" : "👁"}</span></div></div>
          <div style={{ textAlign: "right", marginBottom: 20 }}><span onClick={() => { setMode("recover"); setErr(""); }} style={{ fontSize: 12, color: "#16a34a", cursor: "pointer", fontWeight: 600 }}>🔑 Forgot Password?</span></div>
          <button className="btn-p" style={{ width: "100%", padding: 13, fontSize: 15, borderRadius: 10 }} onClick={doLogin}>Login →</button>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", marginTop: 14, fontSize: 12, color: "#0369a1" }}>🕐 Auto-logout: 30 min idle | 🔑 Recovery: WBM-RECOVERY-2026-ADNAN</div>
        </>)}
        {mode === "recover" && (<>
          <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#854d0e" }}>🔑 <b style={{ fontFamily: "monospace" }}>WBM-RECOVERY-2026-ADNAN</b></div>
          <div className="fg"><label className="lbl">RECOVERY CODE</label><input className="inp" value={rec} onChange={e => { setRec(e.target.value); setErr(""); }} /></div>
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

// ─── NUMBER GROUPS ────────────────────────────────────────
function NumberGroups({ numbers }) {
  const groups = {};
  numbers.forEach(num => { const info = getNumberInfo(num); if (!groups[info.code]) groups[info.code] = { info, nums: [] }; groups[info.code].nums.push(num); });
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{Object.values(groups).map(g => <span key={g.info.code} style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#6b21a8", fontWeight: 600 }}>{g.info.flag} {g.info.name} ({g.nums.length})</span>)}</div>;
}

// ─── SITE CARD ────────────────────────────────────────────
function SiteCard({ site, onScript, onEdit, onDelete, onToggle, onPlan, onPayment, onVerify, verifying, isSchema }) {
  return (
    <div className="site-card">
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
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{isSchema ? "Schema:" : "Button:"}</span>
            <button className={`toggle-btn ${site.enabled ? "on" : "off"}`} onClick={() => onToggle(site)} />
            <span style={{ fontSize: 12, fontWeight: 700, color: site.enabled ? "#16a34a" : "#94a3b8" }}>{site.enabled ? "ON" : "OFF"}</span>
          </div>
          <span className={`badge ${site.payment === "paid" ? "badge-blue" : "badge-amber"}`}>{site.payment === "paid" ? "💰 Paid" : "⏳ Pending"}</span>
        </div>
      </div>
      {!isSchema && site.numbers && <NumberGroups numbers={site.numbers} />}
      {isSchema && <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}><span className="schema-type-badge">Organization</span><span className="schema-type-badge">Article</span><span className="schema-type-badge">BreadcrumbList</span>{site.plan === "pro" && <><span className="schema-type-badge">Product ⭐</span><span className="schema-type-badge">ItemList ⭐</span></>}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{[`📅 ${fmtDate(site.installedAt || site.createdAt)}`, `🕐 ${timeAgo(site.installedAt || site.createdAt)}`].map(c => <span key={c} className="chip">{c}</span>)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Plan:</span>
        <button className={`plan-btn${site.plan === "basic" ? " basic-active" : ""}`} onClick={() => onPlan(site.id, "basic")}>🔵 Basic</button>
        <button className={`plan-btn${site.plan === "pro" ? " pro-active" : ""}`} onClick={() => onPlan(site.id, "pro")}>🚀 Pro</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Payment:</span>
        <button className={`btn-pay${site.payment === "paid" ? " paid" : ""}`} onClick={() => onPayment(site.id, "paid")}>✅ Paid</button>
        <button className={`btn-pay${site.payment === "pending" ? " pend" : ""}`} onClick={() => onPayment(site.id, "pending")}>⏳ Pending</button>
        {!site.verified && <button className="btn-ver" onClick={() => onVerify(site.id)} disabled={verifying === site.id}>{verifying === site.id ? "⏳..." : "🔍 Verify"}</button>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button className="btn-a" onClick={() => onScript(site)}>📋 Script</button>
        <button className="btn-a" onClick={() => onEdit(site)}>✏️ Edit</button>
        <button className="btn-a" style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }} onClick={() => onDelete(site)}>🗑 Delete</button>
        <button className="btn-a" style={{ background: "#f0fdf4", color: "#16a34a", borderColor: "#86efac" }} onClick={() => window.open(waReminderMsg(site), "_blank")}>📤 WA</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────
const EF_WBM = { name: "", url: "", secretKey: "", numbers: [""], payment: "paid", plan: "basic" };
const EF_SCHEMA = { name: "", url: "", payment: "paid", plan: "basic", businessName: "", businessType: "Organization", businessDesc: "", businessPhone: "", businessEmail: "", businessAddress: "", businessLogo: "", socialLinks: [] };

export default function App() {
  useEffect(() => { injectCSS(); }, []);
  const [loggedIn, setLoggedIn] = useState(() => !!getSession());
  const [activeModule, setActiveModule] = useState("wbm");

  // WBM
  const [sites, setSites] = useState([]);
  const [loadingWBM, setLoadingWBM] = useState(true);
  const [viewWBM, setViewWBM] = useState("dashboard");
  const [selWBM, setSelWBM] = useState(null);
  const [formWBM, setFormWBM] = useState(EF_WBM);
  const [copiedWBM, setCopiedWBM] = useState(false);
  const [tabWBM, setTabWBM] = useState("script");
  const [verifyingWBM, setVerifyingWBM] = useState(null);

  // Schema
  const [schemaSites, setSchemaSites] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [viewSchema, setViewSchema] = useState("dashboard");
  const [selSchema, setSelSchema] = useState(null);
  const [formSchema, setFormSchema] = useState(EF_SCHEMA);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [verifyingSchema, setVerifyingSchema] = useState(null);
  const [socialInput, setSocialInput] = useState("");

  // Click Logs
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState("all");

  // Common
  const [toast, setToast] = useState(null);
  const [delItem, setDelItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [isWide, setIsWide] = useState(window.innerWidth >= 900);

  useEffect(() => { const i = setInterval(() => { if (loggedIn && !getSession()) setLoggedIn(false); if (loggedIn) setSession(); }, 60000); return () => clearInterval(i); }, [loggedIn]);
  useEffect(() => { const fn = () => setIsWide(window.innerWidth >= 900); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);

  const loadWBM = useCallback(async () => { setLoadingWBM(true); const d = await sb.getSites(); if (d) setSites(d.map(mapRow)); setLoadingWBM(false); }, []);
  const loadSchema = useCallback(async () => { setLoadingSchema(true); const d = await sb.getSchemaSites(); if (d) setSchemaSites(d.map(mapSchemaRow)); setLoadingSchema(false); }, []);
  const loadLogs = useCallback(async () => { setLoadingLogs(true); const d = await sb.getLogs(); if (d) setLogs(d); setLoadingLogs(false); }, []);

  useEffect(() => { if (loggedIn) { loadWBM(); loadSchema(); loadLogs(); } }, [loggedIn, loadWBM, loadSchema, loadLogs]);

  if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

  function toast_(msg, t = "ok") { setToast({ msg, t }); setTimeout(() => setToast(null), 3500); }
  function logout() { clearSession(); setLoggedIn(false); }

  // WBM functions
  function goWBM(v) { setViewWBM(v); setNavOpen(false); setSession(); }
  function openAddWBM() { setFormWBM({ ...EF_WBM, numbers: [""] }); goWBM("add"); }
  function openEditWBM(s) { setSelWBM(s); setFormWBM({ name: s.name, url: s.url, secretKey: s.secretKey || "", numbers: [...s.numbers], payment: s.payment || "paid", plan: s.plan || "basic" }); goWBM("edit"); }
  function openScriptWBM(s) { setSelWBM(s); setCopiedWBM(false); setTabWBM("script"); goWBM("script"); }

  async function saveWBM() {
    const nums = formWBM.numbers.filter(n => n.trim());
    if (!formWBM.name.trim() || !formWBM.url.trim() || !nums.length) { toast_("Sab required fields bharein!", "err"); return; }
    setSaving(true);
    const d = { id: viewWBM === "add" ? genId() : selWBM.id, name: formWBM.name.trim(), url: formWBM.url.trim(), enabled: formWBM.payment === "paid", numbers: nums, secretKey: formWBM.secretKey.trim(), installedAt: viewWBM === "add" ? new Date().toISOString() : selWBM.installedAt, lastActive: new Date().toISOString(), payment: formWBM.payment, plan: formWBM.plan, clicks: viewWBM === "add" ? 0 : selWBM.clicks, impressions: 0, verified: viewWBM === "add" ? false : selWBM.verified };
    const res = await sb.upsertSite(d);
    if (res !== null) { toast_(viewWBM === "add" ? "Website add! ✅" : "Update! ✅"); await loadWBM(); goWBM("dashboard"); } else toast_("Error!", "err");
    setSaving(false);
  }

  async function toggleWBM(site) { if (site.payment === "pending") { toast_("Pehle payment karein!", "err"); return; } const ne = !site.enabled; setSites(p => p.map(s => s.id === site.id ? { ...s, enabled: ne } : s)); await sb.updateSite(site.id, { enabled: ne }); toast_(ne ? "✅ ON!" : "⏸ OFF!"); }
  async function planWBM(id, plan) { setSites(p => p.map(s => s.id === id ? { ...s, plan } : s)); await sb.updateSite(id, { plan }); toast_(plan === "pro" ? "🚀 Pro!" : "🔵 Basic!"); }
  async function paymentWBM(id, val) { const site = sites.find(s => s.id === id); setSites(p => p.map(s => s.id === id ? { ...s, payment: val, enabled: val === "pending" ? false : s.enabled } : s)); if (selWBM?.id === id) setSelWBM(s => ({ ...s, payment: val })); await sb.updateSite(id, { payment: val, enabled: val === "pending" ? false : (site?.enabled ?? true) }); if (val === "pending") { setTimeout(() => window.open(waReminderMsg(site || {}), "_blank"), 400); toast_("WA reminder 📤", "warn"); } else toast_("Confirmed! ✅"); }
  async function verifyWBM(id) { setVerifyingWBM(id); await sb.updateSite(id, { verified: true }); setSites(p => p.map(s => s.id === id ? { ...s, verified: true } : s)); setVerifyingWBM(null); toast_("Verified! ✅"); }
  async function deleteWBM(id) { await sb.deleteSite(id); setSites(p => p.filter(s => s.id !== id)); setDelItem(null); toast_("Removed!", "err"); }

  // Schema functions
  function goSchema(v) { setViewSchema(v); setNavOpen(false); setSession(); }
  function openAddSchema() { setFormSchema({ ...EF_SCHEMA }); setSocialInput(""); goSchema("add"); }
  function openEditSchema(s) { setSelSchema(s); setFormSchema({ name: s.name, url: s.url, payment: s.payment || "paid", plan: s.plan || "basic", businessName: s.businessName || "", businessType: s.businessType || "Organization", businessDesc: s.businessDesc || "", businessPhone: s.businessPhone || "", businessEmail: s.businessEmail || "", businessAddress: s.businessAddress || "", businessLogo: s.businessLogo || "", socialLinks: [...(s.socialLinks || [])] }); setSocialInput(""); goSchema("edit"); }
  function openScriptSchema(s) { setSelSchema(s); setCopiedSchema(false); goSchema("script"); }

  async function saveSchema() {
    if (!formSchema.name.trim() || !formSchema.url.trim()) { toast_("Name aur URL zaroor bharein!", "err"); return; }
    setSaving(true);
    const d = {
      id: viewSchema === "add" ? genId() : selSchema.id,
      name: formSchema.name.trim(), url: formSchema.url.trim(),
      enabled: formSchema.payment === "paid", payment: formSchema.payment, plan: formSchema.plan,
      businessName: formSchema.businessName, businessType: formSchema.businessType,
      businessDesc: formSchema.businessDesc, businessPhone: formSchema.businessPhone,
      businessEmail: formSchema.businessEmail, businessAddress: formSchema.businessAddress,
      businessLogo: formSchema.businessLogo, socialLinks: formSchema.socialLinks,
      createdAt: viewSchema === "add" ? new Date().toISOString() : selSchema.createdAt,
      verified: viewSchema === "add" ? false : selSchema.verified
    };
    let res;
    if (viewSchema === "edit" && selSchema.id) {
      // Use PATCH for updates to ensure all fields are updated
      res = await sb.updateSchemaSite(selSchema.id, {
        name: d.name, url: d.url, enabled: d.enabled, payment: d.payment, plan: d.plan,
        business_name: d.businessName, business_type: d.businessType,
        business_desc: d.businessDesc, business_phone: d.businessPhone,
        business_email: d.businessEmail, business_address: d.businessAddress,
        business_logo: d.businessLogo, social_links: d.socialLinks,
      });
    } else {
      res = await sb.upsertSchemaSite(d);
    }
    if (res !== null) { toast_(viewSchema === "add" ? "Schema site add! ✅" : "Update ho gaya! ✅"); await loadSchema(); goSchema("dashboard"); } else toast_("Error — dobara try karein!", "err");
    setSaving(false);
  }

  async function toggleSchema(site) { if (site.payment === "pending") { toast_("Pehle payment karein!", "err"); return; } const ne = !site.enabled; setSchemaSites(p => p.map(s => s.id === site.id ? { ...s, enabled: ne } : s)); await sb.updateSchemaSite(site.id, { enabled: ne }); toast_(ne ? "✅ ON!" : "⏸ OFF!"); }
  async function planSchema(id, plan) { setSchemaSites(p => p.map(s => s.id === id ? { ...s, plan } : s)); if (selSchema?.id === id) setSelSchema(s => ({ ...s, plan })); await sb.updateSchemaSite(id, { plan }); toast_(plan === "pro" ? "🚀 Pro!" : "🔵 Basic!"); }
  async function paymentSchema(id, val) { const site = schemaSites.find(s => s.id === id); setSchemaSites(p => p.map(s => s.id === id ? { ...s, payment: val, enabled: val === "pending" ? false : s.enabled } : s)); if (selSchema?.id === id) setSelSchema(s => ({ ...s, payment: val })); await sb.updateSchemaSite(id, { payment: val, enabled: val === "pending" ? false : (site?.enabled ?? true) }); if (val === "pending") { setTimeout(() => window.open(waReminderMsg(site || {}), "_blank"), 400); toast_("WA reminder 📤", "warn"); } else toast_("Confirmed! ✅"); }
  async function verifySchema(id) { setVerifyingSchema(id); await sb.updateSchemaSite(id, { verified: true }); setSchemaSites(p => p.map(s => s.id === id ? { ...s, verified: true } : s)); setVerifyingSchema(null); toast_("Verified! ✅"); }
  async function deleteSchema(id) { await sb.deleteSchemaSite(id); setSchemaSites(p => p.filter(s => s.id !== id)); setDelItem(null); toast_("Removed!", "err"); }

  // Click Logs analytics
  const filteredLogs = logFilter === "all" ? logs : logs.filter(l => l.site_id === logFilter);
  const totalClicks = filteredLogs.length;
  const uniqueSites = [...new Set(logs.map(l => l.site_id))].length;
  const todayClicks = filteredLogs.filter(l => new Date(l.clicked_at).toDateString() === new Date().toDateString()).length;
  const countryCounts = {};
  filteredLogs.forEach(l => { const k = `${l.country_name||"Unknown"}`; countryCounts[k] = (countryCounts[k] || 0) + 1; });
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCountry = topCountries[0]?.[1] || 1;

  const toastBg = { ok: "#16a34a", err: "#dc2626", warn: "#d97706" };
  const isSchemaModule = activeModule === "schema";
  const isLogsModule = activeModule === "logs";

  const WBM_STATS = [
    { lb: "Total", val: sites.length, ic: "🌐", cl: "#2563eb" },
    { lb: "Active", val: sites.filter(s => s.enabled).length, ic: "✅", cl: "#16a34a" },
    { lb: "Basic", val: sites.filter(s => s.plan === "basic").length, ic: "🔵", cl: "#0369a1" },
    { lb: "Pro", val: sites.filter(s => s.plan === "pro").length, ic: "🚀", cl: "#d97706" },
    { lb: "Paid", val: sites.filter(s => s.payment === "paid").length, ic: "💰", cl: "#7c3aed" },
    { lb: "Pending", val: sites.filter(s => s.payment === "pending").length, ic: "⏳", cl: "#dc2626" },
  ];
  const SCHEMA_STATS = [
    { lb: "Total", val: schemaSites.length, ic: "🔖", cl: "#7c3aed" },
    { lb: "Active", val: schemaSites.filter(s => s.enabled).length, ic: "✅", cl: "#16a34a" },
    { lb: "Basic", val: schemaSites.filter(s => s.plan === "basic").length, ic: "🔵", cl: "#0369a1" },
    { lb: "Pro", val: schemaSites.filter(s => s.plan === "pro").length, ic: "🚀", cl: "#d97706" },
    { lb: "Paid", val: schemaSites.filter(s => s.payment === "paid").length, ic: "💰", cl: "#7c3aed" },
    { lb: "Pending", val: schemaSites.filter(s => s.payment === "pending").length, ic: "⏳", cl: "#dc2626" },
  ];

  const currentView = isSchemaModule ? viewSchema : isLogsModule ? "logs" : viewWBM;

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
              <button className="btn-p" style={{ background: "#dc2626", boxShadow: "none" }} onClick={() => delItem._type === "schema" ? deleteSchema(delItem.id) : deleteWBM(delItem.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className={`sidebar-overlay${navOpen ? " show" : ""}`} onClick={() => setNavOpen(false)} />

      {/* SIDEBAR */}
      <aside className={`sidebar${!isWide && !navOpen ? " hidden" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 28, height: 28, background: "#dcfce7", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💬</div>
            <div style={{ width: 28, height: 28, background: "#fdf4ff", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔖</div>
            <div style={{ width: 28, height: 28, background: "#ecfeff", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📊</div>
          </div>
          <div><div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b" }}>WBManager Suite</div><div style={{ fontSize: 9, color: "#94a3b8" }}>v16.0</div></div>
          {!isWide && <button onClick={() => setNavOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>}
        </div>

        <div className="nav-section">💬 WhatsApp</div>
        <nav style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          <button className={`nav-btn${activeModule === "wbm" && viewWBM === "dashboard" ? " active-wbm" : ""}`} onClick={() => { setActiveModule("wbm"); goWBM("dashboard"); }}><span>⊞</span> Dashboard</button>
          <button className={`nav-btn${activeModule === "wbm" && viewWBM === "add" ? " active-wbm" : ""}`} onClick={() => { setActiveModule("wbm"); openAddWBM(); }}><span>＋</span> Add Website</button>
        </nav>

        <div className="divider" style={{ margin: "6px 14px" }} />
        <div className="nav-section">🔖 Schema</div>
        <nav style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          <button className={`nav-btn${activeModule === "schema" && viewSchema === "dashboard" ? " active-schema" : ""}`} onClick={() => { setActiveModule("schema"); goSchema("dashboard"); }}><span>⊞</span> Dashboard</button>
          <button className={`nav-btn${activeModule === "schema" && viewSchema === "add" ? " active-schema" : ""}`} onClick={() => { setActiveModule("schema"); openAddSchema(); }}><span>＋</span> Add Website</button>
        </nav>

        <div className="divider" style={{ margin: "6px 14px" }} />
        <div className="nav-section">📊 Analytics</div>
        <nav style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          <button className={`nav-btn${activeModule === "logs" ? " active-logs" : ""}`} onClick={() => { setActiveModule("logs"); setNavOpen(false); loadLogs(); }}><span>📊</span> Click Logs</button>
        </nav>

        <div style={{ flex: 1 }} />
        <div style={{ padding: "10px 14px", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 3 }}>💬 {sites.filter(s => s.enabled).length} active WA sites</div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, marginBottom: 3 }}>🔖 {schemaSites.filter(s => s.enabled).length} active schemas</div>
          <div style={{ fontSize: 11, color: "#0891b2", fontWeight: 600, marginBottom: 10 }}>📊 {logs.length} total clicks</div>
          <button onClick={logout} style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 9, padding: "8px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🚪 Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className={`main-wrap${isWide ? " with-sidebar" : ""}`}>
        <div className="topbar">
          {!isWide && <button className="menu-btn btn-g" style={{ padding: "8px 12px", fontSize: 18 }} onClick={() => setNavOpen(true)}>☰</button>}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1e293b", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {isLogsModule ? "📊 Click Logs" : isSchemaModule ? "🔖 Schema Manager" : "💬 WhatsApp Manager"}
              <span className="live-badge">● LIVE</span>
              {!isSchemaModule && !isLogsModule && <span className="geo-badge">🌍 GEO</span>}
              {isLogsModule && <span className="logs-badge">REAL-TIME</span>}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {isLogsModule ? `${logs.length} total clicks · ${uniqueSites} sites · ${todayClicks} today` : isSchemaModule ? (currentView === "dashboard" ? `${schemaSites.filter(s => s.enabled).length} active` : selSchema?.name) : (currentView === "dashboard" ? `${sites.filter(s => s.enabled).length} active · Geo ON` : selWBM?.name || "Naya website")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(currentView === "dashboard" || isLogsModule) && <button className="btn-g" style={{ fontSize: 12, padding: "8px 12px" }} onClick={isLogsModule ? loadLogs : isSchemaModule ? loadSchema : loadWBM}>🔄</button>}
            {!isLogsModule && (currentView === "dashboard" ? <button className={isSchemaModule ? "btn-schema" : "btn-p"} onClick={isSchemaModule ? openAddSchema : openAddWBM}>+ Add</button> : <button className="btn-g" onClick={() => isSchemaModule ? goSchema("dashboard") : goWBM("dashboard")}>← Back</button>)}
          </div>
        </div>

        <div className="page">

          {/* ══ WBM DASHBOARD ══ */}
          {!isSchemaModule && !isLogsModule && viewWBM === "dashboard" && (<>
            <div className="stats-grid">{WBM_STATS.map(s => <div key={s.lb} className="stat-card"><span style={{ fontSize: 22 }}>{s.ic}</span><span style={{ fontSize: 24, fontWeight: 800, color: s.cl, lineHeight: 1 }}>{s.val}</span><span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{s.lb}</span></div>)}</div>
            <div style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#6b21a8" }}>🌍 <b>Geo Routing + Click Logs Active</b> — Har click Supabase mein automatically save hoga!</div>
            {loadingWBM ? <div className="loading"><div className="spinner" /></div> : (
              <div className="card">
                <div className="card-title">💬 WhatsApp Sites ({sites.length})</div>
                {sites.length === 0 ? <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 48, marginBottom: 14 }}>🌐</div><p style={{ color: "#94a3b8", marginBottom: 18 }}>Koi website nahi!</p><button className="btn-p" onClick={openAddWBM}>+ Add</button></div> : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{sites.map(site => <SiteCard key={site.id} site={site} onScript={openScriptWBM} onEdit={openEditWBM} onDelete={s => setDelItem(s)} onToggle={toggleWBM} onPlan={planWBM} onPayment={paymentWBM} onVerify={verifyWBM} verifying={verifyingWBM} isSchema={false} />)}</div>}
              </div>
            )}
          </>)}

          {/* ══ WBM ADD/EDIT ══ */}
          {!isSchemaModule && !isLogsModule && (viewWBM === "add" || viewWBM === "edit") && (
            <div className="card">
              <div className="form-grid" style={{ marginBottom: 4 }}>
                <div className="fg"><label className="lbl">Website Name *</label><input className="inp" placeholder="My Store" value={formWBM.name} onChange={e => setFormWBM(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Website URL *</label><input className="inp" placeholder="https://yoursite.com" value={formWBM.url} onChange={e => setFormWBM(f => ({ ...f, url: e.target.value }))} /></div>
                <div className="fg" style={{ gridColumn: "1/-1" }}><label className="lbl">Secret ID</label><input className="inp" placeholder="e.g. SDP001" value={formWBM.secretKey} onChange={e => setFormWBM(f => ({ ...f, secretKey: e.target.value }))} /></div>
              </div>
              <div className="fg">
                <label className="lbl">WhatsApp Numbers * <span style={{ color: "#7c3aed", fontSize: 11 }}>🌍 Geo auto</span></label>
                <div style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#6b21a8", marginBottom: 8 }}>+92 PK | +971 UAE | +966 SA | +965 KW | +1 US | +44 UK</div>
                {formWBM.numbers.map((n, i) => { const info = n.trim() ? getNumberInfo(n) : null; return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}><span style={{ fontSize: 18 }}>{info ? info.flag : "📱"}</span><input className="inp" style={{ flex: 1 }} placeholder="+92 300 1234567" value={n} onChange={e => { const a = [...formWBM.numbers]; a[i] = e.target.value; setFormWBM(f => ({ ...f, numbers: a })); }} />{info && <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, whiteSpace: "nowrap" }}>{info.name}</span>}{formWBM.numbers.length > 1 && <button onClick={() => setFormWBM(f => ({ ...f, numbers: f.numbers.filter((_, j) => j !== i) }))} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "8px 11px", cursor: "pointer", fontWeight: 700 }}>✕</button>}</div>; })}
                <button onClick={() => setFormWBM(f => ({ ...f, numbers: [...f.numbers, ""] }))} style={{ background: "transparent", border: "2px dashed #e2e8f0", color: "#94a3b8", borderRadius: 9, padding: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, width: "100%" }}>+ Add Number</button>
              </div>
              <div className="fg">
                <label className="lbl">SELECT PLAN *</label>
                <div className="plan-compare">
                  <div className={`plan-card basic${formWBM.plan === "basic" ? " selected" : ""}`} onClick={() => setFormWBM(f => ({ ...f, plan: "basic" }))}><div className="plan-card-title">🔵 Basic</div><div className="plan-price">PKR 499<span style={{ fontSize: 12 }}>/mo</span></div><div className="plan-feature">WhatsApp button</div><div className="plan-feature">Inquiry message</div><div className="plan-feature">🌍 Geo Routing</div><div className="plan-feature">📊 Click Logs</div><div className="plan-feature no">Product details nahi</div></div>
                  <div className={`plan-card pro${formWBM.plan === "pro" ? " selected" : ""}`} onClick={() => setFormWBM(f => ({ ...f, plan: "pro" }))}><div className="plan-card-title">🚀 Pro</div><div className="plan-price">PKR 999<span style={{ fontSize: 12 }}>/mo</span></div><div className="plan-feature">WhatsApp button</div><div className="plan-feature">🌍 Geo Routing</div><div className="plan-feature">📊 Click Logs</div><div className="plan-feature">Product + Price auto</div><div className="plan-feature">Image + Link + Secret ID</div></div>
                </div>
              </div>
              <div className="card" style={{ background: "#f8fafc", boxShadow: "none" }}><div className="card-title">💰 Payment</div><div style={{ display: "flex", gap: 10 }}><button className={`btn-pay${formWBM.payment === "paid" ? " paid" : ""}`} onClick={() => setFormWBM(f => ({ ...f, payment: "paid" }))}>✅ Paid</button><button className={`btn-pay${formWBM.payment === "pending" ? " pend" : ""}`} onClick={() => setFormWBM(f => ({ ...f, payment: "pending" }))}>⏳ Pending</button></div></div>
              <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}><button className="btn-g" onClick={() => goWBM("dashboard")}>Cancel</button><button className="btn-p" onClick={saveWBM} disabled={saving}>{saving ? "Saving..." : viewWBM === "add" ? "Add Website" : "Save"}</button></div>
            </div>
          )}

          {/* ══ WBM SCRIPT ══ */}
          {!isSchemaModule && !isLogsModule && viewWBM === "script" && selWBM && (
            <div className="card">
              <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12, flexWrap: "wrap" }}>
                {["script", "messages"].map(t => <button key={t} className={`tab-btn${tabWBM === t ? " active" : ""}`} onClick={() => setTabWBM(t)}>{t === "script" ? "📋 Script" : "💬 Messages"}</button>)}
              </div>
              {tabWBM === "script" && (<>
                {selWBM.payment === "pending" && <div className="alert-w">⚠️ Payment pending — script inactive.</div>}
                <div className="success-box">⚡ Real-time + 🌍 Geo + 📊 Click Logs — Har click automatically Supabase mein save hoga!</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div><div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{selWBM.enabled && selWBM.payment === "paid" ? "✅ Active" : "⛔ Inactive"} — {selWBM.plan === "pro" ? "🚀 Pro" : "🔵 Basic"}</div><div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Paste before &lt;/body&gt; — sirf ek baar!</div></div>
                  <button className="btn-p" style={copiedWBM ? { background: "#16a34a" } : {}} onClick={() => { navigator.clipboard.writeText(genWBMScript(selWBM)); setCopiedWBM(true); toast_("Copied! ✅"); setTimeout(() => setCopiedWBM(false), 2500); }}>{copiedWBM ? "✓ Copied!" : "📋 Copy"}</button>
                </div>
                <pre className="script-box">{genWBMScript(selWBM)}</pre>
              </>)}
              {tabWBM === "messages" && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", marginBottom: 8 }}>🔵 Basic:</div>
                  <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: 14, fontSize: 12, color: "#0369a1", fontFamily: "monospace", marginBottom: 16 }}>Assalam-o-Alaikum!{"\n\n"}I am interested in your products.{"\n\n"}Store: {selWBM.url}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#d97706", marginBottom: 8 }}>🚀 Pro — Product page:</div>
                  <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: 14, fontSize: 12, color: "#166534", fontFamily: "monospace" }}>Assalam-o-Alaikum, I want to order:{"\n\n"}*Product:* Name (auto){"\n"}*Price:* PKR 2000 (auto){"\n"}{selWBM.secretKey ? `*Secret ID:* ${selWBM.secretKey}\n` : ""}*Link:* {selWBM.url}/product</div>
                </div>
              )}
            </div>
          )}

          {/* ══ SCHEMA DASHBOARD ══ */}
          {isSchemaModule && viewSchema === "dashboard" && (<>
            <div className="stats-grid">{SCHEMA_STATS.map(s => <div key={s.lb} className="stat-card"><span style={{ fontSize: 22 }}>{s.ic}</span><span style={{ fontSize: 24, fontWeight: 800, color: s.cl, lineHeight: 1 }}>{s.val}</span><span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{s.lb}</span></div>)}</div>
            <div className="schema-info">🔖 <b>Schema Markup Manager</b> — Ek baar script paste → har page pe auto Schema apply!</div>
            {loadingSchema ? <div className="loading"><div className="spinner" style={{ borderTopColor: "#7c3aed" }} /></div> : (
              <div className="card">
                <div className="card-title">🔖 Schema Sites ({schemaSites.length})</div>
                {schemaSites.length === 0 ? <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 48, marginBottom: 14 }}>🔖</div><p style={{ color: "#94a3b8", marginBottom: 18 }}>Koi schema site nahi!</p><button className="btn-schema" onClick={openAddSchema}>+ Add</button></div> : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{schemaSites.map(site => <SiteCard key={site.id} site={{ ...site, installedAt: site.createdAt }} onScript={openScriptSchema} onEdit={openEditSchema} onDelete={s => setDelItem({ ...s, _type: "schema" })} onToggle={toggleSchema} onPlan={planSchema} onPayment={paymentSchema} onVerify={verifySchema} verifying={verifyingSchema} isSchema={true} />)}</div>}
              </div>
            )}
          </>)}

          {/* ══ SCHEMA ADD/EDIT ══ */}
          {isSchemaModule && (viewSchema === "add" || viewSchema === "edit") && (
            <div className="card">
              <div className="schema-info">🔖 Business info ek baar add karo — Google rich results ke liye!</div>
              <div className="form-grid" style={{ marginBottom: 4 }}>
                <div className="fg"><label className="lbl">Client Name *</label><input className="inp" placeholder="My Store" value={formSchema.name} onChange={e => setFormSchema(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Website URL *</label><input className="inp" placeholder="https://yoursite.com" value={formSchema.url} onChange={e => setFormSchema(f => ({ ...f, url: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Business Name</label><input className="inp" placeholder="ShopEase Deals PK" value={formSchema.businessName} onChange={e => setFormSchema(f => ({ ...f, businessName: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Business Type</label><select className="inp" value={formSchema.businessType} onChange={e => setFormSchema(f => ({ ...f, businessType: e.target.value }))}>{["Organization","LocalBusiness","Store","OnlineStore","ClothingStore","ElectronicsStore","Restaurant"].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="fg" style={{ gridColumn: "1/-1" }}><label className="lbl">Description</label><input className="inp" placeholder="Best online store..." value={formSchema.businessDesc} onChange={e => setFormSchema(f => ({ ...f, businessDesc: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Phone</label><input className="inp" placeholder="+92 300 1234567" value={formSchema.businessPhone} onChange={e => setFormSchema(f => ({ ...f, businessPhone: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Email</label><input className="inp" placeholder="info@store.com" value={formSchema.businessEmail} onChange={e => setFormSchema(f => ({ ...f, businessEmail: e.target.value }))} /></div>
                <div className="fg" style={{ gridColumn: "1/-1" }}><label className="lbl">Address</label><input className="inp" placeholder="Lahore, Pakistan" value={formSchema.businessAddress} onChange={e => setFormSchema(f => ({ ...f, businessAddress: e.target.value }))} /></div>
                <div className="fg" style={{ gridColumn: "1/-1" }}><label className="lbl">Logo URL</label><input className="inp" placeholder="https://site.com/logo.png" value={formSchema.businessLogo} onChange={e => setFormSchema(f => ({ ...f, businessLogo: e.target.value }))} /></div>
              </div>
              <div className="fg">
                <label className="lbl">Social Links</label>
                {formSchema.socialLinks.map((link, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}><input className="inp" style={{ flex: 1 }} value={link} onChange={e => { const a = [...formSchema.socialLinks]; a[i] = e.target.value; setFormSchema(f => ({ ...f, socialLinks: a })); }} /><button onClick={() => setFormSchema(f => ({ ...f, socialLinks: f.socialLinks.filter((_, j) => j !== i) }))} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "8px 11px", cursor: "pointer", fontWeight: 700 }}>✕</button></div>)}
                <div style={{ display: "flex", gap: 8 }}><input className="inp" style={{ flex: 1 }} placeholder="https://facebook.com/page" value={socialInput} onChange={e => setSocialInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && socialInput.trim()) { setFormSchema(f => ({ ...f, socialLinks: [...f.socialLinks, socialInput.trim()] })); setSocialInput(""); } }} /><button onClick={() => { if (socialInput.trim()) { setFormSchema(f => ({ ...f, socialLinks: [...f.socialLinks, socialInput.trim()] })); setSocialInput(""); } }} style={{ background: "#fdf4ff", border: "1px solid #e9d5ff", color: "#7c3aed", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>+ Add</button></div>
              </div>
              <div className="fg"><label className="lbl">SELECT PLAN *</label>
                <div className="plan-compare">
                  <div className={`plan-card basic${formSchema.plan === "basic" ? " selected" : ""}`} onClick={() => setFormSchema(f => ({ ...f, plan: "basic" }))}><div className="plan-card-title">🔵 Basic</div><div className="plan-price">PKR 499<span style={{ fontSize: 12 }}>/mo</span></div><div className="plan-feature">Organization Schema</div><div className="plan-feature">Article Schema</div><div className="plan-feature">BreadcrumbList</div><div className="plan-feature no">Product Schema nahi</div></div>
                  <div className={`plan-card pro${formSchema.plan === "pro" ? " selected" : ""}`} onClick={() => setFormSchema(f => ({ ...f, plan: "pro" }))}><div className="plan-card-title">🚀 Pro</div><div className="plan-price">PKR 999<span style={{ fontSize: 12 }}>/mo</span></div><div className="plan-feature">Sab Basic schemas</div><div className="plan-feature">Product Schema</div><div className="plan-feature">ItemList Schema</div><div className="plan-feature">Rich Google results</div></div>
                </div>
              </div>
              <div className="card" style={{ background: "#f8fafc", boxShadow: "none" }}><div className="card-title">💰 Payment</div><div style={{ display: "flex", gap: 10 }}><button className={`btn-pay${formSchema.payment === "paid" ? " paid" : ""}`} onClick={() => setFormSchema(f => ({ ...f, payment: "paid" }))}>✅ Paid</button><button className={`btn-pay${formSchema.payment === "pending" ? " pend" : ""}`} onClick={() => setFormSchema(f => ({ ...f, payment: "pending" }))}>⏳ Pending</button></div></div>
              <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}><button className="btn-g" onClick={() => goSchema("dashboard")}>Cancel</button><button className="btn-schema" onClick={saveSchema} disabled={saving}>{saving ? "Saving..." : viewSchema === "add" ? "Add Website" : "Save"}</button></div>
            </div>
          )}

          {/* ══ SCHEMA SCRIPT ══ */}
          {isSchemaModule && viewSchema === "script" && selSchema && (
            <div className="card">
              {selSchema.payment === "pending" && <div className="alert-w">⚠️ Payment pending — script inactive.</div>}
              <div className="schema-info">🔖 Schema Types: <span className="schema-type-badge">Organization</span><span className="schema-type-badge">WebSite</span><span className="schema-type-badge">Article</span><span className="schema-type-badge">BreadcrumbList</span>{selSchema.plan === "pro" && <><span className="schema-type-badge">Product ⭐</span><span className="schema-type-badge">ItemList ⭐</span></>}</div>
              <div className="success-box">✅ One-time paste → Har page auto! Naye posts bhi! Real-time control!</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div><div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{selSchema.enabled && selSchema.payment === "paid" ? "✅ Active" : "⛔ Inactive"} — {selSchema.plan === "pro" ? "🚀 Pro" : "🔵 Basic"}</div><div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Paste before &lt;/body&gt;</div></div>
                <button className="btn-schema" style={copiedSchema ? { background: "#6d28d9" } : {}} onClick={() => { navigator.clipboard.writeText(genSchemaScript(selSchema)); setCopiedSchema(true); toast_("Copied! ✅"); setTimeout(() => setCopiedSchema(false), 2500); }}>{copiedSchema ? "✓ Copied!" : "📋 Copy"}</button>
              </div>
              <pre className="script-box" style={{ color: "#c4b5fd" }}>{genSchemaScript(selSchema)}</pre>
              <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 8 }}>⚙️ Quick Controls</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className={`toggle-btn ${selSchema.enabled ? "on" : "off"}`} onClick={() => { toggleSchema(selSchema); setSelSchema(s => ({ ...s, enabled: !s.enabled })); }} />
                  <span style={{ fontWeight: 700, color: selSchema.enabled ? "#16a34a" : "#94a3b8", fontSize: 13 }}>{selSchema.enabled ? "✅ ON" : "⏸ OFF"}</span>
                  <button className={`plan-btn${selSchema.plan === "basic" ? " basic-active" : ""}`} onClick={() => planSchema(selSchema.id, "basic")}>🔵 Basic</button>
                  <button className={`plan-btn${selSchema.plan === "pro" ? " pro-active" : ""}`} onClick={() => planSchema(selSchema.id, "pro")}>🚀 Pro</button>
                  <button className={`btn-pay${selSchema.payment === "paid" ? " paid" : ""}`} onClick={() => paymentSchema(selSchema.id, "paid")}>✅ Paid</button>
                  <button className={`btn-pay${selSchema.payment === "pending" ? " pend" : ""}`} onClick={() => paymentSchema(selSchema.id, "pending")}>⏳ Pending</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ CLICK LOGS ══ */}
          {isLogsModule && (
            <>
              {/* Mini Stats */}
              <div className="mini-stats">
                <div className="mini-stat"><div className="mini-stat-val">{totalClicks}</div><div className="mini-stat-label">Total Clicks</div></div>
                <div className="mini-stat"><div className="mini-stat-val" style={{ color: "#16a34a" }}>{todayClicks}</div><div className="mini-stat-label">Today</div></div>
                <div className="mini-stat"><div className="mini-stat-val" style={{ color: "#7c3aed" }}>{uniqueSites}</div><div className="mini-stat-label">Sites</div></div>
                <div className="mini-stat"><div className="mini-stat-val" style={{ color: "#d97706" }}>{topCountries.length}</div><div className="mini-stat-label">Countries</div></div>
              </div>

              {/* Country Chart */}
              {topCountries.length > 0 && (
                <div className="card">
                  <div className="card-title">🌍 Top Countries</div>
                  {topCountries.map(([country, count]) => (
                    <div key={country} className="country-bar">
                      <div className="country-bar-label">{country}</div>
                      <div className="country-bar-track"><div className="country-bar-fill" style={{ width: `${(count / maxCountry) * 100}%` }} /></div>
                      <div className="country-bar-count">{count}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Filter by Site */}
              <div className="card">
                <div className="card-title">📊 Click Logs</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <button className={`plan-btn${logFilter === "all" ? " basic-active" : ""}`} onClick={() => setLogFilter("all")}>All Sites</button>
                  {sites.map(s => <button key={s.id} className={`plan-btn${logFilter === s.id ? " basic-active" : ""}`} onClick={() => setLogFilter(s.id)}>{s.name}</button>)}
                </div>
                {loadingLogs ? <div className="loading"><div className="spinner" style={{ borderTopColor: "#0891b2" }} /></div> : filteredLogs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>📊</div>
                    <p style={{ color: "#94a3b8" }}>Abhi tak koi click nahi — Script client ki site pe paste karo!</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Site</th>
                          <th>Country</th>
                          <th>Product</th>
                          <th>Plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log, i) => (
                          <tr key={i}>
                            <td style={{ whiteSpace: "nowrap", fontSize: 11 }}>{fmtDateTime(log.clicked_at)}</td>
                            <td><span className="log-site">{log.site_name || "—"}</span></td>
                            <td><span className="log-country">{log.country_name || "Unknown"}</span></td>
                            <td><div className="log-title" title={log.product_title}>{log.product_title || "—"}</div></td>
                            <td><span className={log.plan === "pro" ? "log-plan-pro" : "log-plan-basic"}>{log.plan === "pro" ? "🚀 Pro" : "🔵 Basic"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
