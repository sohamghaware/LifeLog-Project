const API_BASE = "http://localhost:5000/api";

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

