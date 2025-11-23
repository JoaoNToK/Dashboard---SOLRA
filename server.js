const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Configuração do SQLite
const DB_PATH = path.join(__dirname, "doacoes.db");
let db;

// Inicializar banco de dados
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("❌ Erro ao conectar com SQLite:", err.message);
        reject(err);
        return;
      }
      console.log("✅ Conectado ao banco SQLite.");

      // Criar tabela
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS alimentodoacao (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          quantidade INTEGER NOT NULL CHECK (quantidade > 0),
          data_vencimento TEXT NOT NULL,
          local_doacao TEXT,
          status TEXT DEFAULT 'disponível' CHECK (status IN ('disponível', 'doado', 'vencido', 'reservado')),
          email_doador TEXT,
          data_cadastro TEXT DEFAULT (datetime('now', 'localtime'))
        )
      `;

      db.run(createTableQuery, (err) => {
        if (err) {
          console.error("❌ Erro ao criar tabela:", err.message);
          reject(err);
          return;
        }
        console.log("✅ Tabela alimentodoacao verificada/criada com sucesso.");
        resolve();
      });
    });
  });
}

// Helper para executar queries
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Rotas da API

// GET /alimentos - Listar todos os alimentos
app.get("/api/alimentos", async (req, res) => {
  try {
    const rows = await dbAll(
      "SELECT * FROM alimentodoacao ORDER BY data_cadastro DESC"
    );
    console.log("📦 GET /api/alimentos - Retornando", rows.length, "alimentos");
    res.json(rows);
  } catch (err) {
    console.error("❌ Erro GET /api/alimentos:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /alimentos - Cadastrar novo alimento
app.post("/api/alimentos", async (req, res) => {
  const { nome, quantidade, data_vencimento, local_doacao, email_doador } =
    req.body;

  console.log("📝 POST /api/alimentos - Dados recebidos:", req.body);

  // Validações
  if (!nome || !quantidade || !data_vencimento || !local_doacao) {
    return res
      .status(400)
      .json({ error: "Todos os campos obrigatórios devem ser preenchidos" });
  }

  if (quantidade <= 0) {
    return res
      .status(400)
      .json({ error: "Quantidade deve ser maior que zero" });
  }

  try {
    const result = await dbRun(
      "INSERT INTO alimentodoacao (nome, quantidade, data_vencimento, local_doacao, email_doador) VALUES (?, ?, ?, ?, ?)",
      [nome, quantidade, data_vencimento, local_doacao, email_doador || null]
    );

    // Buscar o registro inserido
    const newFood = await dbGet("SELECT * FROM alimentodoacao WHERE id = ?", [
      result.id,
    ]);

    console.log("✅ Alimento cadastrado com ID:", result.id);
    res.status(201).json(newFood);
  } catch (err) {
    console.error("❌ Erro POST /api/alimentos:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /alimentos/:id - Atualizar alimento (ex: reservar)
app.put("/api/alimentos/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  console.log(`🔄 PUT /api/alimentos/${id} - Status: ${status}`);

  const statusValidos = ["disponível", "reservado", "doado", "vencido"];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  try {
    const result = await dbRun(
      "UPDATE alimentodoacao SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Alimento não encontrado" });
    }

    // Buscar o registro atualizado
    const updatedFood = await dbGet(
      "SELECT * FROM alimentodoacao WHERE id = ?",
      [id]
    );

    // Simulação de notificação por e-mail quando um alimento é reservado
    if (status === "reservado" && updatedFood.email_doador) {
      console.log(`📧 Notificação enviada para: ${updatedFood.email_doador}`);
      console.log(`✅ Seu item "${updatedFood.nome}" foi reservado!`);
    }

    res.json(updatedFood);
  } catch (err) {
    console.error("❌ Erro PUT /api/alimentos:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /alimentos/:id - Remover alimento
app.delete("/api/alimentos/:id", async (req, res) => {
  const { id } = req.params;

  console.log(`🗑️ DELETE /api/alimentos/${id}`);

  try {
    // Primeiro buscar o registro para retorná-lo
    const food = await dbGet("SELECT * FROM alimentodoacao WHERE id = ?", [id]);

    if (!food) {
      return res.status(404).json({ error: "Alimento não encontrado" });
    }

    await dbRun("DELETE FROM alimentodoacao WHERE id = ?", [id]);

    res.json({ message: "Alimento removido com sucesso", alimento: food });
  } catch (err) {
    console.error("❌ Erro DELETE /api/alimentos:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Rota para popular dados de exemplo
app.post("/api/popular-exemplos", async (req, res) => {
  console.log("🎲 Popular exemplos solicitado");

  try {
    const sampleData = [
      [
        "Arroz Integral 1kg",
        5,
        "2024-12-31",
        "Centro Comunitário Central",
        "disponível",
        "doador1@exemplo.com",
      ],
      [
        "Feijão Carioca 1kg",
        8,
        "2024-11-15",
        "Igreja São José",
        "disponível",
        "doador2@exemplo.com",
      ],
      ["Leite UHT 1L", 6, "2024-10-05", "Escola Municipal", "disponível", null],
      [
        "Óleo de Soja 900ml",
        10,
        "2025-01-20",
        "Mercado Local",
        "reservado",
        "doador3@exemplo.com",
      ],
      [
        "Açúcar Refinado 1kg",
        4,
        "2025-03-15",
        "Centro Comunitário Central",
        "disponível",
        null,
      ],
    ];

    let inserted = 0;
    for (const data of sampleData) {
      await dbRun(
        "INSERT INTO alimentodoacao (nome, quantidade, data_vencimento, local_doacao, status, email_doador) VALUES (?, ?, ?, ?, ?, ?)",
        data
      );
      inserted++;
    }

    console.log(`✅ ${inserted} exemplos inseridos com sucesso!`);
    res.json({ message: `${inserted} exemplos inseridos com sucesso!` });
  } catch (err) {
    console.error("❌ Erro ao popular exemplos:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Rota para servir o front-end
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Rota para servir outras páginas do front-end
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", req.path));
});

// Inicializar servidor
async function startServer() {
  try {
    await initDatabase();

    // Verificar se já existem dados
    const count = await dbGet("SELECT COUNT(*) as count FROM alimentodoacao");
    console.log(`📊 Banco inicializado com ${count.count} registros`);

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Acesse: http://localhost:${PORT}`);
      console.log(
        `🔗 API disponível em: http://localhost:${PORT}/api/alimentos`
      );
      console.log(`💾 Banco de dados: ${DB_PATH}`);
    });
  } catch (err) {
    console.error("❌ Falha ao iniciar servidor:", err);
    process.exit(1);
  }
}

// Iniciar o servidor
startServer();
