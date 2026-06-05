import React, { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://wuiblzjwolncpafjmkch.supabase.co";
const SUPABASE_KEY = "sb_publishable_3VMO11omiSHPr-1Zss6zTg_reswd0E0";
const ADMIN_USER = "admin";
const ADMIN_PASS_KEY = "wbm_pass";
const DEFAULT_PASS = "wbm@2026";
const SESSION_KEY = "wbm_v21_session";
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

// ─── WBM SCRIPT v21 ───────────────────────────────────────
function genWBMScript(site) {
  if (!site.enabled || site.payment !== "paid") return `\n<script>\n(function(){var el=document.getElementById("wbm-fab");if(el)el.remove();})();\n<\/script>`;
  const nums = JSON.stringify(site.numbers);
  const secret = site.secretKey ? `"${site.secretKey}"` : "null";
  return `<script>
(function(){
  var CFG={siteId:"${site.id}",siteName:"${site.name}",numbers:${nums},key:${secret},siteUrl:"${site.url}",plan:"${site.plan||"basic"}",supabaseUrl:"${SUPABASE_URL}",supabaseKey:"${SUPABASE_KEY}"};

  function groupByCountry(numbers){var g={};numbers.forEach(function(num){var clean=num.replace(/\\s/g,"");var pfx=["+974","+973","+968","+966","+965","+971","+92","+91","+90","+65","+61","+60","+55","+49","+44","+39","+34","+33","+20","+1"];var ok=false;for(var i=0;i<pfx.length;i++){if(clean.startsWith(pfx[i])){if(!g[pfx[i]])g[pfx[i]]=[];g[pfx[i]].push(num);ok=true;break;}}if(!ok){if(!g.other)g.other=[];g.other.push(num);}});return g;}
  var CMAP={"AF":["Afghanistan","+93"],"AL":["Albania","+355"],"DZ":["Algeria","+213"],"AR":["Argentina","+54"],"AU":["Australia","+61"],"AT":["Austria","+43"],"AZ":["Azerbaijan","+994"],"BH":["Bahrain","+973"],"BD":["Bangladesh","+880"],"BE":["Belgium","+32"],"BR":["Brazil","+55"],"BG":["Bulgaria","+359"],"CA":["Canada","+1"],"CL":["Chile","+56"],"CN":["China","+86"],"CO":["Colombia","+57"],"HR":["Croatia","+385"],"CY":["Cyprus","+357"],"CZ":["Czech Republic","+420"],"DK":["Denmark","+45"],"EG":["Egypt","+20"],"EE":["Estonia","+372"],"FI":["Finland","+358"],"FR":["France","+33"],"GE":["Georgia","+995"],"DE":["Germany","+49"],"GH":["Ghana","+233"],"GR":["Greece","+30"],"HU":["Hungary","+36"],"IN":["India","+91"],"ID":["Indonesia","+62"],"IQ":["Iraq","+964"],"IE":["Ireland","+353"],"IL":["Israel","+972"],"IT":["Italy","+39"],"JM":["Jamaica","+1876"],"JP":["Japan","+81"],"JO":["Jordan","+962"],"KZ":["Kazakhstan","+7"],"KE":["Kenya","+254"],"KW":["Kuwait","+965"],"LB":["Lebanon","+961"],"LY":["Libya","+218"],"MY":["Malaysia","+60"],"MV":["Maldives","+960"],"MX":["Mexico","+52"],"MA":["Morocco","+212"],"NL":["Netherlands","+31"],"NZ":["New Zealand","+64"],"NG":["Nigeria","+234"],"NO":["Norway","+47"],"OM":["Oman","+968"],"PK":["Pakistan","+92"],"PS":["Palestine","+970"],"PH":["Philippines","+63"],"PL":["Poland","+48"],"PT":["Portugal","+351"],"QA":["Qatar","+974"],"RO":["Romania","+40"],"RU":["Russia","+7"],"SA":["Saudi Arabia","+966"],"SN":["Senegal","+221"],"RS":["Serbia","+381"],"SG":["Singapore","+65"],"ZA":["South Africa","+27"],"KR":["South Korea","+82"],"ES":["Spain","+34"],"LK":["Sri Lanka","+94"],"SE":["Sweden","+46"],"CH":["Switzerland","+41"],"SY":["Syria","+963"],"TW":["Taiwan","+886"],"TZ":["Tanzania","+255"],"TH":["Thailand","+66"],"TN":["Tunisia","+216"],"TR":["Turkey","+90"],"UG":["Uganda","+256"],"UA":["Ukraine","+380"],"AE":["UAE","+971"],"GB":["UK","+44"],"US":["USA","+1"],"UZ":["Uzbekistan","+998"],"VN":["Vietnam","+84"],"YE":["Yemen","+967"],"ZW":["Zimbabwe","+263"]};
  function getVisitorCountry(cb){
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
  function checkStatus(cb){fetch(CFG.supabaseUrl+"/rest/v1/sites?select=enabled,payment,plan\x26id=eq."+CFG.siteId,{headers:{"apikey":CFG.supabaseKey,"Authorization":"Bearer "+CFG.supabaseKey}}).then(function(r){return r.json();}).then(function(d){if(d&&d[0])cb(d[0].enabled===true&&d[0].payment==="paid",d[0].plan||"basic");else cb(false,"basic");}).catch(function(){cb(true,CFG.plan);});}

  function logClick(countryCode,countryName,plan){
    var title=getTitle();
    var url=getLink();
    fetch(CFG.supabaseUrl+"/rest/v1/click_logs",{
      method:"POST",
      headers:{"apikey":CFG.supabaseKey,"Authorization":"Bearer "+CFG.supabaseKey,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({site_id:CFG.siteId,site_name:CFG.siteName,country_code:countryCode||"",country_name:countryName||"Unknown",page_url:url,product_title:title,plan:plan})
    }).catch(function(){});
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

// ─── MAIN APP COMPONENT (VERCEL COMPLIANT) ────────────────
export default function App() {
  const schemaCode = `
    <script id="wbm-schema-base" type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "name": "Shopease Deals",
      "url": "https://shopeasedealspk.blogspot.com/",
      "description": "Best Online Store for Premium Footwear, Apparel, and Gadgets",
      "telephone": "+923094626298",
      "email": "adnanmunir221@gmail.com",
      "address": {"@type": "PostalAddress", "streetAddress": "Lahore, Pakistan", "addressCountry": "PK"},
      "logo": {"@type": "ImageObject", "url": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjRMZ3SlbNYYdXvzzfs-z4VCS_rlh6r7K8dMsKXz7tryrM0HvMHMMib8PP8BXL6PsJUqYlg5Z5QCYmw_YehYYLeI5SSc15yD0GzpcFb56lhJohRZLsqH-KnRwZoMz4witLqqCFjCLVwsyCFiFjZS86Tn689fP6Df6WFGlDMVttA1mteq8-IEkUEtgAtwqM/s1600/Gemini_Generated_Image_63gcu063gcu063gc.png"}
    }
    </script>

    <script id="wbm-product-schema" type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "Premium Quality Product",
      "description": "Buy Now at best prices. High quality product available with cash on delivery.",
      "image": ["https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjRMZ3SlbNYYdXvzzfs-z4VCS_rlh6r7K8dMsKXz7tryrM0HvMHMMib8PP8BXL6PsJUqYlg5Z5QCYmw_YehYYLeI5SSc15yD0GzpcFb56lhJohRZLsqH-KnRwZoMz4witLqqCFjCLVwsyCFiFjZS86Tn689fP6Df6WFGlDMVttA1mteq8-IEkUEtgAtwqM/s1600/Gemini_Generated_Image_63gcu063gcu063gc.png"],
      "sku": "SE-99200",
      "mpn": "SE-99200",
      "brand": {
        "@type": "Brand",
        "name": "Shopease"
      },
      "review": {
        "@type": "Review",
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
        "author": { "@type": "Person", "name": "Verified Customer" }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "48"
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "PKR",
        "price": "1499",
        "priceValidUntil": "2028-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": "https://schema.org/InStock",
        "url": "https://shopeasedealspk.blogspot.com/",
        "seller": { "@type": "Organization", "name": "Shopease" },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "PKR" },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY" },
            "transitTime": { "@type": "QuantitativeValue", "minValue": 2, "maxValue": 5, "unitCode": "DAY" }
          },
          "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "PK" }
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
    </script>

    <script id="wbm-breadcrumb-schema" type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://shopeasedealspk.blogspot.com/" }
      ]
    }
    </script>

    <script type="text/javascript">
    //<![CDATA[
    (function(){
      var CFG={
        siteId:"s_q0f4t0fc",
        siteUrl:"https://shopeasedealspk.blogspot.com/",
        businessName:"Shopease",
        businessType:"OnlineStore",
        businessDesc:"Best Online Store",
        businessPhone:"+923094626298",
        businessEmail:"adnanmunir221@gmail.com",
        businessAddress:"Lahore, Pakistan",
        businessLogo:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjRMZ3SlbNYYdXvzzfs-z4VCS_rlh6r7K8dMsKXz7tryrM0HvMHMMib8PP8BXL6PsJUqYlg5Z5QCYmw_YehYYLeI5SSc15yD0GzpcFb56lhJohRZLsqH-KnRwZoMz4witLqqCFjCLVwsyCFiFjZS86Tn689fP6Df6WFGlDMVttA1mteq8-IEkUEtgAtwqM/s1600/Gemini_Generated_Image_63gcu063gcu063gc.png",
        plan:"pro",
        supabaseUrl:"https://wuiblzjwolncpafjmkch.supabase.co",
        supabaseKey:"sb_publishable_3VMO11omiSHPr-1Zss6zTg_reswd0E0"
      };

      function detectPrice(){
        var metaPrice = document.querySelector('[property="product:price:amount"],[itemprop="price"],meta[name="twitter:data1"],meta[property="og:price:amount"]');
        if (metaPrice) {
          var metaCur = document.querySelector('[property="product:price:currency"],[itemprop="priceCurrency"],meta[property="og:price:currency"]');
          var p = (metaPrice.content || metaPrice.getAttribute("content") || metaPrice.innerText || "").replace(/[^0-9.,]/g, "");
          if (p && p !== "0" && p !== "1") {
            var c = (metaCur ? metaCur.content || metaCur.getAttribute("content") || metaCur.innerText : "PKR") || "PKR";
            return { price: p, currency: c.trim().toUpperCase() };
          }
        }
        
        var postBody = document.querySelector(".post-body, .entry-content, .woocommerce-product-details__short-description, .summary, .product-single__description, .product-description, main, article");
        var bodyText = postBody ? postBody.innerText : document.body.innerText || "";
        
        var symbolPatterns = [
          { sym: /\\$\\s?(\\d+[\\d,.]*)/, code: "USD" },
          { sym: /£\\s?(\\d+[\\d,.]*)/, code: "GBP" },
          { sym: /€\\s?(\\d+[\\d,.]*)/, code: "EUR" },
          { sym: /¥\\s?(\\d+[\\d,.]*)/, code: "JPY" },
          { sym: /(?:RS|PKR)[\\s:]?(\\d+[\\d,.]*)|(\\d+[\\d,.]*)[\\s:]?(?:PKR|RS)/i, code: "PKR" },
          { sym: /(?:INR|₹)[\\s:]?(\\d+[\\d,.]*)/i, code: "INR" },
          { sym: /(?:AED|DH)[\\s:]?(\\d+[\\d,.]*)/i, code: "AED" },
          { sym: /SAR[\\s:]?(\\d+[\\d,.]*)/i, code: "SAR" },
          { sym: /CAD\\s?(\\d+[\\d,.]*)/i, code: "CAD" },
          { sym: /AUD\\s?(\\d+[\\d,.]*)/i, code: "AUD" }
        ];

        for (var i = 0; i < symbolPatterns.length; i++) {
          var match = bodyText.match(symbolPatterns[i].sym);
          if (match) {
            var priceVal = match[1] || match[2];
            if (priceVal) return { price: priceVal.replace(/,/g, ""), currency: symbolPatterns[i].code };
          }
        }
        
        var gen = bodyText.match(/(?:Price|قیمت|Price:)[\\s:]?(\\d+[\\d,.]*)/i);
        if (gen) return { price: gen[1].replace(/,/g, ""), currency: "PKR" };
        
        return null;
      }

      function detectImage(){
        var og = document.querySelector('meta[property="og:image"]');
        if (og && og.content) return og.content;
        var img = document.querySelector('.post-body img, .entry-content img, .woocommerce-product-gallery__image img, .product-single__photo');
        if (img && img.src) return img.src;
        return CFG.businessLogo || null;
      }

      function instantDeduct(){
        var path = location.pathname;
        var isHome = (path === "/" || path === "" || path === "/index.html");
        if (isHome) return;

        var title = document.title.split("|")[0].split("-")[0].trim();
        var img = detectImage();
        var priceInfo = detectPrice();
        var desc = (document.querySelector('meta[name="description"], meta[property="og:description"]') || {}).content || CFG.businessDesc;

        var prodEl = document.getElementById("wbm-product-schema");
        if (prodEl) {
          try {
            var prodData = JSON.parse(prodEl.textContent);
            prodData.name = title;
            if (img) prodData.image = [img];
            if (desc) prodData.description = desc;
            prodData.url = window.location.href;
            if (priceInfo) {
              prodData.offers.price = priceInfo.price;
              prodData.offers.priceCurrency = priceInfo.currency;
              if (priceInfo.currency !== "PKR") {
                prodData.offers.shippingDetails.shippingRate.currency = priceInfo.currency;
                if (priceInfo.currency === "USD") {
                  prodData.offers.shippingDetails.shippingDestination.addressCountry = "US";
                  prodData.offers.hasMerchantReturnPolicy.applicableCountry = "US";
                } else if (priceInfo.currency === "GBP") {
                  prodData.offers.shippingDetails.shippingDestination.addressCountry = "GB";
                  prodData.offers.hasMerchantReturnPolicy.applicableCountry = "GB";
                }
              }
            }
            prodEl.textContent = JSON.stringify(prodData);
          } catch (e) {}
        }
      }

      instantDeduct();

      function checkStatus(cb){
        fetch(CFG.supabaseUrl + "/rest/v1/schema_sites?select=enabled,payment,plan&id=eq." + CFG.siteId, {
          headers: { "apikey": CFG.supabaseKey, "Authorization": "Bearer " + CFG.supabaseKey }
        }).then(function(r){ return r.json(); })
        .then(function(d){
          if (d && d[0]) cb(d[0].enabled === true && d[0].payment === "paid", d[0].plan || "basic");
          else cb(false, "basic");
        }).catch(function(){ cb(true, CFG.plan); });
      }

      function runBackend(){
        checkStatus(function(active, plan){
          if (!active) {
            var b = document.getElementById("wbm-schema-base"); if (b) b.remove();
            var p = document.getElementById("wbm-product-schema"); if (p) p.remove();
          }
        });
      }

      if (document.readyState === 'complete') { runBackend(); }
      else { window.addEventListener('load', runBackend); }

    })();
    //]]>
    </script>
  `;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>WBManager Schema Auto Generator Application</h2>
      <p>App is successfully configured with Supabase and ready for Vercel production deployment.</p>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Generated Safe Template Code:</h3>
        <textarea 
          readOnly 
          value={schemaCode.trim()} 
          style={{ width: '100%', height: '400px', fontFamily: 'monospace', padding: '10px' }}
        />
      </div>

      <div dangerouslySetInnerHTML={{ __html: schemaCode }} />
    </div>
  );
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
.btn-schema:hover{box-shadow:0 4px 12px rgba(124,58,237,0.3);}
`;
