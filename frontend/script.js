const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const taskList = document.getElementById('task-list');
const taskForm = document.getElementById('task-form');
const usernameDisplay = document.getElementById('username-display');

// Elementos de mensagem
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');

const API_BASE = 'https://meu-projeto-fullstack.onrender.com'

// Função para exibir mensagem em uma área específica
function showMessage(element, text, isError = false) {
  element.textContent = text;
  element.className = 'message-area ' + (isError ? 'error' : 'success');
  element.classList.add('show');

  setTimeout(() => {
    element.classList.remove('show');
  }, 3000);
}

// Função para obter token do localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Função para obter o nome do usuário do token
function getUsernameFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || 'Usuário';
  } catch {
    return 'Usuário';
  }
}

// Função para mostrar o nome do usuário logado
function showUsername() {
  const username = getUsernameFromToken();
  if (username) {
    usernameDisplay.textContent = `Olá, ${username}`;
  }
}

// Função para fazer login
document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    showMessage(loginMessage, 'Preencha todos os campos!', true);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      authSection.style.display = 'none';
      appSection.style.display = 'block';
      showUsername();
      loadTasks();
      showMessage(loginMessage, 'Login realizado com sucesso!', false);
    } else {
      showMessage(loginMessage, data.error || 'Erro ao fazer login', true);
    }
  } catch (err) {
    showMessage(loginMessage, 'Erro de conexão com o servidor', true);
  }
});

// Função para cadastrar
document.getElementById('register-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();

  if (!username || !password) {
    showMessage(registerMessage, 'Preencha todos os campos!', true);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      document.getElementById('register-username').value = '';
      document.getElementById('register-password').value = '';
      showMessage(registerMessage, 'Usuário cadastrado com sucesso!', false);
    } else {
      const data = await response.json();
      showMessage(registerMessage, data.error || 'Erro ao cadastrar', true);
    }
  } catch (err) {
    showMessage(registerMessage, 'Erro de conexão com o servidor', true);
  }
});

// Função para sair
function logout() {
  localStorage.removeItem('token');
  authSection.style.display = 'flex';
  appSection.style.display = 'none';
  usernameDisplay.textContent = '';
  taskList.innerHTML = '';
}

// Função para carregar tarefas
async function loadTasks() {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erro ao carregar tarefas');

    const tasks = await response.json();
    taskList.innerHTML = '';

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="${task.done ? 'done' : ''}">${task.title}</span>
        <div>
          <button onclick="toggleDone(${task.id})">${task.done ? 'Desfazer' : 'Concluir'}</button>
          <button onclick="editTask(${task.id}, '${task.title.replace(/'/g, "\\'")}')">Editar</button>
          <button onclick="removeTask(${task.id})">Remover</button>
        </div>
      `;
      taskList.appendChild(li);
    });
  } catch (err) {
    showMessage(document.getElementById('message'), err.message, true);
  }
}

// Função para adicionar tarefa
async function addTask(e) {
  e.preventDefault();
  const title = document.getElementById('task-input').value.trim();
  if (title === '') {
    showMessage(document.getElementById('message'), 'Digite uma tarefa!', true);
    return;
  }

  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title })
    });

    if (!response.ok) throw new Error('Erro ao adicionar tarefa');

    document.getElementById('task-input').value = '';
    loadTasks();
    showMessage(document.getElementById('message'), 'Tarefa adicionada com sucesso!', false);
  } catch (err) {
    showMessage(document.getElementById('message'), err.message, true);
  }
}

// Função para editar tarefa
async function editTask(id, currentTitle) {
  const newTitle = prompt('Editar tarefa:', currentTitle);
  if (newTitle === null) return;
  if (newTitle.trim() === '') {
    showMessage(document.getElementById('message'), 'Tarefa não pode ser vazia!', true);
    return;
  }

  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title: newTitle })
    });

    if (!response.ok) throw new Error('Erro ao editar tarefa');

    loadTasks();
    showMessage(document.getElementById('message'), 'Tarefa editada com sucesso!', false);
  } catch (err) {
    showMessage(document.getElementById('message'), err.message, true);
  }
}

// Função para marcar/desfazer tarefa
async function toggleDone(id) {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erro ao carregar tarefas');

    const tasks = await response.json();
    const task = tasks.find(t => t.id === id);
    const route = task.done ? 'undone' : 'done';

    const toggleResponse = await fetch(`${API_BASE}/tasks/${id}/${route}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!toggleResponse.ok) throw new Error('Erro ao atualizar tarefa');

    loadTasks();
    showMessage(document.getElementById('message'), `Tarefa ${route === 'done' ? 'concluída' : 'desfeita'} com sucesso!`, false);
  } catch (err) {
    showMessage(document.getElementById('message'), err.message, true);
  }
}

// Função para remover tarefa
async function removeTask(id) {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erro ao remover tarefa');

    loadTasks();
    showMessage(document.getElementById('message'), 'Tarefa removida com sucesso!', false);
  } catch (err) {
    showMessage(document.getElementById('message'), err.message, true);
  }
}

// Verifica se o usuário já está logado ao carregar a página
if (getToken()) {
  authSection.style.display = 'none';
  appSection.style.display = 'block';
  showUsername();
  loadTasks();
}

taskForm.addEventListener('submit', addTask);