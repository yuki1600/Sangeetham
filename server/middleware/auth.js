const admin = require('firebase-admin');
const db = require('../db');

/**
 * Middleware to verify the Firebase ID Token from a cookie or Authorization header.
 */
async function authenticateUser(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get/Sync user from local database
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(decodedToken.uid);
    
    if (!user) {
      // If user doesn't exist in local DB, they might be authenticated but not synced.
      // We'll allow next() but role will be missing.
      // Ideally, /api/auth/sync is called first.
      user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        role: 'viewer'
      };
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying token:', error.message);
    req.user = null;
    next();
  }
}

/**
 * Middleware to restrict access to specific roles.
 * @param {string[]} allowedRoles 
 */
function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

module.exports = {
  authenticateUser,
  authorizeRole
};
