// SVG Icon definitions — replaces Material Symbols CDN
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
};

/**
 * Render an SVG icon by name
 */
function icon(name) {
  return `<span class="icon">${ICONS[name] || ""}</span>`;
}

/**
 * Get current date formatted in Turkish
 */
function getFormattedDate() {
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Initialize the app when DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  // Fill dynamic date
  const dateEl = document.getElementById("current-date");
  if (dateEl) {
    dateEl.textContent = getFormattedDate();
  }

  // Inject all icons
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.getAttribute("data-icon");
    el.innerHTML = ICONS[name] || "";
  });

  // Search box functionality
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll(".workspace-card").forEach((card) => {
        const name = card.querySelector(".workspace-name")?.textContent.toLowerCase() || "";
        card.style.display = name.includes(query) ? "" : "none";
      });
    });
  }

  // Navigate sidebar
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-item").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Progress bar animation
  document.querySelectorAll(".progress-fill").forEach((bar) => {
    const width = bar.style.width;
    bar.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = width;
      });
    });
  });

  // Load more activities button
  const loadMoreBtn = document.getElementById("load-more-activities");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      alert("Daha fazla aktivite yüklenecek...");
    });
  }

  // Create New Workspace button
  const createBtn = document.getElementById("create-workspace-btn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      alert("Yeni workspace oluşturma formu açılacak...");
    });
  }

  // Add workspace card
  const addCard = document.getElementById("add-workspace-card");
  if (addCard) {
    addCard.addEventListener("click", () => {
      alert("Yeni workspace oluşturma formu açılacak...");
    });
  }
});
