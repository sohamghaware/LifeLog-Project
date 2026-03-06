// frontend/js/profile.js
const API_URL = "https://lifelog-project.onrender.com/api";
let currentAvatar = "";

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    fetchProfile();
});

// Dropdown logic for all authenticated pages
function toggleDropdown() {
    const dMenu = document.getElementById("dropdownMenu");
    if (dMenu) {
        dMenu.style.display = dMenu.style.display === "block" ? "none" : "block";
    }
}

// Close dropdown if clicking outside
window.onclick = function (event) {
    if (!event.target.matches('.profile-avatar')) {
        const dMenu = document.getElementById("dropdownMenu");
        if (dMenu && dMenu.style.display === "block") {
            dMenu.style.display = "none";
        }
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

async function fetchProfile() {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/user/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const user = await res.json();
            document.getElementById("profileName").value = user.name;
            document.getElementById("profileEmail").value = user.email;

            const defaultPic = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0f0f13&color=00f2fe`;
            currentAvatar = user.avatar || defaultPic;

            document.getElementById("profilePreview").src = currentAvatar;
            const navAvatar = document.getElementById("navAvatar");
            if (navAvatar) navAvatar.src = currentAvatar;
        } else {
            console.error("Failed to load profile");
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
    }
}

// Convert chosen file to Base64
document.getElementById('avatarInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            currentAvatar = event.target.result;
            document.getElementById("profilePreview").src = currentAvatar;
        };
        reader.readAsDataURL(file);
    }
});

async function saveProfile() {
    const name = document.getElementById("profileName").value;
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const msgEl = document.getElementById("profileMessage");

    if (newPassword !== "" || currentPassword !== "") {
        if (newPassword !== confirmPassword) {
            msgEl.textContent = "New passwords do not match.";
            msgEl.style.color = "#ff5555";
            return;
        }
        if (currentPassword === "") {
            msgEl.textContent = "Please enter your current password to change it.";
            msgEl.style.color = "#ff5555";
            return;
        }
        if (newPassword === "") {
            msgEl.textContent = "Please enter a new password.";
            msgEl.style.color = "#ff5555";
            return;
        }
    }

    msgEl.textContent = "Saving...";
    msgEl.style.color = "var(--neon-cyan)";

    const payload = {
        name,
        avatar: currentAvatar
    };

    if (newPassword.trim() !== "") {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
    }

    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/user/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            msgEl.textContent = "Profile updated successfully!";
            msgEl.style.color = "#00ffaa";

            // Update localstorage user if stored
            localStorage.setItem("user", JSON.stringify(data));

            // Re-render navbar
            const navAvatar = document.getElementById("navAvatar");
            if (navAvatar) navAvatar.src = currentAvatar;

            document.getElementById("currentPassword").value = "";
            document.getElementById("newPassword").value = "";
            document.getElementById("confirmPassword").value = "";

            setTimeout(() => { msgEl.textContent = ""; }, 3000);
        } else {
            const errData = await res.json();
            msgEl.textContent = errData.message || "Failed to update profile";
            msgEl.style.color = "#ff5555";
        }
    } catch (err) {
        msgEl.textContent = "Server connection error.";
        msgEl.style.color = "#ff5555";
        console.error(err);
    }
}
