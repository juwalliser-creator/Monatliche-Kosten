async function handleLogin(email, password) {
  await auth.signInWithEmailAndPassword(email, password);
}

async function handleLogout() {
  clearAllListeners();
  destroyCharts();
  await auth.signOut();
}

function showLogin() {
  $("loginView").classList.remove("hidden");
  $("appView").classList.add("hidden");
}

function showApp() {
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
}

function bindAuthUI() {
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("loginError");
    err.hidden = true;
    const btn = $("loginBtn");
    btn.disabled = true;
    try {
      await handleLogin($("loginEmail").value.trim(), $("loginPassword").value);
    } catch (ex) {
      err.textContent = mapAuthError(ex);
      err.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  $("logoutBtn").addEventListener("click", () => {
    handleLogout().catch((ex) => setGlobalError(ex.message));
  });
}

function mapAuthError(ex) {
  const code = ex && ex.code;
  if (code === "auth/invalid-email") return "Ungültige E-Mail-Adresse.";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "E-Mail oder Passwort ist falsch.";
  }
  if (code === "auth/too-many-requests") return "Zu viele Versuche. Bitte später erneut.";
  return ex.message || "Anmeldung fehlgeschlagen.";
}

function onAuthReady(startApp, stopApp) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      state.user = null;
      state.role = null;
      stopApp();
      showLogin();
      return;
    }
    try {
      setLoading(true);
      const profile = await ensureUserDoc(user);
      state.user = user;
      state.role = profile.role === "admin" ? "admin" : "viewer";
      state.displayName = profile.name || "";
      showApp();
      await startApp();
    } catch (err) {
      setGlobalError(err.message);
      try { await auth.signOut(); } catch (_) { /* ignore */ }
      showLogin();
    } finally {
      setLoading(false);
    }
  });
}
