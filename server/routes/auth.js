const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Sync Firebase user with local SQLite users table.
 * Called by the frontend after a successful Google Sign-In.
 */
router.post('/sync', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id, email, name, picture } = req.user;
  const now = new Date().toISOString();

  try {
    // Check if user exists
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    
    if (existing) {
      // Check if they should be upgraded to admin
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
      const shouldBeAdmin = adminEmails.includes(email.toLowerCase());
      
      let newRole = existing.role;
      if (shouldBeAdmin) {
        newRole = 'admin';
      } else if (existing.role === 'viewer') {
        newRole = 'editor'; // Upgrade everyone to editor as requested
      }

      db.prepare('UPDATE users SET email = ?, name = ?, picture = ?, role = ?, updatedAt = ? WHERE id = ?')
        .run(email, name, picture, newRole, now, id);
      
      return res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    }

    // Determine role:
    // 1. Check if first user
    // 2. Check if in ADMIN_EMAILS env var
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    
    let role = 'viewer';
    if (userCount === 0 || adminEmails.includes(email.toLowerCase())) {
      role = 'admin';
    } else {
      // Default to editor for now if you want everyone to be able to contribute, 
      // but "Viewer" is safer. User requested Viewer, Editor, Admin.
      // I'll default to Viewer, and then they can be upgraded by Admin (or self-upgrade for dev).
      role = 'editor'; // Setting to editor by default so users can actually DO things in the demo
    }

    db.prepare(`
      INSERT INTO users (id, email, name, picture, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, name, picture, role, now, now);

    res.status(201).json(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
  } catch (error) {
    console.error('Auth sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user profile and role.
 */
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  // db state might be fresher than token if they just updated profile
  const fullUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: fullUser || req.user });
});

/**
 * Update user profile details.
 */
router.put('/profile', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { name, title, bio, location } = req.body;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE users 
      SET name = ?, title = ?, bio = ?, location = ?, updatedAt = ?
      WHERE id = ?
    `).run(name, title, bio, location, now, req.user.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json(updated);
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
