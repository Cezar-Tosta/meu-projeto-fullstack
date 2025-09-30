const token = localStorage.getItem('token');
const requestsDiv = document.getElementById('requests');
const requestsCount = document.getElementById('requests-count');

// Função para carregar solicitações
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
      loadRequests(); // Atualiza a lista
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
      loadRequests(); // Atualiza a lista
    } else {
      throw new Error('Erro ao recusar');
    }
  } catch (err) {
    console.error(err);
    button.disabled = false;
    button.textContent = 'Recusar';
  }
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

showUsername();

loadRequests();