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
    const [rows] = await db.query("SELECT equipamento_id, descricao, valor_diaria, especificacoes FROM material.tbEquipamento");
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* CADASTRAR EQUIPAMENTO */
app.post("/equipamentos", async (req, res) => {
  try {
    const { descricao, valor_diaria, setor_id } = req.body;
    const [result] = await db.query(
      "INSERT INTO material.tbEquipamento (descricao, valor_diaria, setor_id) VALUES (?, ?, ?)",
      [descricao, valor_diaria, setor_id || null]
    );
    res.json({ mensagem: "Equipamento cadastrado", insertId: result.insertId });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* EDITAR EQUIPAMENTO */
app.put("/equipamentos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor_diaria, especificacoes } = req.body;
    await db.query(
      "UPDATE material.tbEquipamento SET descricao=?, valor_diaria=?, especificacoes=? WHERE equipamento_id=?",
      [descricao, valor_diaria, especificacoes || null, id]
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

/* DASHBOARD */
app.get("/dashboard", async (req, res) => {
  try {
    const [[{ totalUsuarios }]]    = await db.query("SELECT COUNT(*) AS totalUsuarios FROM seguranca.tbUsuarios");
    const [[{ totalEquipamentos }]]= await db.query("SELECT COUNT(*) AS totalEquipamentos FROM material.tbEquipamento");
    const [[{ totalManutencoes }]] = await db.query("SELECT COUNT(*) AS totalManutencoes FROM manutencao.tbHistorico");
    const [[{ emEspera }]]         = await db.query("SELECT COUNT(*) AS emEspera FROM manutencao.tbHistorico WHERE status='Em Espera'");
    const [[{ emAndamento }]]      = await db.query("SELECT COUNT(*) AS emAndamento FROM manutencao.tbHistorico WHERE status='Em Andamento'");
    const [[{ finalizados }]]      = await db.query("SELECT COUNT(*) AS finalizados FROM manutencao.tbHistorico WHERE status='Finalizado'");
    const [recentes]               = await db.query(`
      SELECT h.historico_id, h.data, h.status, h.valor,
             e.descricao AS equipamento
      FROM manutencao.tbHistorico h
      LEFT JOIN material.tbEquipamento e ON h.equipamento_id = e.equipamento_id
      ORDER BY h.data DESC LIMIT 5
    `);
    res.json({ totalUsuarios: totalUsuarios + 1, totalEquipamentos, totalManutencoes, emEspera, emAndamento, finalizados, recentes });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* LISTAR HISTÓRICO */
app.get("/manutencoes", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT h.historico_id, h.data, h.laudo, h.valor, h.equipamento_id, h.status,
             e.descricao AS equipamento,
             s.descricao AS servico
      FROM manutencao.tbHistorico h
      LEFT JOIN material.tbEquipamento e ON h.equipamento_id = e.equipamento_id
      LEFT JOIN tbServicos s ON h.servico_id = s.servico_id
      ORDER BY h.data DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* CADASTRAR MANUTENÇÃO */
app.post("/manutencoes", async (req, res) => {
  try {
    const { data, laudo, servico_id, equipamento_id, valor, status } = req.body;
    await db.query(
      "INSERT INTO manutencao.tbHistorico (data, laudo, servico_id, equipamento_id, valor, status) VALUES (?, ?, ?, ?, ?, ?)",
      [data, laudo, servico_id, equipamento_id, valor, status || 'Em Espera']
    );
    res.json({ mensagem: "Manutenção registrada" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* EDITAR MANUTENÇÃO */
app.put("/manutencoes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, laudo, servico_id, equipamento_id, valor, status } = req.body;
    await db.query(
      "UPDATE manutencao.tbHistorico SET data=?, laudo=?, servico_id=?, equipamento_id=?, valor=?, status=? WHERE historico_id=?",
      [data, laudo, servico_id, equipamento_id, valor, status || 'Em Espera', id]
    );
    res.json({ mensagem: "Manutenção atualizada" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* EXCLUIR MANUTENÇÃO */
app.delete("/manutencoes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM manutencao.tbHistorico WHERE historico_id=?", [id]);
    res.json({ mensagem: "Manutenção removida" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* LISTAR SERVIÇOS */
app.get("/servicos", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM tbServicos");
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

/* CADASTRAR SERVIÇO */
app.post("/servicos", async (req, res) => {
  try {
    const { descricao, valor } = req.body;
    await db.query(
      "INSERT INTO tbServicos (descricao, valor) VALUES (?, ?)",
      [descricao, valor]
    );
    res.json({ mensagem: "Serviço cadastrado" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* EDITAR SERVIÇO */
app.put("/servicos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor } = req.body;
    await db.query(
      "UPDATE tbServicos SET descricao=?, valor=? WHERE servico_id=?",
      [descricao, valor, id]
    );
    res.json({ mensagem: "Serviço atualizado" });
  } catch (err) {
    res.status(500).json(err);
  }
});

/* EXCLUIR SERVIÇO */
app.delete("/servicos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM tbServicos WHERE servico_id=?", [id]);
    res.json({ mensagem: "Serviço removido" });
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