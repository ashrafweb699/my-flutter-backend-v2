const db = require('../connection');

async function createRatingsTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        booking_id INT NOT NULL,
        rated_user_id VARCHAR(100) NOT NULL,
        rater_user_id VARCHAR(100) NOT NULL,
        rating DECIMAL(2,1) NOT NULL,
        comment TEXT,
        is_driver_rating BOOLEAN NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (rated_user_id),
        INDEX (booking_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    console.log('Ratings table created or already exists');
    return true;
  } catch (error) {
    console.error('Error creating ratings table:', error);
    throw error;
  }
}

module.exports = createRatingsTable;
