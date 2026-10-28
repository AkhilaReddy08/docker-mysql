const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "rootpass",
  database: process.env.DB_NAME || "appdb",
  waitForConnections: true,
  connectionLimit: 10
});

// Health
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: err.message });
  }
});

// Users
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users ORDER BY id");
    res.json({ users: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/users", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: "name and email required" });
  try {
    const [r] = await db.query("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
    res.status(201).json({ id: r.insertId, name, email });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: err.message });
  }
});

// Posts
app.get("/api/posts", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.title, p.body, p.created_at,
             u.id AS user_id, u.name AS author, u.email
      FROM posts p JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);
    res.json({ posts: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/posts", async (req, res) => {
  const { user_id, title, body } = req.body;
  if (!user_id || !title) return res.status(400).json({ error: "user_id and title required" });
  try {
    const [r] = await db.query(
      "INSERT INTO posts (user_id, title, body) VALUES (?, ?, ?)",
      [user_id, title, body || null]
    );
    res.status(201).json({ id: r.insertId, user_id, title, body });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/posts/:id", async (req, res) => {
  try {
    const [r] = await db.query("DELETE FROM posts WHERE id = ?", [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: "Post not found" });
    res.json({ message: "Post deleted", id: Number(req.params.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🐬 MySQL App running on http://localhost:${PORT}`);
});
