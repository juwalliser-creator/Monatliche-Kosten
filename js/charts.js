let pieChart = null;
let barChart = null;
let budgetChart = null;

const CHART_COLORS = ["#0d6e63", "#3d7ea6", "#c9842a", "#8b5e83", "#4f6f52", "#b85c38", "#5c6b7a"];

function destroyCharts() {
  if (pieChart) {
    pieChart.destroy();
    pieChart = null;
  }
  if (barChart) {
    barChart.destroy();
    barChart = null;
  }
  if (budgetChart) {
    budgetChart.destroy();
    budgetChart = null;
  }
}

function renderBudgetChart(spent, available) {
  const canvas = document.getElementById("budgetChart");
  const empty = document.getElementById("budgetEmpty");

  if (available == null || available <= 0) {
    if (budgetChart) {
      budgetChart.destroy();
      budgetChart = null;
    }
    canvas.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = "Bitte zuerst ein Monatsbudget setzen.";
    return;
  }

  canvas.classList.remove("hidden");
  empty.classList.add("hidden");

  const used = Math.min(spent, available);
  const remaining = Math.max(0, available - spent);
  const over = Math.max(0, spent - available);

  const labels = over > 0 ? ["Ausgegeben", "Überzogen"] : ["Ausgegeben", "Übrig"];
  const data = over > 0 ? [available, over] : [used, remaining];
  const colors = over > 0 ? ["#b45309", "#b42318"] : ["#0d6e63", "#c5ddd8"];

  if (budgetChart) budgetChart.destroy();
  budgetChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, font: { family: "Manrope" } }
        }
      }
    }
  });
}

function renderPieChart(sums) {
  const canvas = document.getElementById("pieChart");
  const empty = document.getElementById("pieEmpty");
  const labels = Object.keys(sums);
  const values = Object.values(sums);

  if (!labels.length) {
    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }
    canvas.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  canvas.classList.remove("hidden");
  empty.classList.add("hidden");

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(canvas.getContext("2d"), {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, font: { family: "Manrope" } }
        }
      }
    }
  });
}

function renderBarChart(currentTotal, prevTotal, hasPrev) {
  const canvas = document.getElementById("barChart");
  const empty = document.getElementById("barEmpty");

  if (!hasPrev && currentTotal === 0) {
    if (barChart) {
      barChart.destroy();
      barChart = null;
    }
    canvas.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  canvas.classList.remove("hidden");
  empty.classList.add("hidden");

  if (barChart) barChart.destroy();
  barChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Vormonat", "Aktuell"],
      datasets: [{
        label: "Gesamt €",
        data: [prevTotal, currentTotal],
        backgroundColor: ["#9bb7c9", "#0d6e63"],
        borderRadius: 8,
        maxBarThickness: 56
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { family: "Manrope" } }
        },
        x: {
          ticks: { font: { family: "Manrope" } }
        }
      }
    }
  });
}
