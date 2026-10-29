function $(id) {
  return document.getElementById(id);
}

function setGlobalError(msg) {
  const el = $("globalError");
  if (!msg) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = msg;
  el.classList.remove("hidden");
}

function setLoading(on) {
  state.loading = on;
  $("loadingBanner").classList.toggle("hidden", !on);
}

function applyRoleUI() {
  const admin = isAdmin();
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.classList.toggle("hidden", !admin);
  });
  const badge = $("roleBadge");
  badge.textContent = admin ? "Bearbeiten" : "Nur Lesen";
  badge.classList.toggle("viewer", !admin);
  $("exportBtnViewer").hidden = admin;
  if ($("budgetKpiViewer")) $("budgetKpiViewer").hidden = admin;
  if ($("budgetKpiAdmin")) $("budgetKpiAdmin").classList.toggle("hidden", !admin);
}

function fillMonthSelect() {
  const sel = $("monthSelect");
  const prev = sel.value;
  sel.innerHTML = "";
  const start = new Date(2025, 0, 1);
  const end = new Date();
  end.setMonth(end.getMonth() + 1); // allow next month for planning
  const cur = new Date(start);
  while (cur <= end) {
    const val = monthKey(cur);
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    sel.appendChild(opt);
    cur.setMonth(cur.getMonth() + 1);
  }
  const prefer = prev || state.currentMonth || monthKey(new Date());
  if ([...sel.options].some((o) => o.value === prefer)) sel.value = prefer;
  else sel.value = sel.options[sel.options.length - 2]?.value || sel.options[sel.options.length - 1].value;
  state.currentMonth = sel.value;
}

function fillCategorySelects() {
  const selects = [$("entryCategory"), $("editCategory"), $("filterCategory")];
  const names = state.categories.map((c) => c.name);
  selects.forEach((sel, idx) => {
    if (!sel) return;
    const current = sel.value;
    const isFilter = sel.id === "filterCategory";
    sel.innerHTML = isFilter ? `<option value="">Alle Kategorien</option>` : "";
    names.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      sel.appendChild(opt);
    });
    if (current && [...sel.options].some((o) => o.value === current)) sel.value = current;
  });
}

function fillPersonSelects() {
  const opts = [
    { value: PERSON_A, label: personLabel(PERSON_A) },
    { value: PERSON_B, label: personLabel(PERSON_B) }
  ];
  [$("entryPerson"), $("editPerson"), $("filterPerson")].forEach((sel) => {
    if (!sel) return;
    const current = sel.value;
    const isFilter = sel.id === "filterPerson";
    sel.innerHTML = isFilter ? `<option value="">Alle Personen</option>` : "";
    opts.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
    if (current && [...sel.options].some((o) => o.value === current)) sel.value = current;
  });
  $("kpiPersonALabel").textContent = personLabel(PERSON_A);
  $("kpiPersonBLabel").textContent = personLabel(PERSON_B);
}

function filteredEntries() {
  const { search, category, person, sort } = state.filters;
  let list = [...state.entries];
  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.kategorie.toLowerCase().includes(q) ||
      (e.notiz || "").toLowerCase().includes(q) ||
      personLabel(e.person).toLowerCase().includes(q)
    );
  }
  if (category) list = list.filter((e) => e.kategorie === category);
  if (person) list = list.filter((e) => e.person === person);

  list.sort((a, b) => {
    switch (sort) {
      case "name-desc":
        return b.name.localeCompare(a.name, "de");
      case "betrag-desc":
        return b.betrag - a.betrag;
      case "betrag-asc":
        return a.betrag - b.betrag;
      case "name-asc":
      default:
        return a.name.localeCompare(b.name, "de");
    }
  });
  return list;
}

function computeSums(entries) {
  const byCat = {};
  let total = 0;
  let a = 0;
  let b = 0;
  entries.forEach((e) => {
    total += e.betrag;
    byCat[e.kategorie] = (byCat[e.kategorie] || 0) + e.betrag;
    if (e.person === PERSON_B) b += e.betrag;
    else a += e.betrag;
  });
  return { byCat, total, a, b };
}

function renderEntries() {
  const body = $("entriesBody");
  const list = filteredEntries();
  body.innerHTML = "";
  $("entryCount").textContent = `${list.length} von ${state.entries.length}`;
  $("entriesEmpty").classList.toggle("hidden", state.entries.length > 0);
  $("entriesTable").classList.toggle("hidden", state.entries.length === 0);

  const admin = isAdmin();
  list.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(e.name)}${e.notiz ? `<div class="muted">${escapeHtml(e.notiz)}</div>` : ""}</td>
      <td>${escapeHtml(e.kategorie)}</td>
      <td>${escapeHtml(personLabel(e.person))}</td>
      <td>${formatEuro(e.betrag)}</td>
      <td class="admin-only ${admin ? "" : "hidden"}"></td>
    `;
    if (admin) {
      const cell = tr.lastElementChild;
      cell.className = "row-actions admin-only";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-ghost";
      editBtn.textContent = "Bearbeiten";
      editBtn.addEventListener("click", () => openEditDialog(e));
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-danger";
      delBtn.textContent = "Löschen";
      delBtn.addEventListener("click", async () => {
        if (!confirm(`„${e.name}" wirklich löschen?`)) return;
        try {
          await deleteEntry(e.id);
        } catch (err) {
          setGlobalError(err.message);
        }
      });
      cell.append(editBtn, delBtn);
    }
    body.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCategories() {
  const body = $("categoriesBody");
  body.innerHTML = "";
  const { byCat, total } = computeSums(state.entries);
  const names = new Set([
    ...state.categories.map((c) => c.name),
    ...Object.keys(byCat)
  ]);
  $("categoriesEmpty").classList.toggle("hidden", names.size > 0);

  const admin = isAdmin();
  let budgetSum = 0;
  [...names].sort((a, b) => a.localeCompare(b, "de")).forEach((name) => {
    const sum = byCat[name] || 0;
    const budget = state.budgets[name];
    const hasBudget = budget != null && budget !== "" && !Number.isNaN(Number(budget));
    if (hasBudget) budgetSum += Number(budget);
    const pct = hasBudget && Number(budget) > 0 ? Math.min(100, (sum / Number(budget)) * 100) : 0;
    const over = hasBudget && sum > Number(budget);

    const tr = document.createElement("tr");
    const budgetCell = document.createElement("td");
    if (admin) {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.01";
      input.min = "0";
      input.className = "budget-input";
      input.placeholder = "–";
      input.value = hasBudget ? Number(budget) : "";
      input.title = "Budget speichern mit Enter oder Blur";
      const save = async () => {
        try {
          await setCategoryBudget(name, input.value);
        } catch (err) {
          setGlobalError(err.message);
        }
      };
      input.addEventListener("change", save);
      budgetCell.appendChild(input);
    } else {
      budgetCell.textContent = hasBudget ? formatEuro(budget) : "–";
    }

    const progCell = document.createElement("td");
    if (hasBudget) {
      const wrap = document.createElement("div");
      wrap.className = "progress" + (over ? " over" : "");
      wrap.title = `${pct.toFixed(0)} %`;
      const bar = document.createElement("span");
      bar.style.width = `${pct}%`;
      wrap.appendChild(bar);
      progCell.appendChild(wrap);
    } else {
      progCell.textContent = "–";
    }

    const nameTd = document.createElement("td");
    nameTd.textContent = name;
    const sumTd = document.createElement("td");
    sumTd.textContent = formatEuro(sum);
    tr.append(nameTd, sumTd, budgetCell, progCell);
    body.appendChild(tr);
  });

  $("catTotal").textContent = formatEuro(total);
  $("budgetTotal").textContent = budgetSum > 0 ? formatEuro(budgetSum) : "–";

  const monats = state.monatsBudget;
  if (monats != null && monats > 0) {
    const gPct = (total / monats) * 100;
    $("catBudgetPct").textContent = `${gPct.toFixed(0)} % vom Monatsbudget`;
  } else {
    $("catBudgetPct").textContent = "–";
  }
  if (admin) {
    $("namePersonA").value = state.settings.personAName || "";
    $("namePersonB").value = state.settings.personBName || "";
  }
}

function renderKpisAndCharts() {
  const { byCat, total, a, b } = computeSums(state.entries);
  const available = state.monatsBudget;
  const remaining = available != null ? available - total : null;

  if ($("kpiAvailable")) {
    $("kpiAvailable").textContent = available != null ? formatEuro(available) : "–";
  }
  $("kpiTotal").textContent = formatEuro(total);
  if (remaining == null) {
    $("kpiRemaining").textContent = "–";
    $("kpiRemaining").parentElement.classList.remove("kpi-warn");
  } else {
    $("kpiRemaining").textContent = formatEuro(remaining);
    $("kpiRemaining").parentElement.classList.toggle("kpi-warn", remaining < 0);
  }

  $("kpiPersonA").textContent = formatEuro(a);
  $("kpiPersonB").textContent = formatEuro(b);
  if (available != null && available > 0) {
    $("kpiBudgetPct").textContent = `${((total / available) * 100).toFixed(0)} %`;
  } else {
    $("kpiBudgetPct").textContent = "–";
  }

  const input = $("monatsBudgetInput");
  if (input && document.activeElement !== input) {
    input.value = available != null ? available : "";
  }

  const hint = $("monatsBudgetHint");
  if (available == null) {
    hint.textContent = isAdmin()
      ? "Oben links das Monatsbudget eintragen (z. B. 5000) und Speichern."
      : "Für diesen Monat ist noch kein Budget hinterlegt.";
  } else if (remaining < 0) {
    hint.textContent = `Budget um ${formatEuro(Math.abs(remaining))} überschritten.`;
  } else {
    hint.textContent = `${formatEuro(total)} ausgegeben · ${formatEuro(remaining)} übrig von ${formatEuro(available)}.`;
  }

  renderBudgetChart(total, available);
  renderPieChart(byCat);

  const prevTotal = state.prevEntries.reduce((s, e) => s + e.betrag, 0);
  const hasPrev = state.prevEntries.length > 0;
  renderBarChart(total, prevTotal, hasPrev);
}

function renderAll() {
  if (state.error) setGlobalError(state.error);
  fillCategorySelects();
  fillPersonSelects();
  renderEntries();
  renderCategories();
  renderKpisAndCharts();
  applyRoleUI();
}

function openEditDialog(entry) {
  fillCategorySelects();
  fillPersonSelects();
  $("editId").value = entry.id;
  $("editName").value = entry.name;
  $("editAmount").value = entry.betrag;
  $("editCategory").value = entry.kategorie;
  $("editPerson").value = entry.person;
  $("editNote").value = entry.notiz || "";
  $("editDialog").showModal();
}

function renderCatManageList() {
  const ul = $("catManageList");
  ul.innerHTML = "";
  state.categories.forEach((cat) => {
    const li = document.createElement("li");
    const input = document.createElement("input");
    input.value = cat.name;
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-secondary";
    saveBtn.textContent = "Umbenennen";
    saveBtn.addEventListener("click", async () => {
      try {
        await renameCategory(cat.id, input.value);
      } catch (err) {
        setGlobalError(err.message);
      }
    });
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-danger";
    delBtn.textContent = "Löschen";
    delBtn.addEventListener("click", async () => {
      try {
        await deleteCategory(cat.id);
      } catch (err) {
        alert(err.message);
      }
    });
    li.append(input, saveBtn, delBtn);
    ul.appendChild(li);
  });
}
