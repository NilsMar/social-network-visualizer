import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';

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
  passwordResetTokens: [],
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

// Password reset helper functions
async function createPasswordResetToken(userId, email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  
  if (supabase) {
    // Delete any existing tokens for this user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId);
    
    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({ user_id: userId, email, token, expires_at: expiresAt.toISOString() });
    
    if (error) {
      console.error('Error creating reset token:', error);
      throw new Error(error.message);
    }
  } else {
    // Remove existing tokens for this user
    memoryStore.passwordResetTokens = memoryStore.passwordResetTokens.filter(t => t.user_id !== userId);
    memoryStore.passwordResetTokens.push({
      user_id: userId,
      email,
      token,
      expires_at: expiresAt.toISOString(),
    });
  }
  
  return token;
}

async function findPasswordResetToken(token) {
  if (supabase) {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error finding reset token:', error);
    }
    return data;
  }
  return memoryStore.passwordResetTokens.find(t => t.token === token);
}

async function deletePasswordResetToken(token) {
  if (supabase) {
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('token', token);
  } else {
    memoryStore.passwordResetTokens = memoryStore.passwordResetTokens.filter(t => t.token !== token);
  }
}

async function updateUserPassword(userId, hashedPassword) {
  if (supabase) {
    const { error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating password:', error);
      throw new Error(error.message);
    }
  } else {
    const user = memoryStore.users.find(u => u.id === userId);
    if (user) {
      user.password = hashedPassword;
    }
  }
}

// Email sending helper
async function sendPasswordResetEmail(email, resetUrl) {
  if (RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: 'Reset your password - Social Network',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to set a new password:</p>
            <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #7c6bb8; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          `,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Resend API error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error sending email:', err);
      return false;
    }
  }
  
  // Fallback: log to console in development
  console.log('\n========================================');
  console.log('PASSWORD RESET LINK (email not configured):');
  console.log(resetUrl);
  console.log('========================================\n');
  return true;
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

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await findUserByEmail(email);
    
    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    const token = await createPasswordResetToken(user.id, email);
    const resetUrl = `${APP_URL}?reset=${token}`;
    
    await sendPasswordResetEmail(email, resetUrl);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ error: 'Server error processing password reset request' });
  }
});

// Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const resetToken = await findPasswordResetToken(token);
    
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    // Check if token is expired
    if (new Date(resetToken.expires_at) < new Date()) {
      await deletePasswordResetToken(token);
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    // Hash the new password and update
    const hashedPassword = await bcrypt.hash(password, 10);
    await updateUserPassword(resetToken.user_id, hashedPassword);
    
    // Delete the used token
    await deletePasswordResetToken(token);

    res.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ error: 'Server error resetting password' });
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
