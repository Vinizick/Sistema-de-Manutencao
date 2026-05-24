require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const db      = require("./db"); // caminho corrigido

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serve os HTMLs da pasta public/

/* ADMIN */
const ADMIN = {
  email: "admin@sistema.com",
  senha: "admin123",
};

/* LOGIN */
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  // Checa admin fixo
  if (email === ADMIN.email && senha === ADMIN.senha) {
    return res.json({ ok: true, admin: true });
  }

  // Checa usuários do banco
  try {
    const [rows] = await db.query(
      "SELECT * FROM tbusuarios WHERE email = ? AND senha = ?",
      [email, senha]
    );

    if (rows.length > 0) {
      return res.json({ ok: true });
    }

    return res.status(401).json({ mensagem: "Credenciais inválidas" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* LISTAR USUÁRIOS */
app.get("/usuarios", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tbusuarios");
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* CADASTRAR USUÁRIO */
app.post("/usuarios", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    await db.query(
      "INSERT INTO tbusuarios (nome, email, senha) VALUES (?, ?, ?)",
      [nome, email, senha]
    );
    res.json({ mensagem: "Usuário cadastrado" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* EXCLUIR USUÁRIO */
app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM tbusuarios WHERE id = ?", [id]);
    res.json({ mensagem: "Usuário removido" });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Servidor rodando na porta " + (process.env.PORT || 3001));
});