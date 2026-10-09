const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifikasiToken = require("../middleware");

// ROUTE: Tambah hutang baru (PROTECTED)
router.post("/", verifikasiToken, async (req, res) => {
  try {
    const { pemberi_hutang, jumlah_hutang, jatuh_tempo, keterangan } = req.body;

    if (!pemberi_hutang || !jumlah_hutang) {
      return res
        .status(400)
        .json({ error: "Pemberi hutang dan jumlah hutang wajib diisi" });
    }

    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO hutang (user_id, pemberi_hutang, jumlah_hutang, jatuh_tempo, keterangan)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, pemberi_hutang, jumlah_hutang, jatuh_tempo, keterangan],
    );

    res.status(201).json({
      message: "Hutang berhasil dicatat",
      hutang: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mencatat hutang" });
  }
});

// ROUTE: Lihat semua hutang (PROTECTED)
router.get("/", verifikasiToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT hutang.*, users.nama as nama_user
       FROM hutang
       JOIN users ON hutang.user_id = users.id
       ORDER BY hutang.status ASC, hutang.jatuh_tempo ASC NULLS LAST`,
    );

    // jika data hutang kosong (panjang array = 0)
    if (result.rows.length === 0) {
      return res.json({
        message: "SELEMAT ANDA TIDAK PUNYA HUTANG",
        data: [],
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data hutang" });
  }
});

// ROUTE: Bayar/cicil hutang (PROTECTED)
router.put("/:id/bayar", verifikasiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { jumlah_bayar } = req.body;

    if (!jumlah_bayar || jumlah_bayar <= 0) {
      return res.status(400).json({ error: "Jumlah bayar harus lebih dari 0" });
    }

    const cekHutang = await pool.query("SELECT * FROM hutang WHERE id = $1", [
      id,
    ]);

    if (cekHutang.rows.length === 0) {
      return res.status(404).json({ error: "Hutang tidak ditemukan" });
    }

    const hutang = cekHutang.rows[0];
    const terbayarBaru =
      parseFloat(hutang.jumlah_terbayar) + parseFloat(jumlah_bayar);
    const statusBaru =
      terbayarBaru >= parseFloat(hutang.jumlah_hutang)
        ? "lunas"
        : "belum_lunas";

    const result = await pool.query(
      `UPDATE hutang SET jumlah_terbayar = $1, status = $2 WHERE id = $3 RETURNING *`,
      [terbayarBaru, statusBaru, id],
    );

    res.json({
      message: "Pembayaran berhasil dicatat",
      hutang: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mencatat pembayaran" });
  }
});

module.exports = router;
