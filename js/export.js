function exportCsv(entries, month) {
  const header = ["Name", "Kategorie", "Person", "Betrag", "Notiz"];
  const rows = entries.map((e) => [
    e.name,
    e.kategorie,
    personLabel(e.person),
    String(e.betrag).replace(".", ","),
    e.notiz || ""
  ]);

  const escape = (cell) => {
    const s = String(cell ?? "");
    if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [header, ...rows].map((r) => r.map(escape).join(";"));
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kosten-${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
