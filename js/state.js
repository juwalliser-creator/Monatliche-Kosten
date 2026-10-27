const state = {
  user: null,
  role: null, // "admin" | "viewer"
  displayName: "",
  currentMonth: null,
  entries: [],
  prevEntries: [],
  categories: [],
  budgets: {},
  settings: {
    personAName: "Ich",
    personBName: "Bruder",
    sparziel: null
  },
  filters: {
    search: "",
    category: "",
    person: "",
    sort: "name-asc"
  },
  loading: false,
  error: null,
  unsubs: [],
  unsubCategories: null
};

function isAdmin() {
  return state.role === "admin";
}

function personLabel(key) {
  if (key === PERSON_A) return state.settings.personAName || "Person A";
  if (key === PERSON_B) return state.settings.personBName || "Person B";
  return key || "–";
}

function formatEuro(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function monthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function prevMonthKey(key) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return monthKey(d);
}

function clearUnsubs() {
  state.unsubs.forEach((fn) => {
    try { fn(); } catch (_) { /* ignore */ }
  });
  state.unsubs = [];
}

function clearCategoryUnsub() {
  if (state.unsubCategories) {
    try { state.unsubCategories(); } catch (_) { /* ignore */ }
    state.unsubCategories = null;
  }
}

function clearAllListeners() {
  clearUnsubs();
  clearCategoryUnsub();
}
