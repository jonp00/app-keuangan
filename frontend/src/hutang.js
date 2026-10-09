import "./style.css";

// const API_URL = "http://localhost:3000";

// Gantilah URL localhost ini nanti dengan URL backend Express kamu dari Render
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "/index.html";
}

function formatRupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

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

// 1. AMBIL DAFTAR HUTANG
async function muatHutang() {
  const res = await apiFetch("/hutang");
  if (!res) return;
  const rawData = await res.json();

  const container = document.getElementById("daftar-hutang");

  // Penanganan jika respons backend berupa object pesan (data kosong)
  const data = Array.isArray(rawData) ? rawData : rawData.data || [];

  if (data.length === 0) {
    container.innerHTML = `<div class="text-center text-xs text-emerald-600 font-semibold py-6">${rawData.message || "SELAMAT ANDA TIDAK PUNYA HUTANG 🎉"}</div>`;
    return;
  }

  container.innerHTML = data
    .map((item) => {
      const isLunas = item.status === "lunas";
      const sisaHutang =
        parseFloat(item.jumlah_hutang) - parseFloat(item.jumlah_terbayar || 0);
      const jatuhTempo = item.jatuh_tempo
        ? new Date(item.jatuh_tempo).toLocaleDateString("id-ID")
        : "-";

      return `
      <div class="p-3.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-800">${item.pemberi_hutang}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${isLunas ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}">
                ${isLunas ? "Lunas" : "Belum Lunas"}
              </span>
            </div>
            <p class="text-[10px] text-slate-400 mt-1">Jatuh Tempo: ${jatuhTempo} • ${item.keterangan || "-"}</p>
          </div>

          <div class="text-right">
            <p class="text-xs font-bold text-slate-900">Total: ${formatRupiah(item.jumlah_hutang)}</p>
            <p class="text-[10px] text-emerald-600">Terbayar: ${formatRupiah(item.jumlah_terbayar)}</p>
            <p class="text-[10px] text-red-600 font-medium">Sisa: ${formatRupiah(sisaHutang)}</p>
          </div>
        </div>

        ${
          !isLunas
            ? `
          <div class="flex gap-2 pt-2 border-t border-slate-100 items-center justify-end">
            <input type="number" id="input-bayar-${item.id}" placeholder="Jumlah Bayar" min="1" class="w-28 border border-slate-200 rounded-lg p-1 text-[10px] outline-none focus:border-slate-800">
            <button data-id="${item.id}" class="btn-bayar bg-slate-900 text-white text-[10px] px-3 py-1 rounded-lg font-medium cursor-pointer hover:bg-slate-800">
              Bayar / Cicil
            </button>
          </div>
        `
            : ""
        }
      </div>
    `;
    })
    .join("");

  // Attach Handler Bayar
  document.querySelectorAll(".btn-bayar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const inputEl = document.getElementById(`input-bayar-${id}`);
      bayarHutang(id, inputEl.value);
    });
  });
}

// 2. TAMBAH HUTANG
document.getElementById("form-hutang").addEventListener("submit", async (e) => {
  e.preventDefault();

  const pemberi_hutang = document.getElementById("input-pemberi").value;
  const jumlah_hutang = document.getElementById("input-jumlah").value;
  const jatuh_tempo =
    document.getElementById("input-jatuh-tempo").value || null;
  const keterangan = document.getElementById("input-keterangan").value;

  const res = await apiFetch("/hutang", {
    method: "POST",
    body: JSON.stringify({
      pemberi_hutang,
      jumlah_hutang,
      jatuh_tempo,
      keterangan,
    }),
  });

  if (res && res.ok) {
    document.getElementById("form-hutang").reset();
    muatHutang();
  } else if (res) {
    const errData = await res.json();
    alert(errData.error || "Gagal menyimpan hutang");
  }
});

// 3. BAYAR / CICIL HUTANG
async function bayarHutang(id, jumlah_bayar) {
  if (!jumlah_bayar || jumlah_bayar <= 0) {
    alert("Masukkan jumlah pembayaran yang valid");
    return;
  }

  const res = await apiFetch(`/hutang/${id}/bayar`, {
    method: "PUT",
    body: JSON.stringify({ jumlah_bayar }),
  });

  if (res && res.ok) {
    muatHutang();
  } else if (res) {
    const errData = await res.json();
    alert(errData.error || "Gagal mencatat pembayaran");
  }
}

// Logout Handler
document.getElementById("btn-logout").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/index.html";
});

// Load awal
muatHutang();
