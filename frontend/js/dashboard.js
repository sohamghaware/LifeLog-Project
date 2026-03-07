const API_BASE = "https://lifelog-project.onrender.com/api";
let activityChartInstance = null;
let categoryChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Initialize dashboard
  document.getElementById("entryDate").valueAsDate = new Date();
  loadEntries();
  loadVisionBoard();
  fetchAiInsights();
});

function getToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

/* -------------------------------------------------------------------------- */
/*                                ENTRY LOGIC                                 */
/* -------------------------------------------------------------------------- */

async function addEntry() {
  const token = getToken();

  const date = document.getElementById("entryDate").value;
  const activityTitle = document.getElementById("activityTitle").value.trim();
  const category = document.getElementById("category").value;
  const hours = parseInt(document.getElementById("durationHours").value || "0", 10);
  const minutes = parseInt(document.getElementById("durationMinutes").value || "0", 10);
  const durationMinutes = hours * 60 + minutes;
  const mood = document.getElementById("mood").value;
  const journalText = document.getElementById("journalText").value.trim();

  if (!activityTitle) {
    document.getElementById("entryMessage").innerText = "Activity Title is required!";
    return;
  }

  const res = await fetch(`${API_BASE}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      date,
      activityTitle,
      category,
      durationMinutes,
      mood,
      journalText,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    document.getElementById("activityTitle").value = "";
    document.getElementById("durationHours").value = "";
    document.getElementById("durationMinutes").value = "";
    document.getElementById("journalText").value = "";

    if (data.predictedMood) {
      document.getElementById("entryMessage").innerText = `Added! AI notice: your routine aligns more with a '${data.predictedMood}' mood.`;
      document.getElementById("entryMessage").style.color = "var(--neon-purple)";
    } else {
      document.getElementById("entryMessage").innerText = "Record added successfully!";
      document.getElementById("entryMessage").style.color = "var(--neon-cyan)";
    }

    setTimeout(() => {
      document.getElementById("entryMessage").innerText = "";
      document.getElementById("entryMessage").style.color = "var(--neon-cyan)";
    }, 5000);

    loadEntries();
    fetchAiInsights(mood, true); // fetch AI insights and show pop-up
  } else {
    document.getElementById("entryMessage").innerText = "Failed to add record.";
  }
}

async function loadEntries() {
  const token = getToken();

  const fDate = document.getElementById("filterDate")?.value || "";
  const fCategory = document.getElementById("filterCategory")?.value || "";
  const fMood = document.getElementById("filterMood")?.value || "";

  const queryParams = new URLSearchParams();
  if (fDate) queryParams.append("date", fDate);
  if (fCategory) queryParams.append("category", fCategory);
  if (fMood) queryParams.append("mood", fMood);

  const url = `${API_BASE}/entries${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  const list = document.getElementById("entriesList");
  list.innerHTML = "";

  let totalMinutes = 0;
  const now = new Date();

  // Calculate Start of Week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyEntries = [];
  const entryDates = new Set();
  const categoryCounts = {};

  data.forEach((entry) => {
    totalMinutes += entry.durationMinutes;
    const entryDate = new Date(entry.date);

    // Streaks logic
    entryDates.add(entryDate.toDateString());

    // Analytics grouping
    if (!categoryCounts[entry.category]) categoryCounts[entry.category] = 0;
    categoryCounts[entry.category]++;

    if (entryDate >= startOfWeek && entryDate <= endOfWeek) {
      weeklyEntries.push(entry);
    }

    // Render Entry Item
    const div = document.createElement("div");
    div.className = "entry-item";

    const moodEmoji = { Happy: "🟢", Neutral: "⚪", Sad: "🔵", Stressed: "🔴" }[entry.mood] || "⚪";

    div.innerHTML = `
      <div class="entry-info">
        <h4>${entry.activityTitle} <span style="font-size: 12px; color: var(--neon-purple);">[${entry.category}]</span></h4>
        <div class="entry-meta">
          <span>📅 ${entryDate.toLocaleDateString()}</span>
          <span>⏱️ ${Math.floor(entry.durationMinutes / 60)}h ${entry.durationMinutes % 60}m</span>
          <span>Mood: ${moodEmoji} ${entry.mood}</span>
        </div>
      </div>
      <div class="entry-actions">
        <button class="btn-icon" onclick='openEditModal(${JSON.stringify(entry)})'>✎</button>
        <button class="btn-icon delete" onclick="deleteEntry('${entry._id}')">✖</button>
      </div>
    `;
    list.appendChild(div);
  });

  // Update Stats
  document.getElementById("totalEntries").textContent = data.length;
  document.getElementById("weeklyCount").textContent = weeklyEntries.length;

  const weeklyMinutes = weeklyEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
  document.getElementById("totalTime").textContent = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  document.getElementById("weeklyTime").textContent = `${Math.floor(weeklyMinutes / 60)}h ${weeklyMinutes % 60}m`;

  fetchStreak();
  renderActivityChart(weeklyEntries);
  renderCategoryChart(categoryCounts);
}

async function deleteEntry(id) {
  if (!confirm("Delete this record permanently?")) return;
  const token = getToken();
  await fetch(`${API_BASE}/entries/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  loadEntries();
  fetchAiInsights();
}

/* -------------------------------------------------------------------------- */
/*                                EDIT MODAL                                  */
/* -------------------------------------------------------------------------- */

function openEditModal(entry) {
  document.getElementById("editEntryId").value = entry._id;
  document.getElementById("editDate").value = entry.date.split("T")[0];
  document.getElementById("editTitle").value = entry.activityTitle;
  document.getElementById("editCategory").value = entry.category;
  document.getElementById("editMood").value = entry.mood;

  document.getElementById("editHours").value = Math.floor(entry.durationMinutes / 60);
  document.getElementById("editMinutes").value = entry.durationMinutes % 60;

  document.getElementById("editJournal").value = entry.journalText;

  document.getElementById("editModal").classList.add("active");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
}

async function submitEdit() {
  const id = document.getElementById("editEntryId").value;
  const token = getToken();

  const date = document.getElementById("editDate").value;
  const activityTitle = document.getElementById("editTitle").value.trim();
  const category = document.getElementById("editCategory").value;
  const hours = parseInt(document.getElementById("editHours").value || "0", 10);
  const minutes = parseInt(document.getElementById("editMinutes").value || "0", 10);
  const durationMinutes = hours * 60 + minutes;
  const mood = document.getElementById("editMood").value;
  const journalText = document.getElementById("editJournal").value.trim();

  await fetch(`${API_BASE}/entries/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ date, activityTitle, category, durationMinutes, mood, journalText })
  });

  closeEditModal();
  loadEntries();
  fetchAiInsights();
}

/* -------------------------------------------------------------------------- */
/*                                STREAKS & AI                                */
/* -------------------------------------------------------------------------- */

async function fetchStreak() {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/user/streak`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const current = data.currentStreak || 0;
      const longest = data.longestStreak || 0;
      document.getElementById("streakCount").innerText = `${current} Day Streak (Best: ${longest})`;
    }
  } catch (err) {
    console.error("Fetch streak error:", err);
  }
}

async function fetchAiInsights(mood = null, showModal = false) {
  const token = getToken();
  try {
    const queryParams = new URLSearchParams();
    if (mood) queryParams.append("currentMood", mood);
    const url = `${API_BASE}/ai/mood-support${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const list = document.getElementById("suggestionList");
      list.innerHTML = "";

      if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach(s => {
          list.innerHTML += `<div class="ai-suggestion-card">${s}</div>`;
        });

        if (showModal) {
          const aiModalContent = document.getElementById("aiModalContent");
          if (aiModalContent) {
            aiModalContent.innerHTML = data.suggestions.map(s => `<p>${s}</p>`).join("");
            document.getElementById("aiModal").classList.add("active");
          }
        }
      } else {
        list.innerHTML = `<div class="ai-suggestion-card" style="border-left-color: var(--text-secondary);">Keep logging activities to get smart insights!</div>`;
      }
    }
  } catch (err) {
    console.error("AI Insights Error:", err);
  }
}

function closeAiModal() {
  document.getElementById("aiModal").classList.remove("active");
}

/* -------------------------------------------------------------------------- */
/*                                VISION BOARD                                */
/* -------------------------------------------------------------------------- */

function toggleActivityFields() {
  const type = document.getElementById("visionType").value;
  const cat = document.getElementById("visionCategory");
  const hours = document.getElementById("visionTargetHours");
  if (type === 'activity') {
    cat.style.display = 'block';
    hours.style.display = 'block';
  } else {
    cat.style.display = 'none';
    hours.style.display = 'none';
  }
}

async function loadVisionBoard() {
  const token = getToken();
  const res = await fetch(`${API_BASE}/vision`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const visions = await res.json();
  const grid = document.getElementById("visionGrid");
  const achievementGrid = document.getElementById("achievementGrid");

  if (grid) grid.innerHTML = "";
  if (achievementGrid) achievementGrid.innerHTML = "";

  visions.forEach(v => {
    if (v.completed) {
      if (achievementGrid) {
        const completedDate = v.completedAt ? new Date(v.completedAt).toLocaleDateString() : 'N/A';
        achievementGrid.innerHTML += `
          <div class="vision-card" style="border: 2px solid #38ef7d; box-shadow: 0 0 10px rgba(56, 239, 125, 0.4);">
            <img src="${v.imageUrl || 'https://via.placeholder.com/200?text=Goal+Achieved'}" alt="${v.title}" onerror="this.src='https://via.placeholder.com/200?text=Invalid+Image'" style="opacity: 0.7;">
            <div class="vision-card-overlay" style="background: rgba(0,0,0,0.85);">
              <h4 style="color: #38ef7d; margin-bottom: 5px;">✅ Goal Completed</h4>
              <p style="font-size: 15px; font-weight: bold; margin-bottom: 5px;">${v.title}</p>
              <p style="font-size: 12px; color: #ccc;">Completed: ${completedDate}</p>
              <p style="font-size: 11px; color: #fff; margin-top: 8px; font-style: italic;">"Great job! Keep achieving your goals."</p>
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin-top: 10px; overflow: hidden;">
                <div style="width: 100%; height: 100%; background: #38ef7d;"></div>
              </div>
              <button class="btn-danger" style="width: 100%; border-radius: 6px; font-size: 12px; padding: 4px; margin-top: 10px;" onclick="deleteVision('${v._id}')">Remove</button>
            </div>
          </div>
        `;
      }
    } else {
      if (grid) {
        // compute progress width
        let progressPercent = 0;
        let progressText = "";
        let buttonsHtml = "";

        if (v.type === 'activity') {
          progressPercent = v.targetHours > 0 ? Math.min(100, (v.currentHours / v.targetHours) * 100) : 0;
          progressText = `<p style="font-size: 11px; margin-bottom: 5px;">Progress: ${Number(v.currentHours).toFixed(1)} / ${v.targetHours} Hrs</p>`;
          // Auto-tracked, so no manual completion button
          buttonsHtml = `
            <div style="display: flex; gap: 5px; width: 100%;">
              <span style="flex: 1; font-size: 11px; color: #00f2fe; text-align: center; display: inline-block; padding-top: 5px;">Auto-tracked</span>
              <button class="btn-danger" style="flex: 1; border-radius: 6px; font-size: 12px; padding: 4px;" onclick="deleteVision('${v._id}')">Remove</button>
            </div>
          `;
        } else {
          progressText = `<p style="font-size: 11px; margin-bottom: 5px;">Type: Manual</p>`;
          buttonsHtml = `
            <div style="display: flex; gap: 5px; width: 100%;">
              <button class="btn-primary" style="flex: 1; border-radius: 6px; font-size: 12px; padding: 4px; background: #38ef7d; color: #000; border: none; font-weight: bold;" onclick="completeVision('${v._id}')">Complete Goal</button>
              <button class="btn-danger" style="flex: 1; border-radius: 6px; font-size: 12px; padding: 4px;" onclick="deleteVision('${v._id}')">Remove</button>
            </div>
          `;
        }

        grid.innerHTML += `
          <div class="vision-card">
            <img src="${v.imageUrl || 'https://via.placeholder.com/200?text=Vision'}" alt="${v.title}" onerror="this.src='https://via.placeholder.com/200?text=Invalid+Image'">
            <div class="vision-card-overlay">
              <h4 style="margin-bottom: 10px;">${v.title}</h4>
              ${progressText}
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin: 5px 0 10px 0; overflow: hidden;">
                <div style="width: ${progressPercent}%; height: 100%; background: #38ef7d; transition: width 0.5s;"></div>
              </div>
              ${buttonsHtml}
            </div>
          </div>
        `;
      }
    }
  });
}

async function completeVision(id) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/vision/${id}/complete`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      loadVisionBoard();
    } else {
      alert("Failed to complete goal.");
    }
  } catch (err) {
    console.error("Complete vision error:", err);
  }
}

async function addVision() {
  const token = getToken();
  const title = document.getElementById("visionTitle").value.trim();
  const imageUrl = document.getElementById("visionUrl").value.trim();
  const type = document.getElementById("visionType").value;
  const activityCategory = document.getElementById("visionCategory").value;
  const targetHours = document.getElementById("visionTargetHours").value;

  if (!title) return alert("Title is required");
  if (type === 'activity' && (!activityCategory || !targetHours)) {
    return alert("Category and Target Hours are required for Activity Goals");
  }

  await fetch(`${API_BASE}/vision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title, imageUrl, type, activityCategory, targetHours })
  });

  document.getElementById("visionTitle").value = "";
  document.getElementById("visionUrl").value = "";
  document.getElementById("visionTargetHours").value = "";
  loadVisionBoard();
}

async function deleteVision(id) {
  const token = getToken();
  await fetch(`${API_BASE}/vision/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  loadVisionBoard();
}

/* -------------------------------------------------------------------------- */
/*                                  CHARTS                                    */
/* -------------------------------------------------------------------------- */

function renderActivityChart(weeklyEntries) {
  const canvas = document.getElementById("activityChart");
  if (!canvas) return;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  weeklyEntries.forEach(entry => {
    counts[new Date(entry.date).getDay()]++;
  });

  if (activityChartInstance) activityChartInstance.destroy();

  activityChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: days,
      datasets: [{
        label: "Entries",
        data: counts,
        backgroundColor: "#00f2fe",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#a0a5b5" } },
        x: { grid: { display: false }, ticks: { color: "#a0a5b5" } }
      }
    }
  });
}

function renderCategoryChart(categoryCounts) {
  const canvas = document.getElementById("categoryChart");
  if (!canvas) return;

  const labels = Object.keys(categoryCounts);
  const data = Object.values(categoryCounts);

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          "#00f2fe", "#4facfe", "#b224ef", "#ff4b2b", "#ff416c", "#11998e", "#38ef7d"
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#a0a5b5', font: { family: 'Inter' } } }
      }
    }
  });
}

/* -------------------------------------------------------------------------- */
/*                                EXPORT CSV                                  */
/* -------------------------------------------------------------------------- */

async function exportCSV() {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/entries/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", "lifelog_entries.csv");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      alert("Failed to export CSV");
    }
  } catch (err) {
    console.error("Export CSV error:", err);
  }
}
