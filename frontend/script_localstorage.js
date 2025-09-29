// Seleciona os elementos do DOM
const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const taskList = document.getElementById('task-list');

// Função para carregar tarefas do localStorage
function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  taskList.innerHTML = ''; // Limpa a lista antes de carregar

  tasks.forEach((task, index) => {
    createTaskElement(task, index);
  });
}

// Função para criar o elemento da tarefa
function createTaskElement(task, index) {
  const li = document.createElement('li');
  li.textContent = task;

  // Botão para remover a tarefa
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Remover';
  deleteBtn.onclick = () => removeTask(index);

  li.appendChild(deleteBtn);
  taskList.appendChild(li);
}

// Função para adicionar nova tarefa
function addTask(e) {
  e.preventDefault(); // Impede o recarregamento da página

  const task = input.value.trim();
  if (task === '') return; // Não adiciona tarefa vazia

  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  tasks.push(task);
  localStorage.setItem('tasks', JSON.stringify(tasks));

  input.value = ''; // Limpa o campo
  loadTasks(); // Atualiza a lista
}

// Função para remover tarefa
function removeTask(index) {
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  tasks.splice(index, 1); // Remove o item do array
  localStorage.setItem('tasks', JSON.stringify(tasks));
  loadTasks(); // Atualiza a lista
}

// Eventos
form.addEventListener('submit', addTask);

// Carrega as tarefas ao iniciar a página
loadTasks();