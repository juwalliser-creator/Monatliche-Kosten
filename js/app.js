async function subscribeMonth() {
  clearUnsubs();
  state.error = null;
  setGlobalError("");
  setLoading(true);

  const month = state.currentMonth;
  const refresh = () => {
    setLoading(false);
    renderAll();
  };

  try {
    await loadPrevMonthEntries(month);
  } catch (_) {
    state.prevEntries = [];
  }

  state.unsubs.push(listenEntries(month, refresh));
  state.unsubs.push(listenBudgets(month, refresh));
  // categories are global; already listening
  refresh();
}

async function startApp() {
  clearAllListeners();
  await loadSettings();
  await ensureCategories();
  fillMonthSelect();
  fillPersonSelects();
  applyRoleUI();

  state.unsubCategories = listenCategories(() => {
    fillCategorySelects();
    renderCatManageList();
    renderAll();
  });

  await subscribeMonth();
}

function stopApp() {
  clearAllListeners();
  destroyCharts();
  state.entries = [];
  state.prevEntries = [];
}

function bindAppUI() {
  $("monthSelect").addEventListener("change", async () => {
    state.currentMonth = $("monthSelect").value;
    await subscribeMonth();
  });

  $("searchInput").addEventListener("input", () => {
    state.filters.search = $("searchInput").value;
    renderEntries();
  });
  $("filterCategory").addEventListener("change", () => {
    state.filters.category = $("filterCategory").value;
    renderEntries();
  });
  $("filterPerson").addEventListener("change", () => {
    state.filters.person = $("filterPerson").value;
    renderEntries();
  });
  $("sortSelect").addEventListener("change", () => {
    state.filters.sort = $("sortSelect").value;
    renderEntries();
  });

  $("addForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    try {
      await addEntry({
        name: $("entryName").value,
        betrag: $("entryAmount").value,
        kategorie: $("entryCategory").value,
        person: $("entryPerson").value,
        notiz: $("entryNote").value
      });
      $("addForm").reset();
      fillCategorySelects();
      fillPersonSelects();
    } catch (err) {
      setGlobalError(err.message);
    }
  });

  $("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    try {
      await updateEntry($("editId").value, {
        name: $("editName").value,
        betrag: $("editAmount").value,
        kategorie: $("editCategory").value,
        person: $("editPerson").value,
        notiz: $("editNote").value
      });
      $("editDialog").close();
    } catch (err) {
      setGlobalError(err.message);
    }
  });
  $("editCancel").addEventListener("click", () => $("editDialog").close());

  $("copyPrevBtn").addEventListener("click", async () => {
    if (!isAdmin()) return;
    if (!confirm("Alle Einträge vom Vormonat in diesen Monat kopieren?")) return;
    try {
      const n = await copyPreviousMonth();
      alert(`${n} Einträge übernommen.`);
    } catch (err) {
      setGlobalError(err.message);
    }
  });

  const doExport = () => exportCsv(state.entries, state.currentMonth);
  $("exportBtn").addEventListener("click", doExport);
  $("exportBtnViewer").addEventListener("click", doExport);

  $("saveGoalBtn").addEventListener("click", async () => {
    if (!isAdmin()) return;
    const raw = $("goalInput").value;
    const sparziel = raw === "" ? null : Number(raw);
    try {
      await saveSettings({ sparziel });
      renderCategories();
      renderKpisAndCharts();
    } catch (err) {
      setGlobalError(err.message);
    }
  });

  $("saveNamesBtn").addEventListener("click", async () => {
    if (!isAdmin()) return;
    try {
      await saveSettings({
        personAName: $("namePersonA").value.trim() || "Ich",
        personBName: $("namePersonB").value.trim() || "Bruder"
      });
      fillPersonSelects();
      renderAll();
    } catch (err) {
      setGlobalError(err.message);
    }
  });

  $("manageCatBtn").addEventListener("click", () => {
    renderCatManageList();
    $("catDialog").showModal();
  });
  $("catClose").addEventListener("click", () => $("catDialog").close());
  $("catAddForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await addCategory($("newCatName").value);
      $("newCatName").value = "";
    } catch (err) {
      setGlobalError(err.message);
    }
  });
}

bindAuthUI();
bindAppUI();
onAuthReady(startApp, stopApp);
