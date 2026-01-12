import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Database connection
const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

let pool;

if (connectionString) {
  // Use Supabase/PostgreSQL in production
  pool = new pg.Pool({
    connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
} else {
  // Fallback for local development without Supabase
  console.log('⚠️  No DATABASE_URL found. Using in-memory storage for development.');
  console.log('   Set DATABASE_URL to connect to Supabase.');
}

// In-memory fallback for development without database
let memoryStore = {
  users: [],
  networkData: [],
  nextUserId: 1,
  nextNetworkId: 1,
};

// Initialize database tables
async function initDatabase() {
  if (!pool) return;
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS network_data (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nodes JSONB NOT NULL DEFAULT '[]',
        links JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Default network data for new users
const defaultNodes = [
  { id: 'me', name: 'Me', group: 'me', details: 'The center of my social universe' },
];
const defaultLinks = [];

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Database helper functions
async function findUserByEmail(email) {
  if (pool) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }
  return memoryStore.users.find(u => u.email === email);
}

async function findUserById(id) {
  if (pool) {
    const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }
  const user = memoryStore.users.find(u => u.id === id);
  if (user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}

async function createUser(email, hashedPassword, name) {
  if (pool) {
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );
    return result.rows[0];
  }
  const newUser = {
    id: memoryStore.nextUserId++,
    email,
    password: hashedPassword,
    name,
    created_at: new Date().toISOString(),
  };
  memoryStore.users.push(newUser);
  return { id: newUser.id, email: newUser.email, name: newUser.name };
}

async function getNetworkData(userId) {
  if (pool) {
    const result = await pool.query(
      'SELECT nodes, links, updated_at FROM network_data WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }
  return memoryStore.networkData.find(n => n.user_id === userId);
}

async function saveNetworkData(userId, nodes, links) {
  if (pool) {
    const existing = await pool.query('SELECT id FROM network_data WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE network_data SET nodes = $1, links = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
        [JSON.stringify(nodes), JSON.stringify(links), userId]
      );
    } else {
      await pool.query(
        'INSERT INTO network_data (user_id, nodes, links) VALUES ($1, $2, $3)',
        [userId, JSON.stringify(nodes), JSON.stringify(links)]
      );
    }
  } else {
    const existing = memoryStore.networkData.find(n => n.user_id === userId);
    if (existing) {
      existing.nodes = nodes;
      existing.links = links;
      existing.updated_at = new Date().toISOString();
    } else {
      memoryStore.networkData.push({
        id: memoryStore.nextNetworkId++,
        user_id: userId,
        nodes,
        links,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: pool ? 'connected' : 'in-memory' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser(email, hashedPassword, name || email.split('@')[0]);

    // Create default network data for new user
    const defaultNodesWithName = [...defaultNodes];
    defaultNodesWithName[0] = { ...defaultNodesWithName[0], name: name || 'Me' };
    await saveNetworkData(user.id, defaultNodesWithName, defaultLinks);

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get network data
app.get('/api/network', authenticateToken, async (req, res) => {
  try {
    const data = await getNetworkData(req.user.id);
    
    if (!data) {
      // Create default data if none exists
      const defaultNodesWithName = [...defaultNodes];
      await saveNetworkData(req.user.id, defaultNodesWithName, defaultLinks);
      return res.json({ nodes: defaultNodesWithName, links: defaultLinks });
    }

    res.json({
      nodes: typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes,
      links: typeof data.links === 'string' ? JSON.parse(data.links) : data.links,
      updatedAt: data.updated_at
    });
  } catch (error) {
    console.error('Get network error:', error);
    res.status(500).json({ error: 'Server error fetching network data' });
  }
});

// Save network data
app.put('/api/network', authenticateToken, async (req, res) => {
  try {
    const { nodes, links } = req.body;

    if (!nodes || !links) {
      return res.status(400).json({ error: 'Nodes and links are required' });
    }

    await saveNetworkData(req.user.id, nodes, links);
    res.json({ message: 'Network data saved successfully' });
  } catch (error) {
    console.error('Save network error:', error);
    res.status(500).json({ error: 'Server error saving network data' });
  }
});

// Reset network data to defaults
app.post('/api/network/reset', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    const defaultNodesWithName = [...defaultNodes];
    defaultNodesWithName[0] = { ...defaultNodesWithName[0], name: user?.name || 'Me' };

    await saveNetworkData(req.user.id, defaultNodesWithName, defaultLinks);

    res.json({ 
      message: 'Network data reset successfully',
      nodes: defaultNodesWithName,
      links: defaultLinks
    });
  } catch (error) {
    console.error('Reset network error:', error);
    res.status(500).json({ error: 'Server error resetting network data' });
  }
});

// Serve static files in production
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(join(distPath, 'index.html'));
  });
  console.log('📁 Serving static files from dist/');
}

// Initialize and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    if (pool) {
      console.log('📦 Connected to PostgreSQL database');
    } else {
      console.log('💾 Using in-memory storage (no DATABASE_URL)');
    }
  });
});
