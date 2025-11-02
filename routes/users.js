const router = require('express').Router();
const db = require('../db/connection');
const usersController = require('../controllers/usersController');

// GET /api/users -> return list of all users (admin only)
router.get('/', usersController.getAllUsers);

// GET /api/users/count -> return { count }
router.get('/count', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT COUNT(*) AS count FROM users');
    res.json({ count: rows[0]?.count ?? 0 });
  } catch (e) {
    console.error('❌ users.count error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/type/:type -> get users by type (customer, vendor, driver, admin)
router.get('/type/:type', usersController.getUsersByType);

// GET /api/users/:id -> get single user
router.get('/:id', usersController.getUserById);

// PUT /api/users/:id -> update user (admin only)
router.put('/:id', usersController.updateUser);

// DELETE /api/users/:id -> delete user (admin only)
router.delete('/:id', usersController.deleteUser);

module.exports = router;
