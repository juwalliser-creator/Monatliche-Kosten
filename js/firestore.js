function entriesRef(month) {
  return db.collection("kosten").doc(month).collection("eintraege");
}

function budgetsRef(month) {
  return db.collection("budgets").doc(month);
}

async function ensureUserDoc(user) {
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data();

  // First signed-in user without a role doc becomes admin (bootstrap).
  const existing = await db.collection("users").limit(1).get();
  const role = existing.empty ? "admin" : "viewer";
  const data = {
    role,
    name: user.email ? user.email.split("@")[0] : "Nutzer",
    email: user.email || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await ref.set(data);
  return data;
}

async function loadSettings() {
  const snap = await db.collection("settings").doc("app").get();
  if (snap.exists) {
    const d = snap.data();
    state.settings = {
      personAName: d.personAName || "Ich",
      personBName: d.personBName || "Bruder"
    };
  }
}

async function saveSettings(partial) {
  state.settings = { ...state.settings, ...partial };
  await db.collection("settings").doc("app").set(state.settings, { merge: true });
}

async function ensureCategories() {
  const col = db.collection("kategorien");
  const snap = await col.get();
  if (snap.empty) {
    const batch = db.batch();
    DEFAULT_CATEGORIES.forEach((name, i) => {
      const ref = col.doc();
      batch.set(ref, { name, order: i, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
  }
}

function listenCategories(onChange) {
  return db.collection("kategorien").onSnapshot(
    (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      list.sort(
        (a, b) =>
          (a.order ?? 0) - (b.order ?? 0) ||
          String(a.name).localeCompare(String(b.name), "de")
      );
      state.categories = list;
      onChange();
    },
    (err) => {
      state.error = err.message;
      onChange();
    }
  );
}

async function addCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const maxOrder = state.categories.reduce((m, c) => Math.max(m, c.order ?? 0), -1);
  await db.collection("kategorien").add({
    name: trimmed,
    order: maxOrder + 1,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function renameCategory(id, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const old = state.categories.find((c) => c.id === id);
  await db.collection("kategorien").doc(id).update({ name: trimmed });
  if (old && old.name !== trimmed) {
    // Rename on current month entries for consistency
    const snap = await entriesRef(state.currentMonth).where("kategorie", "==", old.name).get();
    const batch = db.batch();
    snap.forEach((doc) => batch.update(doc.ref, { kategorie: trimmed }));
    if (!snap.empty) await batch.commit();
  }
}

async function deleteCategory(id) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return;
  const used = state.entries.some((e) => e.kategorie === cat.name);
  if (used) {
    throw new Error("Kategorie wird noch von Einträgen genutzt.");
  }
  await db.collection("kategorien").doc(id).delete();
}

function listenBudgets(month, onChange) {
  return budgetsRef(month).onSnapshot(
    (snap) => {
      if (!snap.exists) {
        state.budgets = {};
        state.monatsBudget = null;
      } else {
        const data = snap.data() || {};
        state.budgets = data.limits && typeof data.limits === "object" ? { ...data.limits } : {};
        // Legacy: flat category keys without limits wrapper
        if (!data.limits) {
          Object.keys(data).forEach((k) => {
            if (k !== "monatsBudget" && typeof data[k] === "number") {
              state.budgets[k] = data[k];
            }
          });
        }
        state.monatsBudget =
          data.monatsBudget != null && !Number.isNaN(Number(data.monatsBudget))
            ? Number(data.monatsBudget)
            : null;
      }
      onChange();
    },
    (err) => {
      state.error = err.message;
      onChange();
    }
  );
}

async function setCategoryBudget(category, amount) {
  const limits = { ...state.budgets };
  if (amount === "" || amount == null || Number.isNaN(Number(amount))) {
    delete limits[category];
  } else {
    limits[category] = Number(amount);
  }
  await budgetsRef(state.currentMonth).set({ limits }, { merge: true });
}

async function setMonatsBudget(amount) {
  if (amount === "" || amount == null || Number.isNaN(Number(amount))) {
    await budgetsRef(state.currentMonth).set({ monatsBudget: null }, { merge: true });
    return;
  }
  await budgetsRef(state.currentMonth).set({ monatsBudget: Number(amount) }, { merge: true });
}

function normalizeEntry(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name || "",
    betrag: Number(d.betrag) || 0,
    kategorie: d.kategorie || "Sonstiges",
    person: d.person === PERSON_B ? PERSON_B : (d.person === PERSON_A ? PERSON_A : PERSON_A),
    notiz: d.notiz || "",
    createdAt: d.createdAt || null
  };
}

function listenEntries(month, onChange) {
  return entriesRef(month).onSnapshot(
    (snap) => {
      const list = [];
      snap.forEach((doc) => list.push(normalizeEntry(doc)));
      state.entries = list;
      onChange();
    },
    (err) => {
      state.error = err.message;
      onChange();
    }
  );
}

async function loadPrevMonthEntries(month) {
  const prev = prevMonthKey(month);
  const snap = await entriesRef(prev).get();
  const list = [];
  snap.forEach((doc) => list.push(normalizeEntry(doc)));
  state.prevEntries = list;
  return list;
}

async function addEntry({ name, betrag, kategorie, person, notiz }) {
  await entriesRef(state.currentMonth).add({
    name: name.trim(),
    betrag: Number(betrag),
    kategorie,
    person,
    notiz: (notiz || "").trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function updateEntry(id, data) {
  await entriesRef(state.currentMonth).doc(id).update({
    name: data.name.trim(),
    betrag: Number(data.betrag),
    kategorie: data.kategorie,
    person: data.person,
    notiz: (data.notiz || "").trim()
  });
}

async function deleteEntry(id) {
  await entriesRef(state.currentMonth).doc(id).delete();
}

async function copyPreviousMonth() {
  const prev = prevMonthKey(state.currentMonth);
  const snap = await entriesRef(prev).get();
  if (snap.empty) throw new Error("Vormonat hat keine Einträge.");
  const batch = db.batch();
  snap.forEach((doc) => {
    const d = doc.data();
    const ref = entriesRef(state.currentMonth).doc();
    batch.set(ref, {
      name: d.name || "",
      betrag: Number(d.betrag) || 0,
      kategorie: d.kategorie || "Sonstiges",
      person: d.person === PERSON_B ? PERSON_B : PERSON_A,
      notiz: d.notiz || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      copiedFrom: prev
    });
  });
  await batch.commit();
  return snap.size;
}
