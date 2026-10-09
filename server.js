const express = require("express");
const cors = require("cors"); // 1. Tambahkan corscd
const app = express();
const verifikasiToken = require("./middleware");

// Import router dari masing-masing file di folder routes/
const authRoutes = require("./routes/auth");
const transaksiRoutes = require("./routes/transaksi");
const hutangRoutes = require("./routes/hutang");

// 2. Gunakan middleware CORS agar Vite (port 5173) bisa berkomunikasi dengan Express (port 3000)
app.use(cors());

// Middleware baca JSON dari request body
app.use(express.json());

// Middleware sajikan file frontend (HTML) dari folder "public"
// Contoh: public/login.html bisa dibuka di http://localhost:3000/login.html
// app.use(express.static("public"));

// ROUTE : test server
app.get("/", (req, res) => {
  res.send("Hello Joni, Server is running!");
});

// Sambungkan router ke app, lengkap dengan awalan path-nya
app.use("/", authRoutes); // register , login

// Sambungkan router ke fitur transaksi
app.use("/transaksi", transaksiRoutes);

// Sambungkan route hutang ke app
app.use("/hutang", hutangRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
