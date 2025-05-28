const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const port = process.env.PORT || 8080;

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Backend aktif");
});


app.post("/register", async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const { name, email, phone, username, password, rePassword } = req.body;

    if (!name || !email || !phone || !username || !password || !rePassword) {
      return res
        .status(400)
        .json({ success: false, message: "Semua field wajib diisi!" });
    }

    if (password !== rePassword) {
      return res
        .status(400)
        .json({ success: false, message: "Password tidak cocok!" });
    }

    // Bisa tambahkan validasi panjang karakter jika perlu
    if (email.length > 100) {
      return res
        .status(400)
        .json({ success: false, message: "Email terlalu panjang!" });
    }
    if (username.length > 50) {
      return res
        .status(400)
        .json({ success: false, message: "Username terlalu panjang!" });
    }
    if (phone.length > 20) {
      return res
        .status(400)
        .json({ success: false, message: "Nomor telepon terlalu panjang!" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const sql = 
    "INSERT INTO users (nama_lengkap, email, no_hp, username, password, role) VALUES (?, ?, ?, ?, ?, ?)";


    db.query(
      sql,
      [name, email, phone, username, hashed, 'pengguna'],
      (err) => {
        if (err) {
          console.error("Database error:", err);

          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
              success: false,
              message: "Email atau username sudah digunakan!",
            });
          }

          return res
            .status(500)
            .json({ success: false, message: "Gagal mendaftar" });
        }

        res.json({ success: true, message: "Registrasi berhasil!" });
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan server" });
  }
});

app.post("/login", (req, res) => {
  const { emailOrUsername, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? OR username = ?";
  db.query(sql, [emailOrUsername, emailOrUsername], async (err, results) => {
    if (err) return res.status(500).json({ success: false });

    if (results.length === 0) {
      return res.json({ success: false, message: "User tidak ditemukan!" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.json({ success: false, message: "Password salah!" });
    }

    delete user.password;
    res.json({ success: true, message: "Login berhasil!", user });
  });
});

app.listen(port, () => {
  console.log(`Server backend berjalan di http://localhost:${port}`);
});
