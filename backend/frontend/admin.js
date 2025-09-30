const token = localStorage.getItem('token');
const requestsDiv = document.getElementById('requests');

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

    requests.forEach(req => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p>Usuário: ${req.username}</p>
        <button onclick="approve(${req.id})">Aprovar</button>
        <button onclick="reject(${req.id})">Recusar</button>
      `;
      requestsDiv.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

// Função para aprovar solicitação
async function approve(id) {
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
  }
}

// Função para recusar solicitação
async function reject(id) {
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
  }
}

loadRequests();