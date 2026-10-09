const express = require("express");
const router = express.Router(); // bikin "mini-app" khusus untuk auth
const pool = require("../db"); // perhatikan: '../db' karena file ini ada di dalam folder routes/
const verifikasiToken = require("../middleware");

// Tambah transaksi baru (PROTECTED)
router.post("/", verifikasiToken, async (req, res) => {
  try {
    const { tipe, jumlah, kategori, keterangan, tanggal } = req.body;

    // VERIFIKASI : tipe dan jumlah harus di ISI
    if (!tipe || !jumlah) {
      return res.status(400).json({ error: "tipe dan jumlah haris diisi" });
    }

    // VERIFIKASI : tipe transaksi harus 'masuk' atau 'keluar'
    if (tipe !== "masuk" && tipe !== "keluar") {
      return res
        .status(400)
        .json({ error: "tipe harus 'masuk' atau 'keluar'" });
    }

    // req.user.id = berisi id user yang login (dari payload token)
    // const userId = req.user.id -> ambil nilai itu, simpan ke variabel userId
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO transaksi (user_id, tipe, jumlah, kategori, keterangan, tanggal) VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE)) RETURNING *`,
      [userId, tipe, jumlah, kategori, keterangan, tanggal],
    );

    res.json({
      message: "Transaksi Berhasil ditambahlan",
      transaksi: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "gagal menambahkan transaksi" });
  }
});

// ROUTE : lihat semua transaksi (harus sudah login - PROTECTED)
router.get("/", verifikasiToken, async (req, res) => {
  try {
    const result =
      await pool.query(`SELECT transaksi.*, users.nama AS nama_user FROM transaksi
       JOIN users ON transaksi.user_id = users.id
       ORDER BY transaksi.tanggal DESC, transaksi.created_at DESC`);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data transaksi" });
  }
});

// ROUTE : laporan total pemasukan, pengeluaran, dan sisa saldo (PROTECTED) - (Bisa Filter Bulanan)
// ROUTE ini harus berada di atas /:id

router.get("/ringkasan", verifikasiToken, async (req, res) => {
  try {
    // Ambil parameter bulan dan tahun dari URL (misal: /transaksi/ringkasan?bulan=10&tahun=2026)
    const { bulan, tahun } = req.query;

    let queryText = `
      SELECT COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END), 0) AS total_masuk,
      COALESCE(SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END), 0) AS total_keluar
      FROM transaksi
      `;

    const params = [];

    // Jika user memberikan query bulan DAN tahun, tambahkan klausa WHERE
    if (bulan && tahun) {
      queryText += ` WHERE EXTRACT(MONTH FROM tanggal) = $1 AND EXTRACT(YEAR FROM tanggal) = $2`;
      params.push(parseInt(bulan), parseInt(tahun));
    }

    const result = await pool.query(queryText, params);

    // Jika user memberikan query bulan DAN tahun, tambahkan klausa WHERE
    if (bulan && tahun) {
      queryText += ` WHERE EXTRACT(MONTH FROM tanggal) = $1 AND EXTRACT(YEAR FROM tanggal) = $2`;
      params.push(parseInt(bulan), parseInt(tahun));
    }

    const totalMasuk = parseFloat(result.rows[0].total_masuk);
    const totalKeluar = parseFloat(result.rows[0].total_keluar);
    const saldo = totalMasuk - totalKeluar;

    res.json({
      priode:
        bulan && tahun
          ? { bulan: parseInt(bulan), tahun: parseInt(tahun) }
          : "semua",
      Total_Pemasukan: totalMasuk,
      Total_Pengeluaran: totalKeluar,
      Saldo: saldo,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "gagal mengambil ringkasan" });
  }
});

// ROUTE : edit transaksi - hanya bisa oleh user yang menginput
router.put("/:id", verifikasiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipe, jumlah, kategori, keterangan, tanggal } = req.body;

    // VALIDASI : tipe || jumlah wajib di isi
    if (!tipe || !jumlah) {
      return res.status(400).json({ error: "tipe dan jumlah haris di isi!!!" });
    }

    // VALIDASI : tipe harus 'masuk' atau 'keluar'
    if (tipe !== "masuk" && tipe !== "keluar") {
      return res
        .status(400)
        .json({ error: "Tipe harus 'masuk' atau 'keluar'" });
    }

    const cekTransaksi = await pool.query(
      `SELECT * FROM transaksi WHERE id = $1`,
      [id],
    );

    // VALIDASI : apakah transaksi ada
    if (cekTransaksi.rows.length === 0) {
      return res.status(404).json({ error: "Transaksi tidak ditemukan" });
    }

    // VALIDASI : apakah id_user transaksi tersebut sama dengan id_user yang login
    // USER TIDAK DAPAT MELAKUKAN EDIT TRANSAKSI ORANG LAIN
    if (cekTransaksi.rows[0].user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Kamu tidak bisa mengedit transaksi milik orang lain" });
    }
    // LOLOS VALIDASI

    // UPDATE TRANSAKSI
    const result = await pool.query(
      `UPDATE transaksi SET tipe = $1, jumlah = $2, kategori = $3, keterangan = $4, tanggal =  COALESCE($5, tanggal) WHERE id = $6 RETURNING *`,
      [tipe, jumlah, kategori, keterangan, tanggal, id],
    );

    res.json({
      message: "Transaksi berhasil di UPDATE",
      transaksi: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "gagal mengupdate transaksi" });
  }
});

// ROUTER : hapus transaksi (PROTECTED)
router.delete("/:id", verifikasiToken, async (req, res) => {
  try {
    const { id } = req.params;

    const cekTransaksi = await pool.query(
      `SELECT * FROM transaksi WHERE id = $1`,
      [id],
    );

    // VALIDASI : apakah transaksi ada
    if (cekTransaksi.rows.length === 0) {
      return res.status(404).json({ error: "Transaksi tidak ditemukan" });
    }

    // VALIDASI : apakah id_user transaksi tersebut sama dengan id_user yang login
    // USER TIDAK DAPAT MELAKUKAN HAPUS TRANSAKSI ORANG LAIN
    if (cekTransaksi.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        error: "Kamu tidak bisa mengHAPUS transaksi milik orang lain",
      });
    }

    const result = await pool.query(
      `DELETE FROM transaksi WHERE id = $1 RETURNING *`,
      [id],
    );

    res.json({
      message: "transaksi berhasil dihapus!!!",
      transaksi: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "gagal mengupdate transaksi" });
  }
});

// ROUTE : Rekap total pengeluaran per kategori (Bisa filter bulanan)
router.get("/kategori", verifikasiToken, async (req, res) => {
  try {
    const { bulan, tahun } = req.query;

    let queryText = `
      SELECT 
        kategori, 
        SUM(jumlah) AS total
      FROM transaksi
      WHERE tipe = 'keluar'
    `;
    const params = [];

    if (bulan && tahun) {
      queryText += ` AND EXTRACT(MONTH FROM tanggal) = $1 AND EXTRACT(YEAR FROM tanggal) = $2`;
      params.push(parseInt(bulan), parseInt(tahun));
    }

    queryText += ` GROUP BY kategori ORDER BY total DESC`;

    const result = await pool.query(queryText, params);

    res.json({
      periode:
        bulan && tahun
          ? { bulan: parseInt(bulan), tahun: parseInt(tahun) }
          : "semua",
      rekap_kategori: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil rekap kategori" });
  }
});

// ROUTE : Rekap kontribusi pencatatan (Suami vs Istri)
router.get("/kontribusi", verifikasiToken, async (req, res) => {
  try {
    const { bulan, tahun } = req.query;

    let queryText = `
      SELECT 
        users.nama AS nama_user,
        COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END), 0) AS total_pemasukan,
        COALESCE(SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END), 0) AS total_pengeluaran
      FROM transaksi
      JOIN users ON transaksi.user_id = users.id
    `;
    const params = [];

    if (bulan && tahun) {
      queryText += ` WHERE EXTRACT(MONTH FROM tanggal) = $1 AND EXTRACT(YEAR FROM tanggal) = $2`;
      params.push(parseInt(bulan), parseInt(tahun));
    }

    queryText += ` GROUP BY users.id, users.nama`;

    const result = await pool.query(queryText, params);

    res.json({
      periode:
        bulan && tahun
          ? { bulan: parseInt(bulan), tahun: parseInt(tahun) }
          : "semua",
      kontribusi: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data kontribusi" });
  }
});

module.exports = router;
