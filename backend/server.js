const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco de dados PostgreSQL
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

const pool = new Pool(dbConfig);

// Middleware para servir arquivos estáticos do front-end
app.use(express.static(path.join(__dirname, 'frontend')));

// Middleware para parsear JSON
app.use(express.json());

// Middleware para verificar token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado' });
  }

  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// Rota para cadastro de usuário
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Insere o usuário com approved = false
    const result = await pool.query(
      'INSERT INTO users (username, password, approved) VALUES ($1, $2, FALSE) RETURNING id',
      [username, hashedPassword]
    );
    res.status(201).json({ message: 'Solicitação de cadastro enviada. Aguarde aprovação.' });
  } catch (err) {
    if (err.code === '23505') { // Código de erro para chave duplicada no PostgreSQL
      res.status(400).json({ error: 'Usuário já existe' });
    } else {
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
});

// Rota para login de usuário
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Usuário ou senha incorretos' });
    }

    const user = result.rows[0];

    // Verifica se o usuário está aprovado
    if (!user.approved) {
      return res.status(403).json({ error: 'Conta aguardando aprovação do administrador' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Usuário ou senha incorretos' });
    }

    // Inclui is_admin no token
    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Middleware para verificar se o usuário é admin
function isAdmin(req, res, next) {
  if (req.user.is_admin) {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
}

// Rota para listar solicitações de cadastro (usuários não aprovados)
app.get('/admin/requests', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM users WHERE approved = FALSE');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para aprovar ou recusar solicitação
app.patch('/admin/approve/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' ou 'reject'

  try {
    if (action === 'approve') {
      await pool.query('UPDATE users SET approved = TRUE WHERE id = $1', [id]);
      res.json({ message: 'Usuário aprovado com sucesso!' });
    } else if (action === 'reject') {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ message: 'Solicitação recusada e usuário excluído.' });
    } else {
      res.status(400).json({ error: 'Ação inválida. Use "approve" ou "reject".' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para listar tarefas do usuário logado
app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para adicionar tarefa (associada ao usuário logado)
app.post('/tasks', authenticateToken, async (req, res) => {
  const { title } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING *',
      [title, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para editar tarefa
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  try {
    await pool.query('UPDATE tasks SET title = $1 WHERE id = $2 AND user_id = $3', [title, id, req.user.id]);
    res.status(200).json({ message: 'Tarefa atualizada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para marcar como concluída
app.patch('/tasks/:id/done', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE tasks SET done = TRUE WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.status(200).json({ message: 'Tarefa marcada como concluída!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para desfazer tarefa
app.patch('/tasks/:id/undone', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE tasks SET done = FALSE WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.status(200).json({ message: 'Tarefa marcada como não concluída!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Rota para remover tarefa
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.status(200).json({ message: 'Tarefa removida com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ REMOVA ou COMENTE esta rota curinga que pode estar causando o problema
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'frontend/index.html'));
// });

// ✅ Substitua por uma rota explícita para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

// Servir outros arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Teste de conexão com o banco de dados
async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com o banco de dados bem-sucedida!');
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
    process.exit(1);
  }
}

// Rota para listar usuários aprovados (somente admin)
app.get('/admin/approved-users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM users WHERE approved = TRUE');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para excluir um usuário (somente admin)
app.delete('/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Exclui o usuário e suas tarefas automaticamente graças ao ON DELETE CASCADE
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Usuário excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para obter informações de um usuário (somente admin)
app.get('/admin/user/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para obter tarefas de um usuário específico (somente admin)
app.get('/admin/user/:id/tasks', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY id', [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para marcar/desfazer tarefa de qualquer usuário (somente admin)
app.patch('/admin/task/:id/:action', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const action = req.params.action === 'done' ? true : false;

  try {
    await pool.query('UPDATE tasks SET done = $1 WHERE id = $2', [action, id]);
    res.json({ message: `Tarefa ${action ? 'concluída' : 'desfeita'} com sucesso!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para excluir uma tarefa de qualquer usuário (somente admin)
app.delete('/admin/task/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Tarefa excluída com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});