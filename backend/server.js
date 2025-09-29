const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração da conexão com o banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'taskmanager'
};

app.use(cors({
    origin: 'https://meu-projeto-fullstack.vercel.app/', // ou o domínio do seu front-end
  }));
app.use(express.json());

let connection;

async function connectToDatabase() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Conectado ao banco de dados MySQL');
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  }
}

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
    const [result] = await connection.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    res.status(201).json({ message: 'Usuário criado com sucesso!' });
  } catch (err) {
    // Verifica se o erro é por conta de username duplicado
    if (err.code === 'ER_DUP_ENTRY') {
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
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Usuário ou senha incorretos' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Usuário ou senha incorretos' });
    }

    // Incluímos o username no token JWT
    const token = jwt.sign({ id: user.id, username: user.username }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para listar tarefas do usuário logado
app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM tasks WHERE user_id = ?',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para adicionar tarefa (associada ao usuário logado)
app.post('/tasks', authenticateToken, async (req, res) => {
  const { title } = req.body;
  try {
    const [result] = await connection.execute(
      'INSERT INTO tasks (title, user_id) VALUES (?, ?)',
      [title, req.user.id]
    );
    res.status(201).json({
      id: result.insertId,
      title,
      done: false,
      user_id: req.user.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para editar tarefa
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  try {
    await connection.execute(
      'UPDATE tasks SET title = ? WHERE id = ? AND user_id = ?',
      [title, id, req.user.id]
    );
    res.status(200).json({ message: 'Tarefa atualizada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para marcar como concluída
app.patch('/tasks/:id/done', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await connection.execute(
      'UPDATE tasks SET done = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.status(200).json({ message: 'Tarefa marcada como concluída!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para desfazer tarefa
app.patch('/tasks/:id/undone', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await connection.execute(
      'UPDATE tasks SET done = FALSE WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.status(200).json({ message: 'Tarefa marcada como não concluída!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota para remover tarefa
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await connection.execute(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.status(200).json({ message: 'Tarefa removida com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});