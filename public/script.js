// Configuração da API
const API_BASE = window.location.origin + "/api";

// Elementos do DOM
const foodForm = document.getElementById("foodForm");
const foodList = document.getElementById("foodList");
const filterSelect = document.getElementById("filter");
const deleteAllBtn = document.getElementById("deleteAll");
const seedBtn = document.getElementById("seed");
const viewLogsBtn = document.getElementById("viewLogs");
const logsContainer = document.getElementById("logsContainer");
const logsList = document.getElementById("logsList");

// Elementos de estatísticas
const totalAlimentosEl = document.getElementById("totalAlimentos");
const alimentosDisponiveisEl = document.getElementById("alimentosDisponiveis");
const alimentosProximosVencerEl = document.getElementById(
  "alimentosProximosVencer"
);

// Funções utilitárias
function daysUntil(dateISO) {
  const now = new Date();
  const target = new Date(dateISO);
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
}

function showNotification(message, type = "info") {
  // Criar elemento de notificação
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Adicionar estilos se não existirem
  if (!document.querySelector("#notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
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
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Erro na requisição API:", error);
    showNotification(`Erro: ${error.message}`, "error");
    throw error;
  }
}

// Carregar alimentos da API
async function loadFoods() {
  try {
    const foods = await apiRequest("/alimentos");
    console.log("📦 Alimentos carregados:", foods);
    return foods;
  } catch (error) {
    console.error("❌ Erro ao carregar alimentos:", error);
    return [];
  }
}

// Salvar alimento via API
async function saveFood(food) {
  return await apiRequest("/alimentos", {
    method: "POST",
    body: JSON.stringify(food),
  });
}

// Atualizar alimento via API
async function updateFood(id, updates) {
  return await apiRequest(`/alimentos/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

// Deletar alimento via API
async function deleteFood(id) {
  return await apiRequest(`/alimentos/${id}`, {
    method: "DELETE",
  });
}

// Popular exemplos via API
async function popularExemplos() {
  return await apiRequest("/popular-exemplos", {
    method: "POST",
  });
}

// Renderização
async function renderFoods(filter = "all") {
  try {
    let foods = await loadFoods();

    // Aplicar filtros
    if (filter === "disponível") {
      foods = foods.filter((f) => f.status === "disponível");
    } else if (filter === "reservado") {
      foods = foods.filter((f) => f.status === "reservado");
    } else if (filter === "doado") {
      foods = foods.filter((f) => f.status === "doado");
    } else if (filter === "near") {
      foods = foods.filter((f) => daysUntil(f.data_vencimento) <= 3);
    }

    // Atualizar estatísticas
    updateStats(foods);

    // Renderizar lista
    foodList.innerHTML = "";

    if (foods.length === 0) {
      foodList.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📦</span>
          <p>Nenhum alimento encontrado.</p>
          <p class="empty-subtitle">Cadastre o primeiro alimento usando o formulário ao lado.</p>
        </div>
      `;
      return;
    }

    foods.forEach((food) => {
      const days = daysUntil(food.data_vencimento);
      const card = document.createElement("div");
      card.className = "food-card";

      // Cor da borda baseada no status e validade
      let borderColor = "#6b7280"; // padrão
      if (food.status === "disponível") {
        borderColor = days <= 3 ? "#ef4444" : "#10b981";
      } else if (food.status === "reservado") {
        borderColor = "#f59e0b";
      } else if (food.status === "doado") {
        borderColor = "#06b6d4";
      }
      card.style.borderLeftColor = borderColor;

      card.innerHTML = `
        <div class="food-info">
          <h3>${food.nome}</h3>
          <p>${food.quantidade} unidade(s) — ${
        food.local_doacao || "Local não informado"
      }</p>
          <div class="food-meta">
            <span>Validade: <span class="expire ${
              days <= 3 ? "near" : "ok"
            }">${formatDate(food.data_vencimento)}</span></span>
            <span>(${days} dias)</span>
            ${
              food.email_doador
                ? `<span>Doador: ${food.email_doador}</span>`
                : ""
            }
          </div>
        </div>
        <div class="food-actions">
          <span class="status-badge status-${food.status}">${food.status}</span>
          ${
            food.status === "disponível"
              ? `<button class="action-btn reserve" data-id="${food.id}" title="Reservar alimento">
               <span class="btn-icon">✅</span>
             </button>`
              : ""
          }
          <button class="action-btn delete" data-id="${
            food.id
          }" title="Excluir alimento">
            <span class="btn-icon">🗑️</span>
          </button>
        </div>
      `;

      foodList.appendChild(card);
    });

    // Adicionar event listeners para os botões de ação
    document.querySelectorAll(".action-btn.reserve").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        await reserveFood(id);
      });
    });

    document.querySelectorAll(".action-btn.delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        await removeFood(id);
      });
    });
  } catch (error) {
    console.error("❌ Erro ao renderizar alimentos:", error);
  }
}

// Atualizar estatísticas
function updateStats(foods) {
  const total = foods.length;
  const disponiveis = foods.filter((f) => f.status === "disponível").length;
  const proximosVencer = foods.filter(
    (f) => f.status === "disponível" && daysUntil(f.data_vencimento) <= 3
  ).length;

  totalAlimentosEl.textContent = total;
  alimentosDisponiveisEl.textContent = disponiveis;
  alimentosProximosVencerEl.textContent = proximosVencer;
}

// Reservar alimento
async function reserveFood(id) {
  try {
    await updateFood(id, { status: "reservado" });
    showNotification(
      "Alimento reservado com sucesso! Notificação enviada ao doador.",
      "success"
    );
    renderFoods(filterSelect.value);
  } catch (error) {
    console.error("❌ Erro ao reservar alimento:", error);
  }
}

// Remover alimento
async function removeFood(id) {
  if (confirm("Tem certeza que deseja excluir este alimento?")) {
    try {
      await deleteFood(id);
      showNotification("Alimento removido com sucesso!", "success");
      renderFoods(filterSelect.value);
    } catch (error) {
      console.error("❌ Erro ao remover alimento:", error);
    }
  }
}

// Cadastrar alimento
foodForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("name").value.trim();
  const quantidade = parseInt(document.getElementById("quantity").value);
  const data_vencimento = document.getElementById("date").value;
  const local_doacao = document.getElementById("location").value.trim();
  const email_doador = document.getElementById("email").value.trim() || null;

  if (!nome || !data_vencimento || !local_doacao) {
    showNotification("Preencha todos os campos obrigatórios.", "error");
    return;
  }

  if (quantidade <= 0) {
    showNotification("Quantidade deve ser maior que zero.", "error");
    return;
  }

  const newFood = {
    nome,
    quantidade,
    data_vencimento,
    local_doacao,
    email_doador,
  };

  try {
    await saveFood(newFood);
    showNotification("Alimento cadastrado com sucesso!", "success");
    renderFoods(filterSelect.value);
    foodForm.reset();
  } catch (error) {
    console.error("❌ Erro ao cadastrar alimento:", error);
  }
});

// Popular com exemplos
seedBtn.addEventListener("click", async () => {
  console.log("🎲 Clicou em Popular Exemplos");

  try {
    await popularExemplos();
    showNotification("Exemplos carregados com sucesso!", "success");
    // Aguardar um pouco antes de recarregar a lista
    setTimeout(() => {
      renderFoods(filterSelect.value);
    }, 500);
  } catch (error) {
    console.error("❌ Erro ao carregar exemplos:", error);
  }
});

// Excluir todos os alimentos (implementação manual)
deleteAllBtn.addEventListener("click", async () => {
  if (
    confirm(
      "Tem certeza que deseja excluir TODOS os alimentos? Esta ação não pode ser desfeita."
    )
  ) {
    try {
      // Carregar todos os alimentos
      const foods = await loadFoods();

      // Deletar um por um
      for (const food of foods) {
        await deleteFood(food.id);
      }

      showNotification("Todos os alimentos foram removidos!", "success");
      renderFoods(filterSelect.value);
    } catch (error) {
      console.error("❌ Erro ao excluir todos os alimentos:", error);
    }
  }
});

// Filtro
filterSelect.addEventListener("change", (e) => {
  renderFoods(e.target.value);
});

// Visualizar logs
viewLogsBtn.addEventListener("click", () => {
  logsContainer.classList.toggle("hidden");
  if (!logsContainer.classList.contains("hidden")) {
    logsList.innerHTML = `
      <div class="log-entry">
        <span class="log-timestamp">[${new Date().toLocaleTimeString()}]</span>
        <span class="log-method get">GET</span>
        <span class="log-endpoint">/api/alimentos</span>
        <span class="log-status success">200</span>
      </div>
      <div class="log-entry">
        <span class="log-timestamp">[${new Date().toLocaleTimeString()}]</span>
        <span class="log-method post">POST</span>
        <span class="log-endpoint">/api/popular-exemplos</span>
        <span class="log-status success">200</span>
      </div>
    `;
  }
});

// Inicialização
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Dashboard inicializando...");
  renderFoods();

  // Configurar data mínima para hoje no campo de data
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").min = today;

  console.log("✅ Dashboard carregado!");
});
