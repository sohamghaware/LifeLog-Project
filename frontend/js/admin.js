const API_BASE = "https://lifelog-project.onrender.com/api";
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const USERS_PER_PAGE = 10;

function getToken() {
    return localStorage.getItem("token");
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Initial fetch of info
    loadHealth();
    loadStats();
    loadAdminLogs();
    fetchUsers();
    loadContactMessages();
});

// APIs - Loaders
async function fetchUsers() {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
            allUsers = await res.json();
            applyUserFilters();
        } else {
            document.getElementById("adminMessage").innerText = "Access denied or session expired.";
            setTimeout(() => window.location.href = "dashboard.html", 2000);
        }
    } catch (e) {
        console.error("Fetch users err:", e);
    }
}

async function loadHealth() {
    try {
        const res = await fetch(`${API_BASE}/admin/health`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
            const h = await res.json();
            document.getElementById("sysBackend").innerText = h.backendStatus;
            document.getElementById("sysDb").innerText = h.databaseStatus;
            document.getElementById("sysAi").innerText = h.aiServiceStatus;
        }
    } catch (e) { }
}

async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
            const s = await res.json();
            document.getElementById("statsUsers").innerText = s.totalUsers;
            document.getElementById("statsLogs").innerText = s.totalLogs;
            document.getElementById("statsToday").innerText = s.logsToday;
            document.getElementById("statsWeek").innerText = s.logsThisWeek;
            document.getElementById("statsMood").innerText = s.mostCommonMood;
            document.getElementById("statsActivity").innerText = s.mostCommonActivity;
        }
    } catch (e) { }
}

async function loadAdminLogs() {
    try {
        const res = await fetch(`${API_BASE}/admin/logs`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
            const logs = await res.json();
            const tbody = document.getElementById("adminLogsBody");
            tbody.innerHTML = "";
            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No activity yet.</td></tr>`;
                return;
            }
            logs.forEach(log => {
                const tr = document.createElement("tr");
                const adminEmail = log.adminId ? log.adminId.email : 'Unknown';
                tr.innerHTML = `
                    <td>${new Date(log.createdAt).toLocaleString()}</td>
                    <td>${adminEmail}</td>
                    <td><strong style="color:var(--neon-purple)">${log.action}</strong></td>
                    <td>${log.details}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) { }
}

async function loadContactMessages() {
    try {
        const res = await fetch(`${API_BASE}/admin/messages`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
            const msgs = await res.json();
            const tbody = document.getElementById("contactMessagesBody");
            tbody.innerHTML = "";
            if (msgs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No new messages.</td></tr>`;
                return;
            }
            msgs.forEach(msg => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="white-space:nowrap">${new Date(msg.createdAt).toLocaleString()}</td>
                    <td><strong>${msg.name}</strong></td>
                    <td><a href="mailto:${msg.email}" style="color:var(--neon-cyan)">${msg.email}</a></td>
                    <td>${msg.content}</td>
                    <td><button class="btn-danger" style="padding: 4px 10px; font-size: 12px;" onclick="deleteMessage('${msg._id}')">Delete</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) { }
}

async function deleteMessage(msgId) {
    if (!confirm("Delete this message?")) return;
    try {
        const res = await fetch(`${API_BASE}/admin/messages/${msgId}`, {
            method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.ok) {
            showMessage("Message deleted", "#00ffaa");
            loadContactMessages();
        } else {
            showMessage("Failed to delete message", "#ff5555");
        }
    } catch (e) { showMessage("Error", "#ff5555"); }
}

// User Actions
async function deleteUser(userId, userName) {
    if (!confirm(`WARNING: Are you sure you want to permanently delete '${userName}'?`)) return;
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.ok) {
            showMessage("User deleted", "#00ffaa");
            fetchUsers();
            loadStats();
            loadAdminLogs();
        } else {
            showMessage("Failed to delete user", "#ff5555");
        }
    } catch (e) { showMessage("Error", "#ff5555"); }
}

async function toggleUserStatus(userId) {
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle-status`, {
            method: "PUT", headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.ok) {
            const data = await res.json();
            showMessage(`User is now ${data.isActive ? 'Active' : 'Disabled'}`, "#00ffaa");
            fetchUsers();
            loadAdminLogs();
        } else {
            showMessage("Failed to toggle status", "#ff5555");
        }
    } catch (e) { showMessage("Error", "#ff5555"); }
}

async function viewUserLogs(userId, userName) {
    document.getElementById("userLogsTitle").innerText = `Activity Logs for ${userName}`;
    const tbody = document.getElementById("userSpecificLogsBody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>`;
    document.getElementById("userLogsModal").style.display = "block";

    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/entries`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
            const logs = await res.json();
            tbody.innerHTML = "";
            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No activity logs found.</td></tr>`;
                return;
            }
            logs.forEach(l => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${new Date(l.date).toLocaleDateString()}</td>
                    <td><strong>${l.activityTitle}</strong></td>
                    <td>${l.category}</td>
                    <td style="color:${l.mood === 'Happy' ? '#00ffaa' : l.mood === 'Sad' ? '#ff5555' : 'var(--neon-cyan)'}">${l.mood}</td>
                    <td>${l.durationMinutes} min</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) { }
}

function closeUserLogsModal() {
    document.getElementById("userLogsModal").style.display = "none";
}

// Search, Filter, Sort & Paging
function applyUserFilters() {
    const searchVal = document.getElementById("searchUser").value.toLowerCase();
    const roleVal = document.getElementById("filterRole").value;
    const sortVal = document.getElementById("sortUser").value;

    filteredUsers = allUsers.filter(u => {
        const matchSearch = u.name.toLowerCase().includes(searchVal) || u.email.toLowerCase().includes(searchVal);
        const matchRole = roleVal === "all" || u.role === roleVal;
        return matchSearch && matchRole;
    });

    if (sortVal === "newest") {
        filteredUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortVal === "oldest") {
        filteredUsers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortVal === "mostLogs") {
        filteredUsers.sort((a, b) => b.entryCount - a.entryCount);
    } else if (sortVal === "leastLogs") {
        filteredUsers.sort((a, b) => a.entryCount - b.entryCount);
    }

    currentPage = 1;
    renderUserTable();
}

function renderUserTable() {
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = "";

    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const paginated = filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No users found.</td></tr>`;
    } else {
        paginated.forEach(user => {
            const isActiveHtml = user.isActive
                ? '<span style="color:#00ffaa">Active</span>'
                : '<span style="color:#ff5555">Disabled</span>';
            const toggleText = user.isActive ? 'Disable' : 'Enable';
            const toggleColor = user.isActive ? 'btn-outline' : 'btn-primary';

            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${isActiveHtml}</td>
            <td><strong style="color: var(--neon-purple);">${user.entryCount}</strong></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="${toggleColor}" style="padding: 4px 8px; font-size: 11px;" onclick="toggleUserStatus('${user._id}')">${toggleText}</button>
                <button class="btn-primary" style="padding: 4px 8px; font-size: 11px; background: rgba(0,242,254,0.1);" onclick="viewUserLogs('${user._id}','${user.name}')">Logs</button>
                <button class="btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteUser('${user._id}', '${user.name}')">Delete</button>
            </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Paging UI
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
    document.getElementById("pageIndicator").innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prevPageBtn").disabled = currentPage === 1;
    document.getElementById("nextPageBtn").disabled = currentPage === totalPages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderUserTable();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderUserTable();
    }
}

function showMessage(msg, color) {
    const el = document.getElementById("adminMessage");
    el.innerText = msg;
    el.style.color = color;
    setTimeout(() => { el.innerText = ""; }, 3000);
}

// Exports
function exportUsers() {
    triggerDownload(`${API_BASE}/admin/export/users`, "users_export.csv");
}
function exportLogs() {
    triggerDownload(`${API_BASE}/admin/export/logs`, "logs_export.csv");
}

async function triggerDownload(url, filename) {
    try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (res.ok) {
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    } catch (e) { }
}
