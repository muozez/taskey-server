// ===== Taskey Auth Module =====
// Bu dosya hem login.html hem index.html tarafından kullanılır.

const Auth = (() => {
  function getToken() {
    return sessionStorage.getItem("taskey_token") || localStorage.getItem("taskey_token");
  }

  function getUser() {
    const raw = sessionStorage.getItem("taskey_user") || localStorage.getItem("taskey_user");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function setCredentials(token, user, remember) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("taskey_token", token);
    storage.setItem("taskey_user", JSON.stringify(user));
  }

  function clear() {
    sessionStorage.removeItem("taskey_token");
    sessionStorage.removeItem("taskey_user");
    localStorage.removeItem("taskey_token");
    localStorage.removeItem("taskey_user");
  }

  async function verify() {
    const token = getToken();
    if (!token) return false;
    try {
      const res = await fetch("/api/me", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) return true;
      // Token geçersiz — temizle
      clear();
      return false;
    } catch {
      // Sunucuya ulaşılamadı — token'ı geçerli say (offline tolerans)
      return true;
    }
  }

  async function logout() {
    const token = getToken();
    try {
      await fetch("/api/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
    } catch { /* ignore */ }
    clear();
    window.location.replace("/login.html");
  }

  // Korunan sayfalar için (index.html) — auth yoksa login'e yönlendir
  async function requireAuth() {
    const valid = await verify();
    if (!valid) {
      window.location.replace("/login.html");
      return false;
    }
    return true;
  }

  // Login sayfası için — zaten giriş yapılmışsa dashboard'a yönlendir
  async function redirectIfAuthenticated() {
    const valid = await verify();
    if (valid) {
      window.location.replace("/");
      return true;
    }
    return false;
  }

  // Kurulum gerekiyor mu kontrol et
  async function checkSetup() {
    try {
      const res = await fetch("/api/setup/status");
      const data = await res.json();
      return data.needsSetup === true;
    } catch {
      return false;
    }
  }

  // Onboarding tamamlandı mı?
  function isOnboardingDone() {
    return localStorage.getItem("taskey_onboarding_done") === "true";
  }

  function markOnboardingDone() {
    localStorage.setItem("taskey_onboarding_done", "true");
  }

  return {
    getToken,
    getUser,
    setCredentials,
    clear,
    verify,
    logout,
    requireAuth,
    redirectIfAuthenticated,
    checkSetup,
    isOnboardingDone,
    markOnboardingDone,
  };
})();
