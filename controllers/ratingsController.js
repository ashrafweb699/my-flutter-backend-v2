const db = require('../db/connection');

const ratingsController = {
  // Create a new rating
  createRating: async (req, res) => {
    try {
      const { 
        booking_id, 
        rated_user_id, 
        rater_user_id, 
        rating, 
        comment, 
        is_driver_rating 
      } = req.body;
      
      // Validate input
      if (!booking_id || !rated_user_id || !rater_user_id || rating === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Insert rating
      const [result] = await db.execute(
        `INSERT INTO ratings 
         (booking_id, rated_user_id, rater_user_id, rating, comment, is_driver_rating) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [booking_id, rated_user_id, rater_user_id, rating, comment || null, is_driver_rating]
      );
      
      // Update average rating for the rated user
      await updateUserAverageRating(rated_user_id);
      
      res.status(201).json({ 
        message: 'Rating saved successfully', 
        rating_id: result.insertId 
      });
      
    } catch (error) {
      console.error('Error saving rating:', error);
      res.status(500).json({ error: 'Failed to save rating' });
    }
  },
  
  // Get average rating for a user
  getAverageRating: async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [rows] = await db.execute(
        `SELECT 
          AVG(rating) as average_rating,
          COUNT(*) as ratings_count
         FROM ratings 
         WHERE rated_user_id = ?`,
        [userId]
      );
      
      if (rows.length === 0) {
        return res.json({ 
          average_rating: 0,
          ratings_count: 0 
        });
      }
      
      res.json({
        average_rating: parseFloat(rows[0].average_rating) || 0,
        ratings_count: parseInt(rows[0].ratings_count) || 0
      });
      
    } catch (error) {
      console.error('Error getting average rating:', error);
      res.status(500).json({ error: 'Failed to get average rating' });
    }
  },
  
  // Get rating history for a user
  getRatingHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 10, offset = 0 } = req.query;
      
      // Get ratings where this user was rated
      const [rows] = await db.execute(
        `SELECT r.*, 
          u.name as rater_name,
          b.pickup_location, 
          b.destination_location,
          b.created_at as booking_date
         FROM ratings r
         LEFT JOIN users u ON r.rater_user_id = u.id
         LEFT JOIN cab_bookings b ON r.booking_id = b.id
         WHERE r.rated_user_id = ?
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, parseInt(limit), parseInt(offset)]
      );
      
      res.json(rows);
      
    } catch (error) {
      console.error('Error getting rating history:', error);
      res.status(500).json({ error: 'Failed to get rating history' });
    }
  }
};

// Helper function to update a user's average rating
async function updateUserAverageRating(userId) {
  try {
    // Calculate the average rating
    const [rows] = await db.execute(
      `SELECT AVG(rating) as average_rating, COUNT(*) as count
       FROM ratings 
       WHERE rated_user_id = ?`,
      [userId]
    );
    
    if (rows.length > 0) {
      const averageRating = rows[0].average_rating || 0;
      const count = rows[0].count || 0;
      
      // Update the user's profile with the new average rating
      await db.execute(
        `UPDATE users 
         SET average_rating = ?, ratings_count = ?
         WHERE id = ?`,
        [averageRating, count, userId]
      );
    }
  } catch (error) {
    console.error('Error updating average rating:', error);
  }
}

module.exports = ratingsController;
