// Configuração da API
const API_BASE = window.location.origin + '/api';

// Elementos do DOM
const foodForm = document.getElementById('foodForm');
const foodList = document.getElementById('foodList');
const filterSelect = document.getElementById('filter');
const deleteAllBtn = document.getElementById('deleteAll');
const seedBtn = document.getElementById('seed');

// Elementos de estatísticas
const totalAlimentosEl = document.getElementById('totalAlimentos');
const alimentosDisponiveisEl = document.getElementById('alimentosDisponiveis');
const alimentosProximosVencerEl = document.getElementById('alimentosProximosVencer');

// Elementos do DOM para sensores
const sensorStatus = document.getElementById('sensorStatus');
const sensorStatusText = document.getElementById('sensorStatusText');
const lastUpdate = document.getElementById('lastUpdate');
const temperaturaValue = document.getElementById('temperaturaValue');
const umidadeValue = document.getElementById('umidadeValue');
const dispositivoValue = document.getElementById('dispositivoValue');
const localizacaoValue = document.getElementById('localizacaoValue');
const sensorsAlerts = document.getElementById('sensorsAlerts');
const refreshSensors = document.getElementById('refreshSensors');
const viewSensorHistory = document.getElementById('viewSensorHistory');
const viewSensorStats = document.getElementById('viewSensorStats');
const sensorHistoryContainer = document.getElementById('sensorHistoryContainer');
const sensorStatsContainer = document.getElementById('sensorStatsContainer');
const sensorHistoryList = document.getElementById('sensorHistoryList');
const sensorStatsContent = document.getElementById('sensorStatsContent');

// Funções utilitárias
function daysUntil(dateISO) {
  const now = new Date();
  const target = new Date(dateISO);
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function showNotification(message, type = 'info') {
  // Criar elemento de notificação
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Adicionar estilos se não existirem
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease-out;
      }
      .notification.info { background: #06b6d4; }
      .notification.success { background: #10b981; }
      .notification.error { background: #ef4444; }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Adicionar ao corpo do documento
  document.body.appendChild(notification);
  
  // Remover após 3 segundos
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Comunicação com a API
async function apiRequest(endpoint, options = {}) {
  try {
    console.log(`🔗 Fazendo requisição para: ${API_BASE}${endpoint}`);
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Erro na requisição API:', error);
    showNotification(`Erro: ${error.message}`, 'error');
    throw error;
  }
}

// Carregar alimentos da API
async function loadFoods() {
  try {
    const foods = await apiRequest('/alimentos');
    console.log('📦 Alimentos carregados:', foods.length);
    return foods;
  } catch (error) {
    console.error('❌ Erro ao carregar alimentos:', error);
    return [];
  }
}

// Salvar alimento via API
async function saveFood(food) {
  return await apiRequest('/alimentos', {
    method: 'POST',
    body: JSON.stringify(food),
  });
}

// Atualizar alimento via API
async function updateFood(id, updates) {
  return await apiRequest(`/alimentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// Deletar alimento via API
async function deleteFood(id) {
  return await apiRequest(`/alimentos/${id}`, {
    method: 'DELETE',
  });
}

// Deletar TODOS os alimentos
async function deleteAllFoods() {
  return await apiRequest('/alimentos', {
    method: 'DELETE',
  });
}

// Popular exemplos via API
async function popularExemplos() {
  return await apiRequest('/popular-exemplos', {
    method: 'POST',
  });
}

// Renderização
async function renderFoods(filter = 'all') {
  try {
    let foods = await loadFoods();

    // Aplicar filtros
    if (filter === 'disponível') {
      foods = foods.filter(f => f.status === 'disponível');
    } else if (filter === 'reservado') {
      foods = foods.filter(f => f.status === 'reservado');
    } else if (filter === 'doado') {
      foods = foods.filter(f => f.status === 'doado');
    } else if (filter === 'near') {
      foods = foods.filter(f => daysUntil(f.data_vencimento) <= 3);
    }

    // Atualizar estatísticas
    updateStats(foods);

    // Renderizar lista
    foodList.innerHTML = '';
    
    if (foods.length === 0) {
      foodList.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">��</span>
          <p>Nenhum alimento encontrado.</p>
          <p class="empty-subtitle">Cadastre o primeiro alimento usando o formulário ao lado.</p>
        </div>
      `;
      return;
    }

    foods.forEach(food => {
      const days = daysUntil(food.data_vencimento);
      const card = document.createElement('div');
      card.className = 'food-card';
      
      // Cor da borda baseada no status e validade
      let borderColor = '#6b7280'; // padrão
      if (food.status === 'disponível') {
        borderColor = days <= 3 ? '#ef4444' : '#10b981';
      } else if (food.status === 'reservado') {
        borderColor = '#f59e0b';
      } else if (food.status === 'doado') {
        borderColor = '#06b6d4';
      }
      card.style.borderLeftColor = borderColor;

      card.innerHTML = `
        <div class="food-info">
          <h3>${food.nome}</h3>
          <p>${food.quantidade} unidade(s) — ${food.local_doacao || 'Local não informado'}</p>
          <div class="food-meta">
            <span>Validade: <span class="expire ${days <= 3 ? 'near' : 'ok'}">${formatDate(food.data_vencimento)}</span></span>
            <span>(${days} dias)</span>
            ${food.email_doador ? `<span>Doador: ${food.email_doador}</span>` : ''}
          </div>
        </div>
        <div class="food-actions">
          <span class="status-badge status-${food.status}">${food.status}</span>
          ${food.status === 'disponível' ? 
            `<button class="action-btn reserve" data-id="${food.id}" title="Reservar alimento">
               <span class="btn-icon">✅</span>
             </button>` : ''}
          <button class="action-btn delete" data-id="${food.id}" title="Excluir alimento">
            <span class="btn-icon">🗑️</span>
          </button>
        </div>
      `;

      foodList.appendChild(card);
    });

    // Adicionar event listeners para os botões de ação
    document.querySelectorAll('.action-btn.reserve').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        await reserveFood(id);
      });
    });

    document.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        await removeFood(id);
      });
    });

  } catch (error) {
    console.error('❌ Erro ao renderizar alimentos:', error);
  }
}

// Atualizar estatísticas
function updateStats(foods) {
  const total = foods.length;
  const disponiveis = foods.filter(f => f.status === 'disponível').length;
  const proximosVencer = foods.filter(f => 
    f.status === 'disponível' && daysUntil(f.data_vencimento) <= 3
  ).length;

  totalAlimentosEl.textContent = total;
  alimentosDisponiveisEl.textContent = disponiveis;
  alimentosProximosVencerEl.textContent = proximosVencer;
}

// Reservar alimento
async function reserveFood(id) {
  try {
    await updateFood(id, { status: 'reservado' });
    showNotification('Alimento reservado com sucesso! Notificação enviada ao doador.', 'success');
    renderFoods(filterSelect.value);
  } catch (error) {
    console.error('❌ Erro ao reservar alimento:', error);
  }
}

// Remover alimento individual
async function removeFood(id) {
  if (confirm('Tem certeza que deseja excluir este alimento?')) {
    try {
      await deleteFood(id);
      showNotification('Alimento removido com sucesso!', 'success');
      renderFoods(filterSelect.value);
    } catch (error) {
      console.error('❌ Erro ao remover alimento:', error);
    }
  }
}

// Cadastrar alimento
foodForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nome = document.getElementById('name').value.trim();
  const quantidade = parseInt(document.getElementById('quantity').value);
  const data_vencimento = document.getElementById('date').value;
  const local_doacao = document.getElementById('location').value.trim();
  const email_doador = document.getElementById('email').value.trim() || null;

  if (!nome || !data_vencimento || !local_doacao) {
    showNotification('Preencha todos os campos obrigatórios.', 'error');
    return;
  }

  if (quantidade <= 0) {
    showNotification('Quantidade deve ser maior que zero.', 'error');
    return;
  }

  const newFood = { nome, quantidade, data_vencimento, local_doacao, email_doador };

  try {
    await saveFood(newFood);
    showNotification('Alimento cadastrado com sucesso!', 'success');
    renderFoods(filterSelect.value);
    foodForm.reset();
  } catch (error) {
    console.error('❌ Erro ao cadastrar alimento:', error);
  }
});

// Popular com exemplos
seedBtn.addEventListener('click', async () => {
  console.log('🎲 Clicou em Popular Exemplos');
  
  try {
    await popularExemplos();
    showNotification('Exemplos carregados com sucesso!', 'success');
    // Aguardar um pouco antes de recarregar a lista
    setTimeout(() => {
      renderFoods(filterSelect.value);
    }, 500);
  } catch (error) {
    console.error('❌ Erro ao carregar exemplos:', error);
  }
});

// Excluir TODOS os alimentos
deleteAllBtn.addEventListener('click', async () => {
  if (confirm('Tem certeza que deseja excluir TODOS os alimentos? Esta ação não pode ser desfeita.')) {
    try {
      await deleteAllFoods();
      showNotification('Todos os alimentos foram removidos!', 'success');
      renderFoods(filterSelect.value);
    } catch (error) {
      console.error('❌ Erro ao excluir todos os alimentos:', error);
    }
  }
});

// Filtro
filterSelect.addEventListener('change', (e) => {
  renderFoods(e.target.value);
});

// ===== SISTEMA DE SENSORES IoT =====

// Funções para sensores
async function loadSensorData() {
  try {
    const data = await apiRequest('/sensores');
    console.log('🌡️ Dados do sensor:', data);
    
    updateSensorDisplay(data);
    checkAlerts(data);
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados do sensor:', error);
    setSensorStatus(false);
  }
}

function updateSensorDisplay(data) {
  // Atualizar valores
  if (data.temperatura !== undefined) {
    temperaturaValue.textContent = data.temperatura.toFixed(1);
  }
  
  if (data.umidade !== undefined) {
    umidadeValue.textContent = data.umidade.toFixed(1);
  }
  
  if (data.dispositivo) {
    dispositivoValue.textContent = data.dispositivo;
  }
  
  if (data.localizacao) {
    localizacaoValue.textContent = data.localizacao;
  }
  
  if (data.data_leitura) {
    const dataLeitura = new Date(data.data_leitura);
    lastUpdate.textContent = `Última atualização: ${dataLeitura.toLocaleString('pt-BR')}`;
  }
  
  setSensorStatus(true);
}

function setSensorStatus(conectado) {
  if (conectado) {
    sensorStatus.className = 'status-indicator connected';
    sensorStatusText.textContent = 'Conectado';
  } else {
    sensorStatus.className = 'status-indicator disconnected';
    sensorStatusText.textContent = 'Desconectado';
  }
}

function checkAlerts(data) {
  sensorsAlerts.innerHTML = '';
  
  const alerts = [];
  
  if (data.temperatura > 35) {
    alerts.push({
      type: 'danger',
      message: `🚨 Temperatura ALTA: ${data.temperatura.toFixed(1)}°C - Verificar refrigeração`
    });
  } else if (data.temperatura < 5) {
    alerts.push({
      type: 'danger',
      message: `🚨 Temperatura BAIXA: ${data.temperatura.toFixed(1)}°C - Risco de congelamento`
    });
  } else if (data.temperatura > 30) {
    alerts.push({
      type: 'warning',
      message: `⚠️ Temperatura elevada: ${data.temperatura.toFixed(1)}°C - Monitorar`
    });
  }
  
  if (data.umidade > 80) {
    alerts.push({
      type: 'danger',
      message: `💧 Umidade ALTA: ${data.umidade.toFixed(1)}% - Risco de umidade`
    });
  } else if (data.umidade < 20) {
    alerts.push({
      type: 'danger',
      message: `💧 Umidade BAIXA: ${data.umidade.toFixed(1)}% - Ambiente muito seco`
    });
  } else if (data.umidade > 70) {
    alerts.push({
      type: 'warning',
      message: `💧 Umidade elevada: ${data.umidade.toFixed(1)}% - Monitorar`
    });
  }
  
  // Exibir alertas
  alerts.forEach(alert => {
    const alertElement = document.createElement('div');
    alertElement.className = `alert-card ${alert.type === 'warning' ? 'warning' : 'danger'}`;
    alertElement.innerHTML = `
      <span class="alert-icon">${alert.type === 'warning' ? '⚠️' : '🚨'}</span>
      <span class="alert-message">${alert.message}</span>
    `;
    sensorsAlerts.appendChild(alertElement);
  });
}

async function loadSensorHistory() {
  try {
    const historico = await apiRequest('/sensores/historico?limit=20');
    
    sensorHistoryList.innerHTML = '';
    
    if (historico.length === 0) {
      sensorHistoryList.innerHTML = '<div class="empty-state">Nenhum dado histórico encontrado</div>';
      return;
    }
    
    // Cabeçalho
    const header = document.createElement('div');
    header.className = 'history-item history-header';
    header.innerHTML = `
      <span>Data/Hora</span>
      <span>Temperatura</span>
      <span>Umidade</span>
      <span>Dispositivo</span>
    `;
    sensorHistoryList.appendChild(header);
    
    // Itens
    historico.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'history-item';
      
      const dataLeitura = new Date(item.data_leitura);
      
      itemElement.innerHTML = `
        <span>${dataLeitura.toLocaleString('pt-BR')}</span>
        <span>${item.temperatura ? item.temperatura.toFixed(1) + '°C' : '--'}</span>
        <span>${item.umidade ? item.umidade.toFixed(1) + '%' : '--'}</span>
        <span>${item.dispositivo || '--'}</span>
      `;
      
      sensorHistoryList.appendChild(itemElement);
    });
    
  } catch (error) {
    console.error('❌ Erro ao carregar histórico:', error);
    sensorHistoryList.innerHTML = '<div class="empty-state">Erro ao carregar histórico</div>';
  }
}

async function loadSensorStats() {
  try {
    const stats = await apiRequest('/sensores/estatisticas');
    
    sensorStatsContent.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${stats.total_leitura || 0}</div>
          <div class="stat-label">Total Leituras</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.temperatura_media ? stats.temperatura_media.toFixed(1) : '--'}</div>
          <div class="stat-label">Temp. Média</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.umidade_media ? stats.umidade_media.toFixed(1) : '--'}</div>
          <div class="stat-label">Umidade Média</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.temperatura_max ? stats.temperatura_max.toFixed(1) : '--'}</div>
          <div class="stat-label">Temp. Máxima</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.temperatura_min ? stats.temperatura_min.toFixed(1) : '--'}</div>
          <div class="stat-label">Temp. Mínima</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.umidade_max ? stats.umidade_max.toFixed(1) : '--'}</div>
          <div class="stat-label">Umidade Máx.</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.umidade_min ? stats.umidade_min.toFixed(1) : '--'}</div>
          <div class="stat-label">Umidade Mín.</div>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('❌ Erro ao carregar estatísticas:', error);
    sensorStatsContent.innerHTML = '<div class="empty-state">Erro ao carregar estatísticas</div>';
  }
}

// Event Listeners para sensores
refreshSensors.addEventListener('click', () => {
  loadSensorData();
  showNotification('Dados dos sensores atualizados!', 'success');
});

viewSensorHistory.addEventListener('click', () => {
  sensorHistoryContainer.classList.toggle('hidden');
  sensorStatsContainer.classList.add('hidden');
  
  if (!sensorHistoryContainer.classList.contains('hidden')) {
    loadSensorHistory();
  }
});

viewSensorStats.addEventListener('click', () => {
  sensorStatsContainer.classList.toggle('hidden');
  sensorHistoryContainer.classList.add('hidden');
  
  if (!sensorStatsContainer.classList.contains('hidden')) {
    loadSensorStats();
  }
});

// Atualizar dados dos sensores automaticamente a cada 10 segundos
setInterval(loadSensorData, 10000);

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Dashboard inicializando...');
  renderFoods();
  loadSensorData();
  
  // Configurar data mínima para hoje no campo de data
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').min = today;
  
  console.log('✅ Dashboard carregado!');
});
