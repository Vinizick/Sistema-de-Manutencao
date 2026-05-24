const path = require("path");

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

/* REDIRECIONA RAIZ PARA LOGIN */
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

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
      "SELECT * FROM seguranca.tbUsuarios WHERE login = ? AND senha = ?",
      [email, senha]  // "email" aqui é o valor digitado no campo, que é o login
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
    const [rows] = await db.query("SELECT usuario_id, nome, login FROM seguranca.tbUsuarios");
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* CADASTRAR USUÁRIO */
app.post("/usuarios", async (req, res) => {
  try {
    const { nome, login, senha } = req.body;
    await db.query(
      "INSERT INTO seguranca.tbUsuarios (nome, login, senha) VALUES (?, ?, ?)",
      [nome, login, senha]
    );
    res.json({ mensagem: "Usuário cadastrado" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* LISTAR EQUIPAMENTOS */
app.get("/equipamentos", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.equipamento_id, e.descricao, e.valor_diaria, s.descricao AS setor
      FROM material.tbEquipamento e
      LEFT JOIN tbSetor s ON e.setor_id = s.setor_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* CADASTRAR EQUIPAMENTO */
app.post("/equipamentos", async (req, res) => {
  try {
    const { descricao, valor_diaria, setor_id } = req.body;
    await db.query(
      "INSERT INTO material.tbEquipamento (descricao, valor_diaria, setor_id) VALUES (?, ?, ?)",
      [descricao, valor_diaria, setor_id || null]
    );
    res.json({ mensagem: "Equipamento cadastrado" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* EDITAR EQUIPAMENTO */
app.put("/equipamentos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor_diaria, setor_id } = req.body;
    await db.query(
      "UPDATE material.tbEquipamento SET descricao=?, valor_diaria=?, setor_id=? WHERE equipamento_id=?",
      [descricao, valor_diaria, setor_id || null, id]
    );
    res.json({ mensagem: "Equipamento atualizado" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* EXCLUIR EQUIPAMENTO */
app.delete("/equipamentos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM material.tbEquipamento WHERE equipamento_id=?", [id]);
    res.json({ mensagem: "Equipamento removido" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* LISTAR SETORES */
app.get("/setores", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tbSetor");
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});
app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM seguranca.tbUsuarios WHERE usuario_id = ?", [id]);
    res.json({ mensagem: "Usuário removido" });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Servidor rodando na porta " + (process.env.PORT || 3001));
});