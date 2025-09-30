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
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );
    res.status(201).json({ message: 'Usuário criado com sucesso!' });
  } catch (err) {
    if (err.code === '23505') {
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
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Usuário ou senha incorretos' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
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

// Qualquer rota que não seja da API serve o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

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

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});