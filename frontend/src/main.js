import "./style.css";

// const API_URL = "http://localhost:3000";

// Gantilah URL localhost ini nanti dengan URL backend Express kamu dari Render
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const formAuth = document.getElementById("form-auth");
const groupNama = document.getElementById("group-nama");
const inputNama = document.getElementById("input-nama");
const inputUsername = document.getElementById("input-username");
const inputPassword = document.getElementById("input-password");

const judul = document.getElementById("judul");
const subjudul = document.getElementById("subjudul");
const btnSubmit = document.getElementById("btn-submit");
const btnToggle = document.getElementById("btn-toggle");
const textToggle = document.getElementById("text-toggle");
const pesanEl = document.getElementById("pesan");

let isLoginMode = true;

function tampilkanPesan(teks, isError) {
  pesanEl.textContent = teks;
  pesanEl.className = `p-3 rounded-xl text-xs mb-4 ${isError ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`;
}

function sembunyikanPesan() {
  pesanEl.className = "hidden";
  pesanEl.textContent = "";
}

// Switch Mode Login <-> Register
btnToggle.addEventListener("click", () => {
  isLoginMode = !isLoginMode;
  sembunyikanPesan();
  formAuth.reset();

  if (isLoginMode) {
    judul.textContent = "Masuk";
    subjudul.textContent = "Akses catatan keuangan kamu";
    btnSubmit.textContent = "Masuk";
    textToggle.textContent = "Belum punya akun?";
    btnToggle.textContent = "Daftar di sini";
    groupNama.classList.add("hidden");
    inputNama.removeAttribute("required");
  } else {
    judul.textContent = "Daftar";
    subjudul.textContent = "Buat akun baru kamu";
    btnSubmit.textContent = "Daftar";
    textToggle.textContent = "Sudah punya akun?";
    btnToggle.textContent = "Masuk di sini";
    groupNama.classList.remove("hidden");
    inputNama.setAttribute("required", "true");
  }
});

// Fetch API ke Backend Express
formAuth.addEventListener("submit", async (e) => {
  e.preventDefault();
  sembunyikanPesan();

  const username = inputUsername.value.trim();
  const password = inputPassword.value.trim();
  const nama = inputNama.value.trim();

  const endpoint = isLoginMode ? `${API_URL}/login` : `${API_URL}/register`;
  const payload = isLoginMode
    ? { username, password }
    : { nama, username, password };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      tampilkanPesan(data.error || "Terjadi kesalahan", true);
      return;
    }

    if (isLoginMode) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard.html";
    } else {
      tampilkanPesan("Registrasi berhasil! Silakan masuk.", false);
      btnToggle.click();
    }
  } catch (err) {
    tampilkanPesan("Gagal terhubung ke server Express.", true);
  }
});
