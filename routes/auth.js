const express = require("express");
const router = express.Router(); // bikin "mini-app" khusus untuk auth
const pool = require("../db"); // perhatikan: '../db' karena file ini ada di dalam folder routes/
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ROUTE : Membuat user baru
router.post("/register", async (req, res) => {
  try {
    const { nama, username, password } = req.body;

    // Pastikan ketiganya berupa teks (string), supaya .trim() di bawah tidak error
    if (
      typeof nama !== "string" ||
      typeof username !== "string" ||
      typeof password !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "nama, username, password harus berupa teks" });
    }

    // trim() membuang spasi di awal dan akhir teks
    // Jadi "   " (spasi saja) berubah menjadi "" (kosong)
    const namaBersih = nama.trim();
    const usernameBersih = username.trim();

    // Username tidak boleh mengandung spasi di tengah (misal "budi santoso")
    if (/\s/.test(usernameBersih)) {
      return res
        .status(400)
        .json({ error: "Username tidak boleh mengandung spasi" });
    }

    // Validasi: setelah dibersihkan, tidak boleh kosong
    // Password tidak di-trim (spasi bisa jadi bagian password), tapi tidak boleh spasi saja
    // VALIDASI : nama, username, password HARIS DIISI!!!!
    if (!namaBersih || !usernameBersih || !password) {
      return res
        .status(400)
        .json({ error: "nama, username, password HARIS DIISI!!!!" });
    }

    // has password
    const hashedPassword = await bcrypt.hash(password, 10);

    // code INSERT untuk tambahkan data ke database
    const result = await pool.query(
      `INSERT INTO users (nama, username, password) VALUES ($1, $2, $3) RETURNING id, nama, username`,
      [namaBersih, usernameBersih, hashedPassword],
    );

    res.json({
      message: "User berhasil daftar!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("gagal mendaftar user", error);
    if (error.code === "23505") {
      return res.status(409).json({ error: "Username sudah terdaftar" });
    }
    res.status(500).json({ error: "Gagal mendaftarkan User" });
  }
});

// ROUTE : LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // VALIDASI : input data login user
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username dan Password harus diisi!!!" });
  }

  const result = await pool.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Username dan Password salah!!" });
  }

  const user = result.rows[0];
  const passwordCocok = await bcrypt.compare(password, user.password);

  if (!passwordCocok) {
    return res.status(401).json({ error: "username dan password salah!!!" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.json({
    message: "User Berhasil Login",
    token: token,
    user: { id: user.id, username: user.username },
  });
});

// Export router ini supaya bisa dipakai di server.js
module.exports = router;
