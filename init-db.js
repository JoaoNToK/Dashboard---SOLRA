const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

console.log("🗄️ Inicializando banco SQLite...");

// Remover arquivo existente (apenas para desenvolvimento)
if (fs.existsSync("./doacoes.db")) {
  fs.unlinkSync("./doacoes.db");
  console.log("🗑️  Arquivo antigo removido");
}

const db = new sqlite3.Database("./doacoes.db", (err) => {
  if (err) {
    console.error("❌ Erro ao criar banco:", err.message);
    process.exit(1);
  }
  console.log("✅ Banco SQLite criado.");
});

// Criar tabela
const createTableQuery = `
  CREATE TABLE alimentodoacao (
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
    db.close();
    process.exit(1);
  }
  console.log("✅ Tabela alimentodoacao criada.");

  // Inserir dados de exemplo
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
    [
      "Macarrão Espaguete 500g",
      12,
      "2024-09-20",
      "Igreja São José",
      "disponível",
      "doador4@exemplo.com",
    ],
    [
      "Café em Pó 500g",
      7,
      "2025-06-30",
      "Centro Comunitário Central",
      "disponível",
      null,
    ],
    [
      "Farinha de Trigo 1kg",
      9,
      "2024-08-15",
      "Mercado Local",
      "doado",
      "doador5@exemplo.com",
    ],
    [
      "Molho de Tomate 340g",
      15,
      "2024-07-10",
      "Escola Municipal",
      "disponível",
      null,
    ],
    [
      "Sal Refinado 1kg",
      20,
      "2026-01-01",
      "Centro Comunitário Central",
      "disponível",
      "doador6@exemplo.com",
    ],
  ];

  const insert = db.prepare(`INSERT INTO alimentodoacao 
    (nome, quantidade, data_vencimento, local_doacao, status, email_doador) 
    VALUES (?, ?, ?, ?, ?, ?)`);

  let inserted = 0;
  sampleData.forEach((data) => {
    insert.run(data, function (err) {
      if (err) {
        console.error("❌ Erro ao inserir dado:", err.message);
      } else {
        inserted++;
        if (inserted === sampleData.length) {
          console.log(`✅ ${inserted} registros de exemplo inseridos!`);
          insert.finalize();
          db.close();
          console.log("🎉 Banco inicializado com sucesso!");
        }
      }
    });
  });
});
