import "./style.css"; // Wajib di-import agar Tailwind v4 aktif

// const API_URL = "http://localhost:3000";

// Gantilah URL localhost ini nanti dengan URL backend Express kamu dari Render
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

// 1. Cek Token: Jika tidak ada token JWT, tendang balik ke login
if (!token || !user) {
  window.location.href = "/index.html";
}

// Tampilkan Nama Pengguna di Header
document.getElementById("nama-user").textContent =
  "Halo, " + (user.nama || user.username);

// Helper Format Rupiah
function formatRupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

// Helper Fetch dengan Token JWT di Header
async function apiFetch(path, options = {}) {
  try {
    const response = await fetch(API_URL + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = "/index.html";
      return null;
    }

    return response;
  } catch (err) {
    console.error("API Error:", err);
    return null;
  }
}

// 2. Ambil Data Ringkasan Saldo
async function muatRingkasan() {
  const res = await apiFetch("/transaksi/ringkasan");
  if (!res) return;
  const data = await res.json();

  document.getElementById("total-masuk").textContent = formatRupiah(
    data.total_masuk || data.Total_Pemasukan,
  );
  document.getElementById("total-keluar").textContent = formatRupiah(
    data.total_keluar || data.Total_Pengeluaran,
  );
  document.getElementById("saldo").textContent = formatRupiah(
    data.saldo || data.Saldo,
  );
}

// 3. Ambil dan Tampilkan Daftar Transaksi
async function muatTransaksi() {
  const res = await apiFetch("/transaksi");
  if (!res) return;
  const data = await res.json();

  const container = document.getElementById("daftar-transaksi");

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML =
      '<div class="text-center text-xs text-slate-400 py-6">Belum ada data transaksi.</div>';
    return;
  }

  container.innerHTML = data
    .map((t) => {
      const isMasuk = t.tipe === "masuk";
      const tgl = new Date(t.tanggal).toLocaleDateString("id-ID");

      return `
      <div class="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
        <div>
          <p class="text-xs font-semibold text-slate-800">${t.keterangan || t.kategori || "(Tanpa keterangan)"}</p>
          <p class="text-[10px] text-slate-400 mt-0.5">${t.kategori || "-"} • ${tgl}</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-bold ${isMasuk ? "text-emerald-600" : "text-red-600"}">
            ${isMasuk ? "+" : "-"} ${formatRupiah(t.jumlah)}
          </p>
          <button data-id="${t.id}" class="btn-hapus text-[10px] text-slate-400 hover:text-red-500 underline mt-0.5 cursor-pointer">
            Hapus
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  // Pasang event handler untuk tombol hapus
  document.querySelectorAll(".btn-hapus").forEach((btn) => {
    btn.addEventListener("click", () => hapusTransaksi(btn.dataset.id));
  });
}

// 4. Tambah Transaksi Baru
document
  .getElementById("form-transaksi")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const tipe = document.getElementById("input-tipe").value;
    const jumlah = document.getElementById("input-jumlah").value;
    const kategori = document.getElementById("input-kategori").value;
    const keterangan = document.getElementById("input-keterangan").value;

    const res = await apiFetch("/transaksi", {
      method: "POST",
      body: JSON.stringify({ tipe, jumlah, kategori, keterangan }),
    });

    if (res && res.ok) {
      document.getElementById("form-transaksi").reset();
      muatRingkasan();
      muatTransaksi();
    } else if (res) {
      const errData = await res.json();
      alert(errData.error || "Gagal menambah transaksi");
    }
  });

// 5. Hapus Transaksi
async function hapusTransaksi(id) {
  if (!confirm("Yakin ingin menghapus transaksi ini?")) return;

  const res = await apiFetch("/transaksi/" + id, { method: "DELETE" });
  if (res && res.ok) {
    muatRingkasan();
    muatTransaksi();
  }
}

// 6. Logout
document.getElementById("btn-logout").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/index.html";
});

// Jalankan saat halaman dibuka
muatRingkasan();
muatTransaksi();
