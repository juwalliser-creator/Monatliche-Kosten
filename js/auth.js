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
    showLoginError("");
    const btn = $("loginBtn");
    btn.disabled = true;
    btn.textContent = "Anmelden…";
    try {
      await handleLogin($("loginEmail").value.trim(), $("loginPassword").value);
    } catch (ex) {
      showLoginError(mapAuthError(ex));
    } finally {
      btn.disabled = false;
      btn.textContent = "Anmelden";
    }
  });

  $("logoutBtn").addEventListener("click", () => {
    handleLogout().catch((ex) => setGlobalError(ex.message));
  });
}

function showLoginError(msg) {
  const err = $("loginError");
  if (!err) return;
  err.textContent = msg || "";
  err.hidden = !msg;
}

function mapAuthError(ex) {
  const code = ex && ex.code;
  if (code === "auth/invalid-email") return "Ungültige E-Mail-Adresse.";
  if (
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials"
  ) {
    return "E-Mail oder Passwort ist falsch.";
  }
  if (code === "auth/too-many-requests") return "Zu viele Versuche. Bitte später erneut.";
  if (code === "auth/operation-not-allowed") {
    return "E-Mail/Passwort-Login ist in Firebase noch nicht aktiviert.";
  }
  if (code === "auth/unauthorized-domain") {
    return "Diese Domain ist in Firebase Auth nicht freigegeben (Authorized domains).";
  }
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
      showLoginError("");
      const profile = await ensureUserDoc(user);
      state.user = user;
      state.role = profile.role === "admin" ? "admin" : "viewer";
      state.displayName = profile.name || "";
      showApp();
      await startApp();
    } catch (err) {
      const msg = err && err.message
        ? err.message
        : "Anmeldung fehlgeschlagen (Firestore/Rechte).";
      const hint = /permission|insufficient|Missing or insufficient/i.test(msg)
        ? "Kein Zugriff auf Firestore. Bitte Security Rules deployen und users-Dokument prüfen."
        : msg;
      showLoginError(hint);
      setGlobalError(hint);
      try { await auth.signOut(); } catch (_) { /* ignore */ }
      showLogin();
    } finally {
      setLoading(false);
    }
  });
}
