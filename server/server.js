const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configuração do SQLite
const db = new sqlite3.Database('./doacoes.db');

// Inicializar banco de dados
db.serialize(() => {
  // Tabela de alimentos
  db.run(`CREATE TABLE IF NOT EXISTS alimentodoacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    data_vencimento TEXT NOT NULL,
    local_doacao TEXT,
    status TEXT DEFAULT 'disponível',
    email_doador TEXT,
    data_cadastro TEXT DEFAULT (datetime('now'))
  )`);

  // Tabela de sensores
  db.run(`CREATE TABLE IF NOT EXISTS dados_sensores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temperatura REAL NOT NULL,
    umidade REAL NOT NULL,
    dispositivo TEXT,
    localizacao TEXT,
    data_leitura TEXT DEFAULT (datetime('now'))
  )`);

  console.log('✅ Banco de dados inicializado');
});

// Helper functions
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
    db.run(query, params, function(err) {
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

// ===== ROTAS DA API =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando!' });
});

// ===== ROTAS PARA ALIMENTOS =====

// GET /api/alimentos - Listar todos os alimentos
app.get('/api/alimentos', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM alimentodoacao ORDER BY data_cadastro DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alimentos - Cadastrar novo alimento
app.post('/api/alimentos', async (req, res) => {
  const { nome, quantidade, data_vencimento, local_doacao, email_doador } = req.body;
  
  console.log('📝 POST /api/alimentos - Dados recebidos:', req.body);
  
  if (!nome || !quantidade || !data_vencimento || !local_doacao) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO alimentodoacao (nome, quantidade, data_vencimento, local_doacao, email_doador) VALUES (?, ?, ?, ?, ?)',
      [nome, quantidade, data_vencimento, local_doacao, email_doador || null]
    );
    
    const newFood = await dbGet('SELECT * FROM alimentodoacao WHERE id = ?', [result.id]);
    console.log('✅ Alimento cadastrado com ID:', result.id);
    res.status(201).json(newFood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alimentos/:id - Atualizar alimento (ex: reservar)
app.put('/api/alimentos/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`🔄 PUT /api/alimentos/${id} - Status: ${status}`);
  
  const statusValidos = ['disponível', 'reservado', 'doado', 'vencido'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  try {
    const result = await dbRun(
      'UPDATE alimentodoacao SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alimento não encontrado' });
    }
    
    const updatedFood = await dbGet('SELECT * FROM alimentodoacao WHERE id = ?', [id]);
    
    // Simulação de notificação por e-mail quando um alimento é reservado
    if (status === 'reservado' && updatedFood.email_doador) {
      console.log(`📧 Notificação enviada para: ${updatedFood.email_doador}`);
      console.log(`✅ Seu item "${updatedFood.nome}" foi reservado!`);
    }
    
    res.json(updatedFood);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/alimentos/:id - Remover alimento individual
app.delete('/api/alimentos/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log(`🗑️ DELETE /api/alimentos/${id}`);
  
  try {
    const food = await dbGet('SELECT * FROM alimentodoacao WHERE id = ?', [id]);
    if (!food) {
      return res.status(404).json({ error: 'Alimento não encontrado' });
    }
    
    await dbRun('DELETE FROM alimentodoacao WHERE id = ?', [id]);
    res.json({ message: 'Alimento removido com sucesso', alimento: food });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/alimentos - Remover TODOS os alimentos (LIMPAR TUDO)
app.delete('/api/alimentos', async (req, res) => {
  console.log('🧹 DELETE /api/alimentos - Limpando TODOS os alimentos');
  
  try {
    await dbRun('DELETE FROM alimentodoacao');
    res.json({ message: 'Todos os alimentos foram removidos com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/popular-exemplos - Popular com dados de exemplo
app.post('/api/popular-exemplos', async (req, res) => {
  console.log('🎲 POST /api/popular-exemplos - Populando com exemplos');
  
  try {
    const sampleData = [
      ['Arroz Integral 1kg', 5, '2024-12-31', 'Centro Comunitário Central', 'disponível', 'doador1@exemplo.com'],
      ['Feijão Carioca 1kg', 8, '2024-11-15', 'Igreja São José', 'disponível', 'doador2@exemplo.com'],
      ['Leite UHT 1L', 6, '2024-10-05', 'Escola Municipal', 'disponível', null],
      ['Óleo de Soja 900ml', 10, '2025-01-20', 'Mercado Local', 'reservado', 'doador3@exemplo.com'],
      ['Açúcar Refinado 1kg', 4, '2025-03-15', 'Centro Comunitário Central', 'disponível', null]
    ];

    for (const data of sampleData) {
      await dbRun(
        'INSERT INTO alimentodoacao (nome, quantidade, data_vencimento, local_doacao, status, email_doador) VALUES (?, ?, ?, ?, ?, ?)',
        data
      );
    }
    
    console.log('✅ 5 exemplos inseridos com sucesso!');
    res.json({ message: '5 alimentos de exemplo inseridos com sucesso!' });
  } catch (err) {
    console.error('❌ Erro ao popular exemplos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== ROTAS PARA SENSORES =====

// POST /api/sensores - Receber dados do sensor (ESP32)
app.post('/api/sensores', async (req, res) => {
  const { temperatura, umidade, dispositivo, localizacao } = req.body;
  
  console.log('🌡️ POST /api/sensores - Dados recebidos:', req.body);
  
  if (temperatura === undefined || umidade === undefined) {
    return res.status(400).json({ error: 'Dados de temperatura e umidade são obrigatórios' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO dados_sensores (temperatura, umidade, dispositivo, localizacao) VALUES (?, ?, ?, ?)',
      [temperatura, umidade, dispositivo || 'ESP32-Desconhecido', localizacao || 'Local não informado']
    );
    
    console.log('✅ Dados do sensor salvos com ID:', result.id);
    res.status(201).json({ 
      message: 'Dados recebidos com sucesso',
      id: result.id
    });
  } catch (err) {
    console.error('❌ Erro ao salvar dados do sensor:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensores - Obter os dados mais recentes do sensor
app.get('/api/sensores', async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM dados_sensores ORDER BY data_leitura DESC LIMIT 1');
    if (!row) {
      return res.status(404).json({ error: 'Nenhum dado de sensor encontrado' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensores/historico - Obter histórico de dados
app.get('/api/sensores/historico', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const rows = await dbAll(
      'SELECT * FROM dados_sensores ORDER BY data_leitura DESC LIMIT ?',
      [limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensores/estatisticas - Estatísticas dos sensores
app.get('/api/sensores/estatisticas', async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total_leitura,
        AVG(temperatura) as temperatura_media,
        AVG(umidade) as umidade_media,
        MAX(temperatura) as temperatura_max,
        MIN(temperatura) as temperatura_min,
        MAX(umidade) as umidade_max,
        MIN(umidade) as umidade_min,
        MAX(data_leitura) as ultima_leitura
      FROM dados_sensores
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🌐 Acesso pela rede: http://192.168.0.8:${PORT}`);
  console.log('─────────────────────────────────────');
  console.log('✅ Todas as rotas da API disponíveis:');
  console.log('   GET    /api/alimentos');
  console.log('   POST   /api/alimentos');
  console.log('   PUT    /api/alimentos/:id');
  console.log('   DELETE /api/alimentos/:id');
  console.log('   DELETE /api/alimentos (limpar tudo)');
  console.log('   POST   /api/popular-exemplos');
  console.log('   POST   /api/sensores');
  console.log('   GET    /api/sensores');
  console.log('─────────────────────────────────────');
});

// Fechar banco ao encerrar
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('❌ Erro ao fechar banco:', err.message);
    } else {
      console.log('✅ Conexão com o banco fechada.');
    }
    process.exit(0);
  });
});
