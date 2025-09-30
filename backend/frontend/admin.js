const token = localStorage.getItem('token');
const requestsDiv = document.getElementById('requests');
const requestsCount = document.getElementById('requests-count');
const approvedUsersDiv = document.getElementById('approved-users');
const approvedCount = document.getElementById('approved-count');

// Função para carregar solicitações pendentes
async function loadRequests() {
  try {
    const response = await fetch('https://meu-projeto-fullstack.onrender.com/admin/requests', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao carregar solicitações');
    }

    const requests = await response.json();
    requestsDiv.innerHTML = '';

    if (requests.length === 0) {
      requestsDiv.innerHTML = '<div class="no-requests">Nenhuma solicitação pendente.</div>';
      requestsCount.textContent = '0';
      return;
    }

    requestsCount.textContent = requests.length;

    requests.forEach(req => {
      const div = document.createElement('div');
      div.className = 'request-item';
      div.innerHTML = `
        <div class="request-info">Usuário: ${req.username}</div>
        <div class="request-actions">
          <button class="approve" onclick="approve(${req.id}, this)">Aprovar</button>
          <button class="reject" onclick="reject(${req.id}, this)">Recusar</button>
        </div>
      `;
      requestsDiv.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    requestsDiv.innerHTML = '<div class="no-requests">Erro ao carregar solicitações.</div>';
  }
}

// Função para carregar usuários aprovados
async function loadApprovedUsers() {
  try {
    const response = await fetch('https://meu-projeto-fullstack.onrender.com/admin/approved-users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao carregar usuários aprovados');
    }

    const users = await response.json();
    approvedUsersDiv.innerHTML = '';

    if (users.length === 0) {
      approvedUsersDiv.innerHTML = '<div class="no-approved-users">Nenhum usuário aprovado.</div>';
      approvedCount.textContent = '0';
      return;
    }

    approvedCount.textContent = users.length;

    users.forEach(user => {
      const div = document.createElement('div');
      div.className = 'approved-user-item';
      div.innerHTML = `
        <div class="approved-user-info">Usuário: ${user.username}</div>
        <div class="approved-user-actions">
          <button class="view-tasks" onclick="viewUserTasks(${user.id})">Ver Tarefas</button>
          <button class="delete-user" onclick="deleteUser(${user.id}, this)">Excluir</button>
        </div>
      `;
      approvedUsersDiv.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    approvedUsersDiv.innerHTML = '<div class="no-approved-users">Erro ao carregar usuários aprovados.</div>';
  }
}

// Função para aprovar solicitação
async function approve(id, button) {
  button.disabled = true;
  button.textContent = 'Aprovando...';

  try {
    const response = await fetch(`https://meu-projeto-fullstack.onrender.com/admin/approve/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'approve' })
    });

    if (response.ok) {
      loadRequests(); // Atualiza a lista de solicitações
      loadApprovedUsers(); // Atualiza a lista de aprovados
    } else {
      throw new Error('Erro ao aprovar');
    }
  } catch (err) {
    console.error(err);
    button.disabled = false;
    button.textContent = 'Aprovar';
  }
}

// Função para recusar solicitação
async function reject(id, button) {
  button.disabled = true;
  button.textContent = 'Recusando...';

  try {
    const response = await fetch(`https://meu-projeto-fullstack.onrender.com/admin/approve/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'reject' })
    });

    if (response.ok) {
      loadRequests(); // Atualiza a lista de solicitações
    } else {
      throw new Error('Erro ao recusar');
    }
  } catch (err) {
    console.error(err);
    button.disabled = false;
    button.textContent = 'Recusar';
  }
}

// Função para excluir um usuário
async function deleteUser(id, button) {
  if (!confirm('Tem certeza que deseja excluir este usuário e todas as suas tarefas?')) {
    return;
  }

  button.disabled = true;
  button.textContent = 'Excluindo...';

  try {
    const response = await fetch(`https://meu-projeto-fullstack.onrender.com/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      loadApprovedUsers(); // Atualiza a lista de aprovados
    } else {
      throw new Error('Erro ao excluir usuário');
    }
  } catch (err) {
    console.error(err);
    button.disabled = false;
    button.textContent = 'Excluir';
  }
}

// Função para ver tarefas de um usuário
function viewUserTasks(userId) {
  // Aqui você pode abrir uma nova janela/página ou mostrar em um modal
  alert(`Função de ver tarefas do usuário ID: ${userId} em breve.`);
  // Exemplo de redirecionamento para uma página de tarefas do usuário (ainda não implementada)
  // window.location.href = `user-tasks.html?userId=${userId}`;
}

// Função para carregar o nome do usuário (copiado do script.js)
function getUsernameFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || 'Usuário';
  } catch {
    return 'Usuário';
  }
}

// Mostrar o nome do usuário no topo
const usernameDisplay = document.getElementById('username-display');
const username = getUsernameFromToken();
if (username) {
  usernameDisplay.textContent = `Olá, ${username}`;
}

// Verificar se é admin e mostrar o menu
function showUsername() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isAdmin = payload.is_admin || false;

    // Mostra o menu de admin se for admin
    const adminNav = document.getElementById('admin-nav');
    if (isAdmin) {
      adminNav.style.display = 'block';
    } else {
      adminNav.style.display = 'none';
    }
  } catch (e) {
    console.error('Erro ao decodificar o token:', e);
  }
}

// Função para sair
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html'; // Redireciona para a tela de login
}

showUsername();

loadRequests();
loadApprovedUsers();