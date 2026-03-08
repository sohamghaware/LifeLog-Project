const API_BASE = "https://lifelog-project.onrender.com/api";

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("loginMessage");

  msg.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.message || "Login failed";
      return;
    }

    localStorage.setItem("token", data.token);

    if (data.role === 'admin') {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (err) {
    msg.textContent = "Server error";
  }
}

async function register() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("registerMessage");

  msg.textContent = "";

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.message || "Registration failed";
      return;
    }

    msg.textContent = "Account created successfully!";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);

  } catch (err) {
    msg.textContent = "Server error";
  }
}

function goToDashboard() {
  const token = localStorage.getItem("token");

  if (token) {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = "login.html";
  }
}

async function forgotPassword() {
  const email = document.getElementById("forgotEmail").value;
  const msg = document.getElementById("forgotMessage");

  msg.textContent = "";
  msg.style.color = "var(--text-primary)";

  if (!email) {
    msg.textContent = "Please enter your email.";
    msg.style.color = "#ff5555";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/forgotpassword`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.message || "Failed to send reset link.";
      msg.style.color = "#ff5555";
      return;
    }

    msg.textContent = "Email sent! Please check your inbox.";
    msg.style.color = "var(--neon-cyan)";
  } catch (err) {
    msg.textContent = "Server error";
    msg.style.color = "#ff5555";
  }
}

async function resetPassword() {
  const newPassword = document.getElementById("newPassword").value;
  const msg = document.getElementById("resetMessage");

  msg.textContent = "";
  msg.style.color = "var(--text-primary)";

  if (!newPassword) {
    msg.textContent = "Please enter a new password.";
    msg.style.color = "#ff5555";
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    msg.textContent = "No reset token found in the URL. Please use the link from your email.";
    msg.style.color = "#ff5555";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/resetpassword/${token}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: newPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.message || "Password reset failed.";
      msg.style.color = "#ff5555";
      return;
    }

    msg.textContent = "Password reset successful! Redirecting to login...";
    msg.style.color = "var(--neon-cyan)";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);

  } catch (err) {
    msg.textContent = "Server error";
    msg.style.color = "#ff5555";
  }
}
