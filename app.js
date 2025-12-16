"use strict";

(() => {
  const STORAGE_KEY = "pet.expenses.v1";
  const SETTINGS_KEY = "pet.settings.v1";

  /** @typedef {{id:string,date:string,category:string,description:string,amount:number,currency:string,createdAt:number,updatedAt:number}} Expense */

  const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el;
  };

  const els = {
    formTitle: $("formTitle"),
    expenseForm: $("expenseForm"),
    editingId: $("editingId"),
    dateInput: $("dateInput"),
    amountInput: $("amountInput"),
    categoryInput: $("categoryInput"),
    currencyInput: $("currencyInput"),
    descriptionInput: $("descriptionInput"),
    saveBtn: $("saveBtn"),
    cancelEditBtn: $("cancelEditBtn"),

    monthTotal: $("monthTotal"),
    allTotal: $("allTotal"),
    expenseCount: $("expenseCount"),

    breakdownMeta: $("breakdownMeta"),
    categoryBreakdown: $("categoryBreakdown"),

    monthFilter: $("monthFilter"),
    categoryFilter: $("categoryFilter"),
    searchFilter: $("searchFilter"),
    sortSelect: $("sortSelect"),

    expenseTbody: $("expenseTbody"),
    emptyState: $("emptyState"),

    exportJsonBtn: $("exportJsonBtn"),
    exportCsvBtn: $("exportCsvBtn"),
    importFile: $("importFile"),
    clearAllBtn: $("clearAllBtn"),

    storageHint: $("storageHint"),
  };

  const now = () => Date.now();

  const todayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const currentMonth = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  };

  const safeJsonParse = (raw, fallback) => {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const uuid = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  };

  const clampMoney = (n) => {
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n * 100) / 100;
  };

  const normalizeText = (s) => (s ?? "").toString().trim();

  const formatMoney = (amount, currency) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "VND" ? 0 : 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const downloadText = (filename, contents, mimeType) => {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const setHint = (message) => {
    els.storageHint.textContent = message;
    window.clearTimeout(setHint._t);
    setHint._t = window.setTimeout(() => {
      els.storageHint.textContent =
        "Data is stored locally (localStorage). Clearing browser data will remove it.";
    }, 5000);
  };

  const loadSettings = () => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const data = safeJsonParse(raw ?? "", null);
    const currency = data?.currency;
    return {
      currency: typeof currency === "string" && currency ? currency : "USD",
    };
  };

  const saveSettings = (settings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  };

  /** @returns {Expense[]} */
  const loadExpenses = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = safeJsonParse(raw ?? "", []);
    if (!Array.isArray(data)) return [];

    /** @type {Expense[]} */
    const cleaned = [];
    for (const x of data) {
      if (!x || typeof x !== "object") continue;
      const id = typeof x.id === "string" && x.id ? x.id : uuid();
      const date = typeof x.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : null;
      const category = normalizeText(x.category);
      const description = normalizeText(x.description);
      const amount = clampMoney(Number(x.amount));
      const currency = typeof x.currency === "string" && x.currency ? x.currency : "USD";
      const createdAt = Number.isFinite(Number(x.createdAt)) ? Number(x.createdAt) : now();
      const updatedAt = Number.isFinite(Number(x.updatedAt)) ? Number(x.updatedAt) : createdAt;

      if (!date || !category || !Number.isFinite(amount)) continue;
      cleaned.push({ id, date, category, description, amount, currency, createdAt, updatedAt });
    }

    return cleaned;
  };

  const saveExpenses = (expenses) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  };

  const uniqueCategories = (expenses) => {
    const set = new Set();
    for (const e of expenses) set.add(e.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };

  const getActiveCurrency = (expenses, preferred) => {
    const set = new Set(expenses.map((e) => e.currency).filter(Boolean));
    if (set.size === 0) return preferred;
    if (set.size === 1) return Array.from(set)[0];
    return null; // mixed
  };

  const makeCsv = (expenses) => {
    const esc = (s) => {
      const v = (s ?? "").toString();
      if (/[",\n]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
      return v;
    };

    const rows = [
      ["Date", "Category", "Description", "Amount", "Currency"],
      ...expenses.map((e) => [e.date, e.category, e.description, String(e.amount), e.currency]),
    ];

    return rows.map((r) => r.map(esc).join(",")).join("\n");
  };

  const state = {
    settings: loadSettings(),
    /** @type {Expense[]} */
    expenses: loadExpenses(),
  };

  const getFilters = () => {
    return {
      month: normalizeText(els.monthFilter.value),
      category: normalizeText(els.categoryFilter.value),
      search: normalizeText(els.searchFilter.value).toLowerCase(),
      sort: els.sortSelect.value,
    };
  };

  /** @param {Expense[]} list */
  const applyFilters = (list) => {
    const f = getFilters();
    let out = list.slice();

    if (f.month) {
      out = out.filter((e) => e.date.startsWith(f.month));
    }

    if (f.category) {
      out = out.filter((e) => e.category === f.category);
    }

    if (f.search) {
      out = out.filter((e) => (e.description ?? "").toLowerCase().includes(f.search));
    }

    out.sort((a, b) => {
      switch (f.sort) {
        case "date_asc":
          return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
        case "amount_desc":
          return b.amount - a.amount || b.date.localeCompare(a.date);
        case "amount_asc":
          return a.amount - b.amount || b.date.localeCompare(a.date);
        case "date_desc":
        default:
          return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
      }
    });

    return out;
  };

  const renderCategoryFilterOptions = () => {
    const cats = uniqueCategories(state.expenses);

    const selected = els.categoryFilter.value;
    els.categoryFilter.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All";
    els.categoryFilter.appendChild(optAll);

    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      els.categoryFilter.appendChild(opt);
    }

    if (cats.includes(selected)) els.categoryFilter.value = selected;
  };

  const renderSummary = () => {
    const all = state.expenses;
    const month = normalizeText(els.monthFilter.value) || currentMonth();
    const monthList = all.filter((e) => e.date.startsWith(month));

    const currencyAll = getActiveCurrency(all, state.settings.currency);
    const currencyMonth = getActiveCurrency(monthList, state.settings.currency);

    const allTotal = all.reduce((sum, e) => sum + e.amount, 0);
    const monthTotal = monthList.reduce((sum, e) => sum + e.amount, 0);

    els.expenseCount.textContent = String(all.length);

    if (currencyMonth) {
      els.monthTotal.textContent = formatMoney(monthTotal, currencyMonth);
    } else {
      els.monthTotal.textContent = "—";
    }

    if (currencyAll) {
      els.allTotal.textContent = formatMoney(allTotal, currencyAll);
    } else {
      els.allTotal.textContent = "—";
    }
  };

  /** @param {Expense[]} filtered */
  const renderTable = (filtered) => {
    els.expenseTbody.innerHTML = "";

    if (filtered.length === 0) {
      els.emptyState.hidden = false;
      return;
    }

    els.emptyState.hidden = true;

    for (const e of filtered) {
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = e.date;

      const tdCat = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = e.category;
      tdCat.appendChild(pill);

      const tdDesc = document.createElement("td");
      tdDesc.textContent = e.description || "—";

      const tdAmt = document.createElement("td");
      tdAmt.className = "table__num";
      tdAmt.textContent = formatMoney(e.amount, e.currency || state.settings.currency);

      const tdActions = document.createElement("td");
      tdActions.className = "table__actions";
      const wrap = document.createElement("div");
      wrap.className = "rowActions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn";
      editBtn.textContent = "Edit";
      editBtn.dataset.action = "edit";
      editBtn.dataset.id = e.id;

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn--danger";
      delBtn.textContent = "Delete";
      delBtn.dataset.action = "delete";
      delBtn.dataset.id = e.id;

      wrap.append(editBtn, delBtn);
      tdActions.appendChild(wrap);

      tr.append(tdDate, tdCat, tdDesc, tdAmt, tdActions);
      els.expenseTbody.appendChild(tr);
    }
  };

  /** @param {Expense[]} filtered */
  const renderBreakdown = (filtered) => {
    els.categoryBreakdown.innerHTML = "";

    const currency = getActiveCurrency(filtered, state.settings.currency);
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);

    if (filtered.length === 0) {
      els.breakdownMeta.textContent = "";
      const div = document.createElement("div");
      div.className = "muted";
      div.textContent = "No data for breakdown.";
      els.categoryBreakdown.appendChild(div);
      return;
    }

    if (!currency) {
      els.breakdownMeta.textContent = "Mixed currencies";
    } else {
      els.breakdownMeta.textContent = `Total: ${formatMoney(total, currency)}`;
    }

    /** @type {Map<string, number>} */
    const byCat = new Map();
    for (const e of filtered) {
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    }

    const rows = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...rows.map(([, v]) => v), 0);

    for (const [cat, amt] of rows) {
      const bar = document.createElement("div");
      bar.className = "bar";

      const top = document.createElement("div");
      top.className = "bar__top";

      const left = document.createElement("div");
      left.textContent = cat;
      left.style.fontWeight = "700";

      const right = document.createElement("div");
      right.style.color = "rgba(255,255,255,0.82)";
      right.style.fontVariantNumeric = "tabular-nums";
      right.textContent = currency ? formatMoney(amt, currency) : String(amt);

      top.append(left, right);

      const prog = document.createElement("div");
      prog.className = "progress";
      const fill = document.createElement("div");
      fill.className = "progress__fill";
      const pct = max > 0 ? Math.round((amt / max) * 100) : 0;
      fill.style.width = `${pct}%`;
      prog.appendChild(fill);

      bar.append(top, prog);
      els.categoryBreakdown.appendChild(bar);
    }
  };

  const render = () => {
    renderCategoryFilterOptions();
    renderSummary();
    const filtered = applyFilters(state.expenses);
    renderTable(filtered);
    renderBreakdown(filtered);
  };

  const resetForm = () => {
    els.editingId.value = "";
    els.formTitle.textContent = "Add expense";
    els.cancelEditBtn.hidden = true;

    els.dateInput.value = todayISO();
    els.amountInput.value = "";
    els.descriptionInput.value = "";

    // keep category as-is if user is entering similar items
    if (!els.categoryInput.value) {
      els.categoryInput.value = "";
    }

    // keep currency from settings
    els.currencyInput.value = state.settings.currency;
  };

  const setEditing = (expense) => {
    els.editingId.value = expense.id;
    els.formTitle.textContent = "Edit expense";
    els.cancelEditBtn.hidden = false;

    els.dateInput.value = expense.date;
    els.amountInput.value = String(expense.amount);
    els.categoryInput.value = expense.category;
    els.currencyInput.value = expense.currency || state.settings.currency;
    els.descriptionInput.value = expense.description || "";

    els.amountInput.focus();
  };

  const upsertExpenseFromForm = () => {
    const id = normalizeText(els.editingId.value);
    const date = normalizeText(els.dateInput.value);
    const category = normalizeText(els.categoryInput.value);
    const description = normalizeText(els.descriptionInput.value);
    const currency = normalizeText(els.currencyInput.value) || state.settings.currency;

    const amountRaw = Number(els.amountInput.value);
    const amount = clampMoney(amountRaw);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setHint("Please enter a valid date.");
      return;
    }

    if (!category) {
      setHint("Please select a category.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setHint("Please enter an amount greater than 0.");
      return;
    }

    // update preferred currency if user changed it
    if (currency && currency !== state.settings.currency) {
      state.settings.currency = currency;
      saveSettings(state.settings);
    }

    if (id) {
      const idx = state.expenses.findIndex((e) => e.id === id);
      if (idx >= 0) {
        state.expenses[idx] = {
          ...state.expenses[idx],
          date,
          category,
          description,
          amount,
          currency,
          updatedAt: now(),
        };
        saveExpenses(state.expenses);
        setHint("Expense updated.");
        resetForm();
        render();
        return;
      }
    }

    /** @type {Expense} */
    const expense = {
      id: uuid(),
      date,
      category,
      description,
      amount,
      currency,
      createdAt: now(),
      updatedAt: now(),
    };

    state.expenses.push(expense);
    saveExpenses(state.expenses);
    setHint("Expense added.");
    resetForm();
    render();
  };

  const deleteExpense = (id) => {
    const idx = state.expenses.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const e = state.expenses[idx];
    const ok = window.confirm(
      `Delete this expense?\n\n${e.date} • ${e.category} • ${formatMoney(e.amount, e.currency)}`
    );
    if (!ok) return;

    state.expenses.splice(idx, 1);
    saveExpenses(state.expenses);
    setHint("Expense deleted.");
    render();
  };

  const exportJson = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      expenses: state.expenses,
    };
    downloadText(
      `expenses_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
    setHint("Exported JSON.");
  };

  const exportCsv = () => {
    const filtered = applyFilters(state.expenses);
    const csv = makeCsv(filtered);
    downloadText(
      `expenses_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv"
    );
    setHint("Exported CSV (current filter)." );
  };

  const importJsonFile = async (file) => {
    const text = await file.text();
    const data = safeJsonParse(text, null);

    let incomingExpenses = null;
    let incomingSettings = null;

    if (Array.isArray(data)) {
      incomingExpenses = data;
    } else if (data && typeof data === "object") {
      if (Array.isArray(data.expenses)) incomingExpenses = data.expenses;
      if (data.settings && typeof data.settings === "object") incomingSettings = data.settings;
    }

    if (!incomingExpenses) {
      setHint("Import failed: expected an array of expenses or an object with { expenses }." );
      return;
    }

    const ok = window.confirm(
      `Import will REPLACE your current data.\n\nCurrent: ${state.expenses.length} expenses\nIncoming: ${incomingExpenses.length} expenses\n\nContinue?`
    );
    if (!ok) return;

    // Temporarily save raw data then reload via cleaner
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incomingExpenses));
    state.expenses = loadExpenses();

    if (incomingSettings?.currency && typeof incomingSettings.currency === "string") {
      state.settings.currency = incomingSettings.currency;
      saveSettings(state.settings);
    }

    els.currencyInput.value = state.settings.currency;
    setHint(`Imported ${state.expenses.length} expenses.`);
    render();
  };

  const clearAll = () => {
    const ok = window.confirm(
      `Clear ALL expenses stored in this browser?\n\nThis cannot be undone (unless you exported a backup).`
    );
    if (!ok) return;

    state.expenses = [];
    localStorage.removeItem(STORAGE_KEY);
    setHint("All expenses cleared.");
    resetForm();
    render();
  };

  const init = () => {
    // Defaults
    els.dateInput.value = todayISO();
    els.monthFilter.value = currentMonth();

    // Settings
    els.currencyInput.value = state.settings.currency;

    // Handlers
    els.expenseForm.addEventListener("submit", (ev) => {
      ev.preventDefault();
      upsertExpenseFromForm();
    });

    els.cancelEditBtn.addEventListener("click", () => {
      resetForm();
      setHint("Edit cancelled.");
    });

    els.currencyInput.addEventListener("change", () => {
      const cur = normalizeText(els.currencyInput.value);
      if (!cur) return;
      state.settings.currency = cur;
      saveSettings(state.settings);
      render();
    });

    els.monthFilter.addEventListener("change", render);
    els.categoryFilter.addEventListener("change", render);
    els.searchFilter.addEventListener("input", render);
    els.sortSelect.addEventListener("change", render);

    els.expenseTbody.addEventListener("click", (ev) => {
      const target = /** @type {HTMLElement} */ (ev.target);
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!action || !id) return;

      if (action === "edit") {
        const e = state.expenses.find((x) => x.id === id);
        if (e) setEditing(e);
      } else if (action === "delete") {
        deleteExpense(id);
      }
    });

    els.exportJsonBtn.addEventListener("click", exportJson);
    els.exportCsvBtn.addEventListener("click", exportCsv);

    els.importFile.addEventListener("change", async () => {
      const file = els.importFile.files?.[0];
      els.importFile.value = ""; // allow re-import same file
      if (!file) return;
      try {
        await importJsonFile(file);
      } catch {
        setHint("Import failed: could not read file.");
      }
    });

    els.clearAllBtn.addEventListener("click", clearAll);

    render();
  };

  init();
})();
