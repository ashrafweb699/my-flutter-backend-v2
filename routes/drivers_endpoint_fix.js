// Add this endpoint to your drivers routes file
// Location: backend/routes/drivers.js (or wherever driver routes are defined)

// GET driver by user_id
router.get('/by-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 Fetching driver for userId: ${userId}`);
    
    // Query database to get driver by user_id
    const query = 'SELECT * FROM drivers WHERE user_id = ? LIMIT 1';
    
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: err.message
        });
      }
      
      if (results.length === 0) {
        console.log(`⚠️ No driver found for userId: ${userId}`);
        return res.status(404).json({
          success: false,
          message: 'Driver not found for this user'
        });
      }
      
      const driver = results[0];
      console.log(`✅ Found driver: ${driver.id} for userId: ${userId}`);
      
      res.json({
        success: true,
        driver: driver
      });
    });
  } catch (error) {
    console.error('❌ Error in /by-user endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
