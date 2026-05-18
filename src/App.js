import React, { useState, useEffect } from "react";

const initialSites = [
  {
    id: "site_1",
    name: "My Online Store",
    url: "https://mystore.com",
    enabled: true,
    numbers: ["+92 300 1234567", "+92 321 9876543"],
    secretKey: "sk_live_abc123",
    installedAt: "2026-04-10T08:00:00Z",
    lastActive: "2026-05-17T14:32:00Z",
  },
  {
    id: "site_2",
    name: "Fashion Hub",
    url: "https://fashionhub.pk",
    enabled: false,
    numbers: ["+92 333 5556677"],
    secretKey: "",
    installedAt: "2026-03-22T10:00:00Z",
    lastActive: "2026-04-30T09:10:00Z",
  },
];

function generateId() {
  return "site_" + Math.random().toString(36).substr(2, 9);
}

function generateScript(site) {
  const nums = JSON.stringify(site.numbers);
  const secret = site.secretKey ? `"${site.secretKey}"` : "null";
  return `<!-- WhatsApp Button Manager | ${site.name} -->
<script>
(function(){
  var WBM = {
    siteId: "${site.id}",
    numbers: ${nums},
    secretKey: ${secret},
    siteUrl: "${site.url}",
    init: function() {
      var self = this;
      var style = document.createElement("style");
      style.textContent = [
        ".wbm-btn{display:inline-flex;align-items:center;gap:6px;background:#25D366;",
        "color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;",
        "font-weight:600;cursor:pointer;margin-top:8px;text-decoration:none;",
        "box-shadow:0 2px 8px rgba(37,211,102,.35);transition:all .2s;}",
        ".wbm-btn:hover{background:#1ebe5c;transform:translateY(-1px);}"
      ].join("");
      document.head.appendChild(style);
      self.scan();
      var obs = new MutationObserver(function(){ self.scan(); });
      obs.observe(document.body, {childList:true, subtree:true});
    },
    scan: function() {
      var selectors = [
        ".product", ".product-card", ".product-item",
        "[data-product]", ".shop-item", ".woocommerce-loop-product__link",
        "article.post", ".elementor-product-loop-item"
      ];
      var cards = document.querySelectorAll(selectors.join(","));
      cards.forEach(function(card) {
        if (card.querySelector(".wbm-btn")) return;
        var title = (card.querySelector("h1,h2,h3,h4,.product-title,.entry-title") || {}).innerText || document.title;
        var price = (card.querySelector(".price,.product-price,.amount,[data-price]") || {}).innerText || "";
        var img = (card.querySelector("img") || {}).src || "";
        var link = (card.querySelector("a") || {}).href || window.location.href;
        var number = self.numbers[Math.floor(Math.random() * self.numbers.length)];
        var msg = "Hello! I want to order:\\n" +
          "*Product:* " + title + "\\n" +
          (price ? "*Price:* " + price + "\\n" : "") +
          (img ? "*Image:* " + img + "\\n" : "") +
          "*Link:* " + link +
          (self.secretKey ? "\\n*Ref:* " + self.secretKey : "");
        var btn = document.createElement("a");
        btn.className = "wbm-btn";
        btn.href = "https://wa.me/" + number.replace(/[^0-9]/g,"") + "?text=" + encodeURIComponent(msg);
        btn.target = "_blank";
        btn.rel = "noopener";
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.533 5.853L0 24l6.305-1.508A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.371l-.36-.214-3.732.893.924-3.638-.234-.374A9.818 9.818 0 1112 21.818z"/></svg> Order on WhatsApp';
        card.appendChild(btn);
      });
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){ WBM.init(); });
  } else { WBM.init(); }
})();
</script>`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", {
    year: "numeric", month: "short", day: "numeric"
  });
}

function timeSince(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function App() {
  const [sites, setSites] = useState(initialSites);
  const [view, setView] = useState("dashboard"); // dashboard | add | edit | script
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: "", url: "", secretKey: "", numbers: [""] });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  function openAdd() {
    setForm({ name: "", url: "", secretKey: "", numbers: [""] });
    setView("add");
  }

  function openEdit(site) {
    setSelected(site);
    setForm({ name: site.name, url: site.url, secretKey: site.secretKey, numbers: [...site.numbers] });
    setView("edit");
  }

  function openScript(site) {
    setSelected(site);
    setCopied(false);
    setView("script");
  }

  function handleSave() {
    const nums = form.numbers.filter(n => n.trim());
    if (!form.name.trim() || !form.url.trim() || nums.length === 0) {
      showToast("Please fill all required fields", "error");
      return;
    }
    if (view === "add") {
      const newSite = {
        id: generateId(),
        name: form.name.trim(),
        url: form.url.trim(),
        enabled: true,
        numbers: nums,
        secretKey: form.secretKey.trim(),
        installedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      setSites(prev => [newSite, ...prev]);
      showToast("Website added successfully!");
    } else {
      setSites(prev => prev.map(s => s.id === selected.id
        ? { ...s, name: form.name.trim(), url: form.url.trim(), secretKey: form.secretKey.trim(), numbers: nums }
        : s
      ));
      showToast("Website updated!");
    }
    setView("dashboard");
  }

  function toggleSite(id) {
    setSites(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }

  function deleteSite(id) {
    setSites(prev => prev.filter(s => s.id !== id));
    setDeleteConfirm(null);
    showToast("Website removed", "error");
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showToast("Script copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function addNumberField() {
    setForm(f => ({ ...f, numbers: [...f.numbers, ""] }));
  }

  function updateNumber(i, val) {
    setForm(f => {
      const nums = [...f.numbers];
      nums[i] = val;
      return { ...f, numbers: nums };
    });
  }

  function removeNumber(i) {
    setForm(f => ({ ...f, numbers: f.numbers.filter((_, idx) => idx !== i) }));
  }

  const script = selected ? generateScript(selected) : "";

  return (
    <div style={styles.root}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "error" ? "#ef4444" : "#22c55e" }}>
          {toast.type === "error" ? "✕ " : "✓ "}{toast.msg}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalIcon}>🗑️</div>
            <h3 style={styles.modalTitle}>Delete Website?</h3>
            <p style={styles.modalText}>This will permanently remove <strong>{deleteConfirm.name}</strong> and its embed script.</p>
            <div style={styles.modalActions}>
              <button style={styles.btnGhost} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={styles.btnDanger} onClick={() => deleteSite(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>💬</span>
          <span style={styles.logoText}>WBManager</span>
        </div>
        <nav style={styles.nav}>
          {[
            { icon: "⊞", label: "Dashboard", key: "dashboard" },
            { icon: "＋", label: "Add Website", key: "add" },
          ].map(item => (
            <button
              key={item.key}
              style={{ ...styles.navBtn, ...(view === item.key || (item.key === "add" && view === "add") ? styles.navBtnActive : {}) }}
              onClick={() => item.key === "add" ? openAdd() : setView(item.key)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <div style={styles.planBadge}>Free Plan · {sites.length}/5 sites</div>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>
              {view === "dashboard" && "My Websites"}
              {view === "add" && "Add New Website"}
              {view === "edit" && "Edit Website"}
              {view === "script" && "Embed Script"}
            </h1>
            <p style={styles.pageSubtitle}>
              {view === "dashboard" && `${sites.filter(s => s.enabled).length} active integrations`}
              {view === "add" && "Connect a new website to WhatsApp"}
              {view === "edit" && selected?.name}
              {view === "script" && selected?.url}
            </p>
          </div>
          {view === "dashboard" && (
            <button style={styles.btnPrimary} onClick={openAdd}>+ Add Website</button>
          )}
          {(view === "add" || view === "edit" || view === "script") && (
            <button style={styles.btnGhost} onClick={() => setView("dashboard")}>← Back</button>
          )}
        </header>

        {/* Dashboard */}
        {view === "dashboard" && (
          <div style={styles.content}>
            {/* Stats */}
            <div style={styles.statsRow}>
              {[
                { label: "Total Sites", value: sites.length, icon: "🌐" },
                { label: "Active", value: sites.filter(s => s.enabled).length, icon: "✅" },
                { label: "Inactive", value: sites.filter(s => !s.enabled).length, icon: "⏸️" },
                { label: "WA Numbers", value: sites.reduce((a, s) => a + s.numbers.length, 0), icon: "📱" },
              ].map(stat => (
                <div key={stat.label} style={styles.statCard}>
                  <span style={styles.statIcon}>{stat.icon}</span>
                  <span style={styles.statValue}>{stat.value}</span>
                  <span style={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Table */}
            {sites.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>🌐</div>
                <h3 style={styles.emptyTitle}>No websites yet</h3>
                <p style={styles.emptyText}>Add your first website to get started</p>
                <button style={styles.btnPrimary} onClick={openAdd}>+ Add Website</button>
              </div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["Website", "Numbers", "Status", "Installed", "Last Active", "Actions"].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site, idx) => (
                      <tr key={site.id} style={{ ...styles.tr, animationDelay: `${idx * 60}ms` }}>
                        <td style={styles.td}>
                          <div style={styles.siteName}>{site.name}</div>
                          <div style={styles.siteUrl}>{site.url}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.numbers}>
                            {site.numbers.map(n => (
                              <span key={n} style={styles.numberTag}>{n}</span>
                            ))}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...(site.enabled ? styles.badgeActive : styles.badgeInactive) }}>
                            {site.enabled ? "● Active" : "● Inactive"}
                          </span>
                        </td>
                        <td style={styles.td}><span style={styles.dateText}>{formatDate(site.installedAt)}</span></td>
                        <td style={styles.td}><span style={styles.dateText}>{timeSince(site.lastActive)}</span></td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button style={styles.actionBtn} title="Get Script" onClick={() => openScript(site)}>📋</button>
                            <button style={styles.actionBtn} title="Edit" onClick={() => openEdit(site)}>✏️</button>
                            <button
                              style={{ ...styles.actionBtn, ...styles.toggleBtn, background: site.enabled ? "#fef3c7" : "#dcfce7" }}
                              title={site.enabled ? "Disable" : "Enable"}
                              onClick={() => toggleSite(site.id)}
                            >
                              {site.enabled ? "⏸" : "▶"}
                            </button>
                            <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} title="Delete" onClick={() => setDeleteConfirm(site)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Add / Edit Form */}
        {(view === "add" || view === "edit") && (
          <div style={styles.content}>
            <div style={styles.formCard}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Website Name *</label>
                  <input
                    style={styles.input}
                    placeholder="e.g. My Online Store"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Website URL *</label>
                  <input
                    style={styles.input}
                    placeholder="https://yoursite.com"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: "1/-1" }}>
                  <label style={styles.label}>Secret Key (optional)</label>
                  <input
                    style={styles.input}
                    placeholder="sk_live_... (for order tracking)"
                    value={form.secretKey}
                    onChange={e => setForm(f => ({ ...f, secretKey: e.target.value }))}
                  />
                  <span style={styles.hint}>Included in WhatsApp messages for order verification</span>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>WhatsApp Numbers *</label>
                <div style={styles.numbersForm}>
                  {form.numbers.map((num, i) => (
                    <div key={i} style={styles.numberRow}>
                      <span style={styles.waIcon}>📱</span>
                      <input
                        style={{ ...styles.input, flex: 1, margin: 0 }}
                        placeholder="+92 300 1234567"
                        value={num}
                        onChange={e => updateNumber(i, e.target.value)}
                      />
                      {form.numbers.length > 1 && (
                        <button style={styles.removeBtn} onClick={() => removeNumber(i)}>✕</button>
                      )}
                    </div>
                  ))}
                  <button style={styles.addNumBtn} onClick={addNumberField}>+ Add Another Number</button>
                </div>
              </div>

              <div style={styles.formActions}>
                <button style={styles.btnGhost} onClick={() => setView("dashboard")}>Cancel</button>
                <button style={styles.btnPrimary} onClick={handleSave}>
                  {view === "add" ? "Add Website" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Script View */}
        {view === "script" && selected && (
          <div style={styles.content}>
            <div style={styles.scriptCard}>
              <div style={styles.scriptHeader}>
                <div>
                  <h3 style={styles.scriptTitle}>Your Embed Script</h3>
                  <p style={styles.scriptSub}>Paste this before the <code style={styles.code}>&lt;/body&gt;</code> tag on your website</p>
                </div>
                <button style={{ ...styles.btnPrimary, ...(copied ? styles.btnCopied : {}) }} onClick={() => handleCopy(script)}>
                  {copied ? "✓ Copied!" : "📋 Copy Script"}
                </button>
              </div>
              <pre style={styles.scriptBox}>{script}</pre>

              <div style={styles.infoGrid}>
                <div style={styles.infoCard}>
                  <span style={styles.infoIcon}>🔍</span>
                  <div>
                    <div style={styles.infoTitle}>Auto Detection</div>
                    <div style={styles.infoDesc}>Scans product cards, WooCommerce items, and blog posts automatically</div>
                  </div>
                </div>
                <div style={styles.infoCard}>
                  <span style={styles.infoIcon}>📨</span>
                  <div>
                    <div style={styles.infoTitle}>Rich Messages</div>
                    <div style={styles.infoDesc}>Sends product title, price, image & link to WhatsApp</div>
                  </div>
                </div>
                <div style={styles.infoCard}>
                  <span style={styles.infoIcon}>🔄</span>
                  <div>
                    <div style={styles.infoTitle}>Live Updates</div>
                    <div style={styles.infoDesc}>MutationObserver watches for dynamically loaded products</div>
                  </div>
                </div>
                <div style={styles.infoCard}>
                  <span style={styles.infoIcon}>⚖️</span>
                  <div>
                    <div style={styles.infoTitle}>Load Balancing</div>
                    <div style={styles.infoDesc}>Rotates between {selected.numbers.length} WhatsApp number{selected.numbers.length > 1 ? "s" : ""} automatically</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  root: {
    display: "flex", minHeight: "100vh",
    background: "#0f1117",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: "#e2e8f0",
  },
  toast: {
    position: "fixed", top: 20, right: 20, zIndex: 9999,
    padding: "12px 20px", borderRadius: 10, color: "#fff",
    fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,.4)",
    animation: "fadeIn .3s ease",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
    zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: "#1a1f2e", borderRadius: 16, padding: 32, maxWidth: 380, width: "90%",
    border: "1px solid #2d3748", textAlign: "center",
  },
  modalIcon: { fontSize: 40, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#f1f5f9" },
  modalText: { fontSize: 14, color: "#94a3b8", marginBottom: 24 },
  modalActions: { display: "flex", gap: 12, justifyContent: "center" },

  sidebar: {
    width: 220, background: "#0d1117", borderRight: "1px solid #1e2533",
    display: "flex", flexDirection: "column", padding: "0 0 20px",
    position: "sticky", top: 0, height: "100vh",
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "24px 20px 20px", borderBottom: "1px solid #1e2533",
  },
  logoIcon: { fontSize: 26 },
  logoText: { fontWeight: 800, fontSize: 17, color: "#f1f5f9", letterSpacing: "-.3px" },
  nav: { flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 4 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
    borderRadius: 8, border: "none", background: "transparent",
    color: "#64748b", cursor: "pointer", fontSize: 14, fontWeight: 500,
    textAlign: "left", transition: "all .15s",
  },
  navBtnActive: { background: "#1a2035", color: "#25D366", fontWeight: 600 },
  navIcon: { fontSize: 16, width: 20, textAlign: "center" },
  sidebarFooter: { padding: "0 14px" },
  planBadge: {
    background: "#1a2035", color: "#64748b", fontSize: 12,
    padding: "8px 12px", borderRadius: 8, textAlign: "center",
    border: "1px solid #2d3748",
  },

  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "auto" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "28px 32px 0", borderBottom: "1px solid #1e2533", paddingBottom: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 },
  pageSubtitle: { fontSize: 13, color: "#64748b", marginTop: 3 },
  content: { padding: "28px 32px", flex: 1 },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 },
  statCard: {
    background: "#151b27", border: "1px solid #1e2d3d", borderRadius: 12,
    padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: 500 },

  tableWrap: { background: "#151b27", border: "1px solid #1e2533", borderRadius: 14, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "13px 16px", textAlign: "left", fontSize: 11,
    fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".6px",
    background: "#0f1520", borderBottom: "1px solid #1e2533",
  },
  tr: { borderBottom: "1px solid #1a2035", transition: "background .15s" },
  td: { padding: "14px 16px", verticalAlign: "middle", fontSize: 14 },
  siteName: { fontWeight: 600, color: "#e2e8f0", fontSize: 14 },
  siteUrl: { fontSize: 12, color: "#64748b", marginTop: 2 },
  numbers: { display: "flex", flexWrap: "wrap", gap: 4 },
  numberTag: {
    background: "#0d2210", color: "#25D366", fontSize: 11,
    padding: "3px 8px", borderRadius: 20, fontWeight: 600, border: "1px solid #1a3d20",
  },
  badge: {
    fontSize: 12, fontWeight: 700, padding: "4px 10px",
    borderRadius: 20, display: "inline-block",
  },
  badgeActive: { background: "#0d2210", color: "#22c55e", border: "1px solid #166534" },
  badgeInactive: { background: "#1c1c1c", color: "#64748b", border: "1px solid #2d3748" },
  dateText: { color: "#64748b", fontSize: 13 },
  actions: { display: "flex", gap: 6, alignItems: "center" },
  actionBtn: {
    background: "#1e2533", border: "1px solid #2d3748", borderRadius: 7,
    padding: "6px 9px", cursor: "pointer", fontSize: 15, transition: "all .15s",
  },
  toggleBtn: {},
  deleteBtn: { background: "#2a1515", border: "1px solid #4a1515" },

  empty: {
    textAlign: "center", padding: "80px 20px",
    background: "#151b27", border: "1px solid #1e2533", borderRadius: 14,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#64748b", marginBottom: 24 },

  formCard: {
    background: "#151b27", border: "1px solid #1e2533",
    borderRadius: 16, padding: 32, maxWidth: 700,
  },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#94a3b8" },
  input: {
    background: "#0f1520", border: "1px solid #2d3748", borderRadius: 9,
    padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none",
    transition: "border .15s",
  },
  hint: { fontSize: 11, color: "#475569" },
  numbersForm: { display: "flex", flexDirection: "column", gap: 10 },
  numberRow: { display: "flex", alignItems: "center", gap: 10 },
  waIcon: { fontSize: 20 },
  removeBtn: {
    background: "#2a1515", border: "1px solid #4a1515", color: "#ef4444",
    borderRadius: 7, padding: "8px 12px", cursor: "pointer", fontSize: 14, fontWeight: 700,
  },
  addNumBtn: {
    background: "transparent", border: "2px dashed #2d3748", color: "#64748b",
    borderRadius: 9, padding: "10px", cursor: "pointer", fontSize: 13,
    fontWeight: 600, transition: "all .15s", textAlign: "center",
  },
  formActions: { display: "flex", gap: 12, marginTop: 28, justifyContent: "flex-end" },

  scriptCard: {
    background: "#151b27", border: "1px solid #1e2533", borderRadius: 16, padding: 32,
  },
  scriptHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 16 },
  scriptTitle: { fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0, marginBottom: 6 },
  scriptSub: { fontSize: 13, color: "#64748b" },
  scriptBox: {
    background: "#0a0e17", border: "1px solid #1e2533", borderRadius: 10,
    padding: 20, overflow: "auto", fontSize: 12, color: "#7dd3fc",
    lineHeight: 1.7, fontFamily: "'Fira Code', monospace", maxHeight: 380,
    whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
  code: {
    background: "#1e2533", color: "#f59e0b", padding: "2px 6px",
    borderRadius: 4, fontFamily: "monospace", fontSize: 12,
  },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 24 },
  infoCard: {
    background: "#0f1520", border: "1px solid #1e2533", borderRadius: 10,
    padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12,
  },
  infoIcon: { fontSize: 22, flexShrink: 0 },
  infoTitle: { fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 3 },
  infoDesc: { fontSize: 12, color: "#64748b", lineHeight: 1.5 },

  btnPrimary: {
    background: "#25D366", color: "#fff", border: "none", borderRadius: 9,
    padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
    transition: "all .15s", whiteSpace: "nowrap",
  },
  btnCopied: { background: "#22c55e" },
  btnGhost: {
    background: "transparent", color: "#94a3b8", border: "1px solid #2d3748",
    borderRadius: 9, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
  btnDanger: {
    background: "#ef4444", color: "#fff", border: "none",
    borderRadius: 9, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
};
