import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase client initialized');
} else {
  console.log('⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY not found. Using in-memory storage.');
}

// In-memory fallback for development without database
let memoryStore = {
  users: [],
  networkData: [],
  nextUserId: 1,
  nextNetworkId: 1,
};

// Default network data for new users
const defaultNodes = [
  { id: 'me', name: 'Me', group: 'me', details: 'The center of my social universe' },
];
const defaultLinks = [];

// Middleware
app.use(cors({
  origin: true,
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
  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error finding user:', error);
    }
    return data;
  }
  return memoryStore.users.find(u => u.email === email);
}

async function findUserById(id) {
  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error finding user by id:', error);
    }
    return data;
  }
  const user = memoryStore.users.find(u => u.id === id);
  if (user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}

async function createUser(email, hashedPassword, name) {
  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .insert({ email, password: hashedPassword, name })
      .select('id, email, name')
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      throw new Error(error.message);
    }
    return data;
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
  if (supabase) {
    const { data, error } = await supabase
      .from('network_data')
      .select('nodes, links, custom_groups, default_color_overrides, deleted_default_categories, updated_at')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting network data:', error);
    }
    return data;
  }
  return memoryStore.networkData.find(n => n.user_id === userId);
}

async function saveNetworkData(userId, nodes, links, customGroups = {}, defaultColorOverrides = {}, deletedDefaultCategories = []) {
  if (supabase) {
    // Check if record exists
    const { data: existing } = await supabase
      .from('network_data')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      const { error } = await supabase
        .from('network_data')
        .update({ 
          nodes, 
          links, 
          custom_groups: customGroups, 
          default_color_overrides: defaultColorOverrides, 
          deleted_default_categories: deletedDefaultCategories,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating network data:', error);
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase
        .from('network_data')
        .insert({ 
          user_id: userId, 
          nodes, 
          links, 
          custom_groups: customGroups, 
          default_color_overrides: defaultColorOverrides,
          deleted_default_categories: deletedDefaultCategories
        });
      
      if (error) {
        console.error('Error inserting network data:', error);
        throw new Error(error.message);
      }
    }
  } else {
    const existing = memoryStore.networkData.find(n => n.user_id === userId);
    if (existing) {
      existing.nodes = nodes;
      existing.links = links;
      existing.custom_groups = customGroups;
      existing.default_color_overrides = defaultColorOverrides;
      existing.deleted_default_categories = deletedDefaultCategories;
      existing.updated_at = new Date().toISOString();
    } else {
      memoryStore.networkData.push({
        id: memoryStore.nextNetworkId++,
        user_id: userId,
        nodes,
        links,
        custom_groups: customGroups,
        default_color_overrides: defaultColorOverrides,
        deleted_default_categories: deletedDefaultCategories,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: supabase ? 'supabase' : 'in-memory' });
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

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashedPassword, name || email.split('@')[0]);

    const defaultNodesWithName = [...defaultNodes];
    defaultNodesWithName[0] = { ...defaultNodesWithName[0], name: name || 'Me' };
    await saveNetworkData(user.id, defaultNodesWithName, defaultLinks);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Server error during registration', details: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error.message);
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
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get network data
app.get('/api/network', authenticateToken, async (req, res) => {
  try {
    const data = await getNetworkData(req.user.id);
    
    if (!data) {
      const defaultNodesWithName = [...defaultNodes];
      await saveNetworkData(req.user.id, defaultNodesWithName, defaultLinks, {}, {}, []);
      return res.json({ nodes: defaultNodesWithName, links: defaultLinks, customGroups: {}, defaultColorOverrides: {}, deletedDefaultCategories: [] });
    }

    res.json({
      nodes: data.nodes,
      links: data.links,
      customGroups: data.custom_groups || {},
      defaultColorOverrides: data.default_color_overrides || {},
      deletedDefaultCategories: data.deleted_default_categories || [],
      updatedAt: data.updated_at
    });
  } catch (error) {
    console.error('Get network error:', error.message);
    res.status(500).json({ error: 'Server error fetching network data' });
  }
});

// Save network data
app.put('/api/network', authenticateToken, async (req, res) => {
  try {
    const { nodes, links, customGroups = {}, defaultColorOverrides = {}, deletedDefaultCategories = [] } = req.body;

    if (!nodes || !links) {
      return res.status(400).json({ error: 'Nodes and links are required' });
    }

    await saveNetworkData(req.user.id, nodes, links, customGroups, defaultColorOverrides, deletedDefaultCategories);
    res.json({ message: 'Network data saved successfully' });
  } catch (error) {
    console.error('Save network error:', error.message);
    res.status(500).json({ error: 'Server error saving network data' });
  }
});

// Reset network data to defaults
app.post('/api/network/reset', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    const defaultNodesWithName = [...defaultNodes];
    defaultNodesWithName[0] = { ...defaultNodesWithName[0], name: user?.name || 'Me' };

    await saveNetworkData(req.user.id, defaultNodesWithName, defaultLinks, {}, {}, []);

    res.json({ 
      message: 'Network data reset successfully',
      nodes: defaultNodesWithName,
      links: defaultLinks
    });
  } catch (error) {
    console.error('Reset network error:', error.message);
    res.status(500).json({ error: 'Server error resetting network data' });
  }
});

// Export for Vercel
export default app;
