// ===== SVG Icon Definitions =====
const ICONS = {
  terminal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m226-559 78 78q12 12 12 28.5T304-424q-12 12-28.5 12T247-424L141-530q-12-12-12-28.5t12-28.5l106-106q12-12 28.5-12t28.5 12q12 12 12 28.5T304-636l-78 77Zm254 239q-17 0-28.5-11.5T440-360q0-17 11.5-28.5T480-400h280q17 0 28.5 11.5T800-360q0 17-11.5 28.5T760-320H480Z"/></svg>`,
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M520-600v-240h320v240H520ZM120-440v-400h320v400H120Zm400 320v-400h320v400H520Zm-400 0v-240h320v240H120Z"/></svg>`,
  layers: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-118q-12 0-23-3.5T436-131L140-282q-15-8-22.5-22t-7.5-30q0-16 7.5-30t22.5-22l72-38-72-38q-15-8-22.5-22t-7.5-30q0-16 7.5-30t22.5-22l296-151q10-6 21-9t23-3q12 0 23 3t21 9l296 151q15 8 22.5 22t7.5 30q0 16-7.5 30T817-462l-72 38 72 38q15 8 22.5 22t7.5 30q0 16-7.5 30T817-282L521-131q-10 6-21 9.5t-20 3.5Z"/></svg>`,
  dns: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M160-760v240h640v-240H160Zm0 560h640v-240H160v240ZM80-200q0 33 23.5 56.5T160-120h640q33 0 56.5-23.5T880-200v-240q0-33-23.5-56.5T800-520H160q-33 0-56.5 23.5T80-440v240Zm0-400q0 33 23.5 56.5T160-520h640q33 0 56.5-23.5T880-600v-240q0-33-23.5-56.5T800-920H160q-33 0-56.5-23.5T80-840v240Zm120 440q25 0 42.5-17.5T260-220q0-25-17.5-42.5T200-280q-25 0-42.5 17.5T140-220q0 25 17.5 42.5T200-160Zm0-400q25 0 42.5-17.5T260-620q0-25-17.5-42.5T200-680q-25 0-42.5 17.5T140-620q0 25 17.5 42.5T200-560Z"/></svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m388-80-20-126q-19-7-40-19t-37-25l-118 54-93-164 108-79q-2-10-3-19.5t-1-20.5q0-11 1-20.5t3-19.5L80-598l93-164 118 54q16-13 37-25t40-18l20-129h184l20 126q19 7 40 18.5t37 25.5l118-54 93 164-108 77q2 10 3 20t1 21q0 10-1 20t-3 20l108 78-93 164-118-54q-16 13-36.5 25.5T572-206L552-80H388Zm92-270q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0 54 38 92t92 38Z"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>`,
  add: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>`,
  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Z"/></svg>`,
  storage: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-120q-151 0-255.5-46.5T120-280v-400q0-66 105.5-113T480-840q149 0 254.5 47T840-680v400q0 67-104.5 113.5T480-120Z"/></svg>`,
  group: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z"/></svg>`,
  mail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200Z"/></svg>`,
  more_vert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>`,
  add_circle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>`,
  update: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M480-120q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-480q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-840q82 0 155.5 35T760-706v-94h80v240H600v-80h110q-41-56-101-88t-129-32q-117 0-198.5 81.5T200-480q0 117 81.5 198.5T480-200q105 0 183.5-68T756-440h82q-15 137-117.5 228.5T480-120Z"/></svg>`,
  person_add: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M720-400v-120H600v-80h120v-120h80v120h120v80H800v120h-80Zm-360-80q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Z"/></svg>`,
  rocket_launch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M226-346q-17-52-25.5-106T192-560q0-155 72.5-292T480-960q143 71 215.5 208T768-460q0 54-8.5 108T734-246l-62-62q12-40 18-82t6-70q0-130-57.5-247.5T480-860Q375-766 317.5-648.5T260-460q0 28 6 70t18 82l-58 62ZM480-200q-51 0-96.5-17.5T300-266l44-44q26 20 60 31t76 11q42 0 76-11t60-31l44 44q-38 31-83.5 48.5T480-200Zm0-200q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Z"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Z"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`,
};

// ===== Sample Data =====
const WORKSPACES = [
  { id: "backend-production", name: "Backend Production", abbr: "BP", color: "indigo", status: "online", statusText: "Çevrimiçi", metric: "CPU Kullanımı", usage: 64, members: 11, avatarColors: ["#a5b4fc", "#86efac", "#fbbf24"] },
  { id: "staging-env", name: "Staging Env", abbr: "ST", color: "amber", status: "online", statusText: "Çevrimiçi", metric: "Depolama Kullanımı", usage: 28, members: 3, avatarColors: ["#c4b5fd"] },
  { id: "mobile-api", name: "Mobile API", abbr: "MA", color: "rose", status: "pending", statusText: "Beklemede", metric: "CPU Kullanımı", usage: 92, members: 6, avatarColors: ["#fca5a5", "#93c5fd"] },
];

const SERVERS = [
  { id: 1, name: "Sunucu #1 — EU West", ip: "185.32.110.12", status: "Çevrimiçi", cpu: "24%", ram: "4.2 GB / 16 GB", uptime: "42 gün" },
  { id: 2, name: "Sunucu #2 — US East", ip: "104.21.55.78", status: "Çevrimiçi", cpu: "51%", ram: "11.3 GB / 32 GB", uptime: "18 gün" },
  { id: 3, name: "Sunucu #3 — Asia", ip: "45.77.200.15", status: "Çevrimdışı", cpu: "—", ram: "— / 8 GB", uptime: "—" },
  { id: 4, name: "Sunucu #4 — EU Central", ip: "162.55.44.99", status: "Çevrimiçi", cpu: "78%", ram: "6.1 GB / 8 GB", uptime: "7 gün" },
];

// ===== Helpers =====
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===== Auth Helpers =====
function getAuthToken() {
  return sessionStorage.getItem("taskey_token") || localStorage.getItem("taskey_token");
}

function getAuthUser() {
  const raw = sessionStorage.getItem("taskey_user") || localStorage.getItem("taskey_user");
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function clearAuth() {
  sessionStorage.removeItem("taskey_token");
  sessionStorage.removeItem("taskey_user");
  localStorage.removeItem("taskey_token");
  localStorage.removeItem("taskey_user");
}

async function logout() {
  const token = getAuthToken();
  try {
    await fetch("/api/logout", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });
  } catch { /* ignore */ }
  clearAuth();
  window.location.replace("/login.html");
}

function getFormattedDate() {
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const iconSpan = document.createElement("span");
  iconSpan.className = "icon";
  iconSpan.innerHTML = ICONS.check;
  const textNode = document.createTextNode(" " + message);
  toast.appendChild(iconSpan);
  toast.appendChild(textNode);
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
}

function navigateTo(pageName) {
  // Hide all pages
  document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
  // Show target page
  const target = document.getElementById(`page-${pageName}`);
  if (target) target.classList.remove("hidden");
  // Update sidebar active
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  const navItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  if (navItem) navItem.classList.add("active");
  // Render page-specific content
  if (pageName === "workspaces") renderAllWorkspaces();
  if (pageName === "servers") renderServers();
  if (pageName === "dashboard") renderDashboardWorkspaces();
  // Re-inject icons
  injectIcons();
  animateProgressBars();
}

function injectIcons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.getAttribute("data-icon");
    if (ICONS[name]) el.innerHTML = ICONS[name];
  });
}

function animateProgressBars() {
  document.querySelectorAll(".progress-fill").forEach((bar) => {
    const width = bar.style.width;
    bar.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = width;
      });
    });
  });
}

// ===== Workspace Card Renderer =====
function renderWorkspaceCard(ws, showAdd) {
  const extraCount = Math.max(0, ws.members - ws.avatarColors.length);
  const usageClass = ws.usage >= 80 ? "danger" : "primary";
  return `
    <div class="workspace-card" data-workspace-id="${escapeHtml(ws.id)}">
      <div class="workspace-card-header">
        <div class="workspace-info">
          <div class="workspace-avatar ${escapeHtml(ws.color)}">${escapeHtml(ws.abbr)}</div>
          <div>
            <h4 class="workspace-name">${escapeHtml(ws.name)}</h4>
            <div class="workspace-status">
              <span class="status-dot ${escapeHtml(ws.status)}"></span>
              <span class="status-text">${escapeHtml(ws.statusText)}</span>
            </div>
          </div>
        </div>
        <button class="more-btn" data-ws-menu="${escapeHtml(ws.id)}" aria-label="Daha fazla seçenek">
          <span class="icon" data-icon="more_vert"></span>
        </button>
      </div>
      <div class="progress-section">
        <div class="progress-label">
          <span class="label">${escapeHtml(ws.metric)}</span>
          <span class="value">${escapeHtml(String(ws.usage))}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${usageClass}" style="width: ${ws.usage}%"></div>
        </div>
      </div>
      <div class="workspace-footer">
        <div class="team-avatars">
          ${ws.avatarColors.map((c, i) => `<div class="avatar" style="background-color: ${escapeHtml(c)};${i === 0 ? ' margin-left: 0;' : ''}"></div>`).join("")}
          ${extraCount > 0 ? `<div class="avatar-count">+${extraCount}</div>` : ""}
        </div>
        <button class="btn-invite" data-invite="${escapeHtml(ws.name)}">Davet Et</button>
      </div>
    </div>
  `;
}

function renderDashboardWorkspaces() {
  const grid = document.getElementById("dashboard-workspaces");
  if (!grid) return;
  grid.innerHTML = WORKSPACES.map((ws) => renderWorkspaceCard(ws)).join("") + `
    <div class="workspace-add" id="add-workspace-card">
      <span class="icon" data-icon="add_circle"></span>
      <span>Yeni Çalışma Alanı Ekle</span>
    </div>
  `;
  bindWorkspaceEvents(grid);
}

function renderAllWorkspaces() {
  const grid = document.getElementById("all-workspaces-grid");
  if (!grid) return;
  grid.innerHTML = WORKSPACES.map((ws) => renderWorkspaceCard(ws)).join("") + `
    <div class="workspace-add" id="add-workspace-card-2">
      <span class="icon" data-icon="add_circle"></span>
      <span>Yeni Çalışma Alanı Ekle</span>
    </div>
  `;
  bindWorkspaceEvents(grid);
}

function renderServers() {
  const grid = document.getElementById("servers-grid");
  if (!grid) return;
  grid.innerHTML = SERVERS.map((s) => `
    <div class="server-card">
      <div class="server-card-header">
        <h4>${escapeHtml(s.name)}</h4>
        <div class="workspace-status">
          <span class="status-dot ${s.status === 'Çevrimiçi' ? 'online' : 'offline'}"></span>
          <span class="status-text">${escapeHtml(s.status)}</span>
        </div>
      </div>
      <div class="server-meta">
        <div class="server-meta-row"><span class="label">IP Adresi</span><span class="value">${escapeHtml(s.ip)}</span></div>
        <div class="server-meta-row"><span class="label">CPU</span><span class="value">${escapeHtml(s.cpu)}</span></div>
        <div class="server-meta-row"><span class="label">RAM</span><span class="value">${escapeHtml(s.ram)}</span></div>
        <div class="server-meta-row"><span class="label">Çalışma Süresi</span><span class="value">${escapeHtml(s.uptime)}</span></div>
      </div>
    </div>
  `).join("");
}

// ===== Context Menu =====
let contextTarget = null;

function showContextMenu(x, y, wsId) {
  const menu = document.getElementById("context-menu");
  contextTarget = wsId;
  menu.classList.remove("hidden");
  // Position
  const menuW = 200;
  const menuH = 150;
  const finalX = (x + menuW > window.innerWidth) ? x - menuW : x;
  const finalY = (y + menuH > window.innerHeight) ? y - menuH : y;
  menu.style.left = finalX + "px";
  menu.style.top = finalY + "px";
  injectIcons();
}

function hideContextMenu() {
  const menu = document.getElementById("context-menu");
  menu.classList.add("hidden");
  contextTarget = null;
}

// ===== Workspace Detail Modal =====
function showWorkspaceDetail(wsId) {
  const ws = WORKSPACES.find((w) => w.id === wsId);
  if (!ws) return;
  document.getElementById("detail-modal-title").textContent = ws.name;
  document.getElementById("detail-modal-body").innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Durum</div>
        <div class="detail-value">${escapeHtml(ws.statusText)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Üye Sayısı</div>
        <div class="detail-value">${escapeHtml(String(ws.members))} kişi</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">${escapeHtml(ws.metric)}</div>
        <div class="detail-value">${escapeHtml(String(ws.usage))}%</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Kısa Ad</div>
        <div class="detail-value">${escapeHtml(ws.abbr)}</div>
      </div>
      ${ws.server ? `<div class="detail-item">
        <div class="detail-label">Sunucu</div>
        <div class="detail-value">${escapeHtml(ws.server)}</div>
      </div>` : ""}
      ${ws.description ? `<div class="detail-item">
        <div class="detail-label">Açıklama</div>
        <div class="detail-value">${escapeHtml(ws.description)}</div>
      </div>` : ""}
    </div>
    <div style="margin-top: 20px;">
      <div class="progress-label">
        <span class="label">${escapeHtml(ws.metric)}</span>
        <span class="value">${escapeHtml(String(ws.usage))}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${ws.usage >= 80 ? 'danger' : 'primary'}" style="width: ${ws.usage}%"></div>
      </div>
    </div>
  `;
  // Wire delete button
  document.getElementById("detail-delete-btn").onclick = () => {
    closeModal("modal-workspace-detail");
    confirmAction(`"${ws.name}" çalışma alanını silmek istediğinize emin misiniz?`, () => {
      const idx = WORKSPACES.findIndex((w) => w.id === wsId);
      if (idx > -1) WORKSPACES.splice(idx, 1);
      showToast(`"${ws.name}" silindi`, "info");
      renderDashboardWorkspaces();
      renderAllWorkspaces();
      injectIcons();
      animateProgressBars();
    });
  };
  openModal("modal-workspace-detail");
  injectIcons();
  animateProgressBars();
}

// ===== Confirm Modal =====
let confirmCallback = null;
function confirmAction(message, onConfirm) {
  document.getElementById("confirm-message").textContent = message;
  confirmCallback = onConfirm;
  openModal("modal-confirm");
}

// ===== Bind Workspace Events =====
function bindWorkspaceEvents(container) {
  // More button (3-dot) → context menu
  container.querySelectorAll("[data-ws-menu]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = btn.getBoundingClientRect();
      showContextMenu(rect.right, rect.bottom, btn.getAttribute("data-ws-menu"));
    });
  });
  // Invite buttons
  container.querySelectorAll("[data-invite]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wsName = btn.getAttribute("data-invite");
      document.getElementById("invite-modal-title").textContent = `"${wsName}" — Üye Davet Et`;
      openModal("modal-invite");
    });
  });
  // Workspace card click → detail
  container.querySelectorAll(".workspace-card").forEach((card) => {
    card.addEventListener("click", () => {
      const wsId = card.getAttribute("data-workspace-id");
      if (wsId) showWorkspaceDetail(wsId);
    });
  });
  // Add workspace card
  const addCards = container.querySelectorAll(".workspace-add");
  addCards.forEach((card) => {
    card.addEventListener("click", () => openModal("modal-create-workspace"));
  });
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  // ---- Auth check ----
  if (!getAuthToken()) {
    window.location.replace("/login.html");
    return;
  }

  // ---- Load user info ----
  const user = getAuthUser();
  if (user) {
    const nameEl = document.querySelector(".user-info .name");
    const roleEl = document.querySelector(".user-info .role");
    const avatarEl = document.querySelector(".user-avatar-placeholder");
    const greetingEl = document.querySelector(".page-header h2");
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
    if (greetingEl) greetingEl.textContent = `İyi Günler, ${user.name}!`;
  }

  // ---- Logout button ----
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Date
  const dateEl = document.getElementById("current-date");
  if (dateEl) dateEl.textContent = getFormattedDate();

  // Inject icons
  injectIcons();

  // Render dashboard workspaces
  renderDashboardWorkspaces();
  injectIcons();
  animateProgressBars();

  // ---- Sidebar Navigation ----
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(item.getAttribute("data-page"));
      // Close mobile sidebar
      closeMobileSidebar();
    });
  });

  // ---- Mobile hamburger menu ----
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");

  function openMobileSidebar() {
    sidebar.classList.add("open");
    hamburgerBtn.classList.add("active");
    sidebarOverlay.classList.remove("hidden");
  }
  function closeMobileSidebar() {
    sidebar.classList.remove("open");
    hamburgerBtn.classList.remove("active");
    sidebarOverlay.classList.add("hidden");
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", () => {
      if (sidebar.classList.contains("open")) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeMobileSidebar);
  }

  // ---- "Tümünü Gör" button ----
  document.querySelectorAll(".view-all-btn[data-page]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(btn.getAttribute("data-page"));
    });
  });

  // ---- Search ----
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll("#dashboard-workspaces .workspace-card").forEach((card) => {
        const name = card.querySelector(".workspace-name")?.textContent.toLowerCase() || "";
        card.style.display = name.includes(query) ? "" : "none";
      });
    });
  }

  // ---- Create workspace buttons ----
  ["create-workspace-btn", "create-workspace-btn-2"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => openModal("modal-create-workspace"));
  });

  // ---- Submit new workspace ----
  document.getElementById("ws-submit").addEventListener("click", () => {
    const name = document.getElementById("ws-name").value.trim();
    const server = document.getElementById("ws-server").value;
    if (!name) { showToast("Lütfen bir ad girin", "error"); return; }
    if (!server) { showToast("Lütfen bir sunucu seçin", "error"); return; }

    const colors = ["indigo", "amber", "rose", "green", "blue"];
    const abbr = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    const description = document.getElementById("ws-desc").value.trim();
    WORKSPACES.push({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name, abbr,
      color: colors[WORKSPACES.length % colors.length],
      status: "pending", statusText: "Beklemede",
      metric: "CPU Kullanımı", usage: 0, members: 1,
      avatarColors: ["#a5b4fc"],
      server, description: description || "",
    });

    closeModal("modal-create-workspace");
    document.getElementById("ws-name").value = "";
    document.getElementById("ws-server").value = "";
    document.getElementById("ws-desc").value = "";
    showToast(`"${name}" oluşturuldu!`);
    renderDashboardWorkspaces();
    renderAllWorkspaces();
    injectIcons();
    animateProgressBars();
  });

  // ---- Invite submit ----
  document.getElementById("invite-submit").addEventListener("click", () => {
    const email = document.getElementById("invite-email").value.trim();
    if (!email) { showToast("Lütfen bir e-posta adresi girin", "error"); return; }
    closeModal("modal-invite");
    document.getElementById("invite-email").value = "";
    showToast(`${email} adresine davet gönderildi!`);
  });

  // ---- Confirm modal OK button ----
  document.getElementById("confirm-ok").addEventListener("click", () => {
    closeModal("modal-confirm");
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
  });

  // ---- Close modals ----
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(btn.getAttribute("data-close-modal"));
    });
  });

  // ---- Close modal on overlay click ----
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.add("hidden");
    });
  });

  // ---- Context menu actions ----
  document.querySelectorAll(".context-menu-item[data-action]").forEach((item) => {
    item.addEventListener("click", () => {
      const action = item.getAttribute("data-action");
      const wsId = contextTarget;
      hideContextMenu();
      if (!wsId) return;
      const ws = WORKSPACES.find((w) => w.id === wsId);
      if (!ws) return;

      if (action === "detail") {
        showWorkspaceDetail(wsId);
      } else if (action === "invite") {
        document.getElementById("invite-modal-title").textContent = `"${ws.name}" — Üye Davet Et`;
        openModal("modal-invite");
      } else if (action === "delete") {
        confirmAction(`"${ws.name}" çalışma alanını silmek istediğinize emin misiniz?`, () => {
          const idx = WORKSPACES.findIndex((w) => w.id === wsId);
          if (idx > -1) WORKSPACES.splice(idx, 1);
          showToast(`"${ws.name}" silindi`, "info");
          renderDashboardWorkspaces();
          renderAllWorkspaces();
          injectIcons();
          animateProgressBars();
        });
      }
    });
  });

  // ---- Hide context menu on outside click ----
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("context-menu");
    if (!menu.classList.contains("hidden") && !menu.contains(e.target) && !e.target.closest("[data-ws-menu]")) {
      hideContextMenu();
    }
  });

  // ---- Load more activities ----
  document.getElementById("load-more-activities").addEventListener("click", () => {
    showToast("Daha fazla aktivite yükleniyor...", "info");
  });

  // ---- Keyboard: Escape closes modals & context menu ----
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay:not(.hidden)").forEach((m) => m.classList.add("hidden"));
      hideContextMenu();
    }
  });
});
