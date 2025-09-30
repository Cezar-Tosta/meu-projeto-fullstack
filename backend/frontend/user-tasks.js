// Obter o userId da URL
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');
const token = localStorage.getItem('token');

if (!userId) {
  alert('ID do usuário não fornecido.');
  window.location.href = 'admin.html';
}

// Função para carregar informações do usuário e suas tarefas
async function loadUserTasks() {
  try {
    // Obter nome do usuário
    const userResponse = await fetch(`https://meu-projeto-fullstack.onrender.com/admin/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Erro ao carregar informações do usuário');
    }

    const user = await userResponse.json();
    document.getElementById('user-name').textContent = `Usuário: ${user.username}`;

    // Obter tarefas do usuário
    const tasksResponse = await fetch(`https://meu-projeto-fullstack.onrender.com/admin/user/${userId}/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!tasksResponse.ok) {
      throw new Error('Erro ao carregar tarefas do usuário');
    }

    const tasks = await tasksResponse.json();
    const taskList = document.getElementById('task-list');
    const tasksCount = document.getElementById('tasks-count');

    taskList.innerHTML = '';

    if (tasks.length === 0) {
      taskList.innerHTML = '<li class="no-tasks">Nenhuma tarefa encontrada.</li>';
      tasksCount.textContent = '0';
      return;
    }

    tasksCount.textContent = tasks.length;

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="task-info">
          <span class="${task.done ? 'done' : ''}">${task.title}</span>
        </div>
        <div class="task-actions">
          <button onclick="toggleTask(${task.id}, this)">${task.done ? 'Desfazer' : 'Concluir'}</button>
          <button onclick="deleteTask(${task.id}, this)">Excluir</button>
        </div>
      `;
      taskList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    document.getElementById('task-list').innerHTML = `<li class="no-tasks">${err.message}</li>`;
  }
}

// Função para marcar/desfazer tarefa
async function toggleTask(taskId, button) {
  button.disabled = true;
  const currentText = button.textContent;
  const route = currentText === 'Concluir' ? 'done' : 'undone';

  try {
    const response = await fetch(`https://meu-projeto-fullstack.onrender.com/admin/task/${taskId}/${route}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      loadUserTasks(); // Atualiza a lista
    } else {
      throw new Error('Erro ao atualizar tarefa');
    }
  } catch (err) {
    console.error(err);
    button.disabled = false;
  }
}

// Função para excluir tarefa
async function deleteTask(taskId, button) {
  button.disabled = true;
  button.textContent = 'Excluindo...';

  try {
    const response = await fetch(`https://meu-projeto-fullstack.onrender.com/admin/task/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      loadUserTasks(); // Atualiza a lista
    } else {
      throw new Error('Erro ao excluir tarefa');
    }
  } catch (err) {
    console.error(err);
    button.disabled = false;
    button.textContent = 'Excluir';
  }
}

// Função para carregar o nome do usuário no topo (admin)
function getUsernameFromToken() {
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

loadUserTasks();