// Mengimpor library jsonwebtoken - INI YANG TADI TERLEWAT
const jwt = require("jsonwebtoken");

// Middelware : mengecek apakah request punya token valid
function verifikasiToken(req, res, next) {
  // ambil Header dari "Authorization" dari request
  const authHeader = req.headers["authorization"];

  // jika tidak ada headers sama sekali tolak akses
  if (!authHeader) {
    return res
      .status(401)
      .json({ error: "Token tidak ditemukan, silahkan login dulu!" });
  }
  // Header biasanya berformat: "Bearer <token>"
  //   .split(' ') memecah string itu berdasarkan spasi, menghasilkan array:
  //   ["Bearer", "eyJhbGc..."]
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Format token tidak valid" });
  }

  try {
    // Verifikasi token menggunakan secret key yang sama waktu bikin token
    // Kalau token valid (tidak dipalsukan & belum expired), akan return isinya (payload)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // simpan data user (dari payload token) ke req, supaya bisa dipakai di route selanjutnya
    req.user = decoded;

    // next() artinya izinkan ke route yang dituju
    next();
  } catch (err) {
    // Kalau token tidak valid (dipalsukan, salah, atau sudah kadaluarsa)
    return res
      .status(401)
      .json({ error: "Token tidak valid atau sudah kadaluarsa" });
  }
}

module.exports = verifikasiToken;
