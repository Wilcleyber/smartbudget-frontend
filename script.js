// ===========================
// Configuração da API
// ===========================
const API_BASE_URL = "https://smartbudget-backend-zgek.onrender.com";
let currentUser = null;
let chartCategorias = null;
let chartMensal = null;

// ===========================
// Funções de Navegação
// ===========================
function showPage(pageId) {
  document.querySelectorAll("section").forEach(sec => sec.style.display = "none");
  document.getElementById(pageId).style.display = "block";
}

// ===========================
// Autenticação
// ===========================
async function loginUser() {
  const username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Digite o nome!");
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/login?username=${username}`, { method: "POST" });
    if (!res.ok) throw new Error("Usuário não encontrado");
    currentUser = username;
    showPage("dashboardPage");
    loadTransactions();
  } catch (err) {
    alert(err.message);
  }
}

async function registerUser() {
  const username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Digite o nome!");
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/register?username=${username}`, { method: "POST" });
    if (!res.ok) throw new Error("Usuário já existe");
    // Auto-login após registro para evitar estado inconsistente
    currentUser = username;
    alert("Usuário registrado com sucesso! Você foi logado.");
    showPage("dashboardPage");
    loadTransactions();
  } catch (err) {
    alert(err.message);
  }
}

function loginVisitor() {
  currentUser = "visitante";
  showPage("dashboardPage");
  loadTransactions();
}

function logout() {
  currentUser = null;
  showPage("loginPage");
}

// ===========================
// Transações
// ===========================
async function loadTransactions() {
  try {
    const url = `${API_BASE_URL}/transactions?username=${currentUser}`;
    const res = await fetch(url);
    const data = await res.json();
    console.debug('loadTransactions', { currentUser, url, status: res.status, data });
    const list = document.getElementById("transactionList");
    list.innerHTML = "";
    data.forEach(t => {
      const item = document.createElement("div");
      item.textContent = `${t.date} - ${t.name} (${t.category}): R$${t.value} [${t.type}]`;

      // Botão de excluir
      const btnDelete = document.createElement("button");
      btnDelete.textContent = "Excluir";
      btnDelete.onclick = () => deleteTransaction(t.id);

      // Botão de editar
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Editar";
      btnEdit.onclick = () => showEditTransactionModal(t);

      item.appendChild(btnDelete);
      item.appendChild(btnEdit);
      list.appendChild(item);
    });
  } catch (err) {
    alert("Erro ao carregar transações");
  }
}

// ===========================
// Analytics
// ===========================
async function loadSummary() {
  const url = `${API_BASE_URL}/api/analytics/summary?username=${currentUser}`;
  const res = await fetch(url);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    console.debug('loadSummary no json body', { currentUser, url, status: res.status });
  }
  console.debug('loadSummary', { currentUser, url, status: res.status, data });
  const receitas = data && (data.total_receitas ?? data.receitas ?? 0);
  const despesas = data && (data.total_despesas ?? data.despesas ?? 0);
  const saldo = data && (data.saldo_atual ?? data.saldo ?? (receitas - despesas));
  document.getElementById("cardReceitas").textContent = `Receitas: R$${receitas}`;
  document.getElementById("cardDespesas").textContent = `Despesas: R$${despesas}`;
  document.getElementById("cardSaldo").textContent = `Saldo: R$${saldo}`;
}

async function loadByCategory() {
  const url = `${API_BASE_URL}/api/analytics/by-category?username=${currentUser}`;
  const res = await fetch(url);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    console.debug('loadByCategory no json body', { currentUser, url, status: res.status });
  }
  console.debug('loadByCategory', { currentUser, url, status: res.status, data });
  // Normalizar resposta para labels/values
  let labels = [];
  let values = [];
  if (!data) {
    labels = [];
    values = [];
  } else if (Array.isArray(data)) {
    data.forEach(item => {
      labels.push(item.category ?? item.label ?? "");
      values.push(item.value ?? item.amount ?? 0);
    });
  } else if (typeof data === 'object') {
    labels = Object.keys(data);
    values = Object.values(data).map(v => v ?? 0);
  }
  const ctx = document.getElementById("chartCategorias").getContext("2d");
  if (chartCategorias) chartCategorias.destroy();
  chartCategorias = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ["#4CAF50", "#F44336", "#2196F3", "#FFC107", "#9C27B0"]
      }]
    }
  });
}

async function loadMonthly() {
  const url = `${API_BASE_URL}/api/analytics/monthly?username=${currentUser}`;
  const res = await fetch(url);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    console.debug('loadMonthly no json body', { currentUser, url, status: res.status });
  }
  console.debug('loadMonthly', { currentUser, url, status: res.status, data });
  let labels = [];
  let receitas = [];
  let despesas = [];
  if (!data) {
    labels = [];
    receitas = [];
    despesas = [];
  } else if (Array.isArray(data)) {
    labels = data.map(m => m.month ?? m.label ?? "");
    receitas = data.map(m => m.receitas ?? m.income ?? 0);
    despesas = data.map(m => m.despesas ?? m.expense ?? 0);
  } else if (typeof data === 'object') {
    labels = Object.keys(data);
    const vals = Object.values(data);
    receitas = vals.map(m => (m && (m.receitas ?? m.income)) ?? 0);
    despesas = vals.map(m => (m && (m.despesas ?? m.expense)) ?? 0);
  }
  const ctx = document.getElementById("chartMensal").getContext("2d");
  if (chartMensal) chartMensal.destroy();
  chartMensal = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Receitas",
          data: receitas,
          borderColor: "green",
          fill: false
        },
        {
          label: "Despesas",
          data: despesas,
          borderColor: "red",
          fill: false
        }
      ]
    }
  });
}

// ===========================
// Inicialização da página Analytics
// ===========================
function showAnalytics() {
  showPage("analyticsPage");
  loadSummary();
  loadByCategory();
  loadMonthly();
}
// ===========================
// Nova Transação
// ===========================
function showNewTransactionModal() {
  document.getElementById("newTransactionModal").style.display = "block";
}

function closeNewTransactionModal() {
  document.getElementById("newTransactionModal").style.display = "none";
}

async function addTransaction() {
  const transaction = {
    id: crypto.randomUUID(), // gera UUID no cliente
    name: document.getElementById("transName").value,
    value: parseFloat(document.getElementById("transValue").value),
    date: document.getElementById("transDate").value,
    type: document.getElementById("transType").value,
    category: document.getElementById("transCategory").value,
    description: document.getElementById("transDescription").value
  };

  try {
    const url = `${API_BASE_URL}/transactions?username=${currentUser}`;
    console.debug('addTransaction send', { currentUser, url, transaction });
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction)
    });
    let resBody = null;
    try { resBody = await res.json(); } catch (e) { /* no json */ }
    console.debug('addTransaction response', { status: res.status, resBody });
    if (!res.ok) throw new Error("Erro ao adicionar transação");
    alert("Transação adicionada com sucesso!");
    closeNewTransactionModal();
    loadTransactions(); // recarrega lista
  } catch (err) {
    alert(err.message);
  }
}
// ===========================
// Excluir Transação
// ===========================
async function deleteTransaction(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/transactions/${id}?username=${currentUser}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Erro ao excluir transação");
    alert("Transação removida com sucesso!");
    loadTransactions(); // recarrega lista
  } catch (err) {
    alert(err.message);
  }
}

// ===========================
// Editar Transação
// ===========================
let editingTransactionId = null;

function showEditTransactionModal(transaction) {
  editingTransactionId = transaction.id;
  document.getElementById("editTransName").value = transaction.name;
  document.getElementById("editTransValue").value = transaction.value;
  document.getElementById("editTransDate").value = transaction.date;
  document.getElementById("editTransType").value = transaction.type;
  document.getElementById("editTransCategory").value = transaction.category;
  document.getElementById("editTransDescription").value = transaction.description;
  document.getElementById("editTransactionModal").style.display = "block";
}

function closeEditTransactionModal() {
  document.getElementById("editTransactionModal").style.display = "none";
  editingTransactionId = null;
}

async function updateTransaction() {
  const updatedTransaction = {
    // Não reaproveitamos o mesmo ID do cliente para evitar criar registros
    // com campos duplicados no backend caso ele trate POST como create.
    id: crypto.randomUUID(),
    name: document.getElementById("editTransName").value,
    value: parseFloat(document.getElementById("editTransValue").value),
    date: document.getElementById("editTransDate").value,
    type: document.getElementById("editTransType").value,
    category: document.getElementById("editTransCategory").value,
    description: document.getElementById("editTransDescription").value
  };

  try {
    // Primeiro tentamos remover o registro antigo no servidor.
    const delRes = await fetch(`${API_BASE_URL}/transactions/${editingTransactionId}?username=${currentUser}`, {
      method: "DELETE"
    });
    if (!delRes.ok) {
      // Se não for possível remover, abortamos para evitar duplicatas inconsistentes
      throw new Error("Erro ao remover transação antiga antes de atualizar");
    }

    // Depois criamos a nova transação atualizada via POST (criação limpa)
    const createRes = await fetch(`${API_BASE_URL}/transactions?username=${currentUser}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTransaction)
    });
    if (!createRes.ok) throw new Error("Erro ao criar transação atualizada");

    alert("Transação atualizada com sucesso!");
    closeEditTransactionModal();
    loadTransactions();
  } catch (err) {
    alert(err.message);
  }
}

