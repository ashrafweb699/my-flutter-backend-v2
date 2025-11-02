const { pool } = require('../../config/db');

module.exports = async function createBusManagerTables() {
  try {
    // bus_managers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bus_managers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(120) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        password VARCHAR(255) NOT NULL,
        transport_name VARCHAR(120) NOT NULL,
        bus_number VARCHAR(60) NOT NULL,
        profile_image_url VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const addColumnIfMissing = async (colName, colDef) => {
      const [rows] = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'bus_managers' AND column_name = ?
      `, [colName]);
      if (rows[0].cnt === 0) {
        await pool.query(`ALTER TABLE bus_managers ADD COLUMN ${colName} ${colDef}`);
        console.log(`Added column bus_managers.${colName}`);
      }
    };
    await addColumnIfMissing('cnic_front_image', 'VARCHAR(255) NULL');
    await addColumnIfMissing('cnic_back_image', 'VARCHAR(255) NULL');
    await addColumnIfMissing("approval_status", "ENUM('pending','approved','rejected') DEFAULT 'pending'");
    await addColumnIfMissing('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // Ensure CNIC column allows NULL (since CNIC number is optional when images are provided)
    const [cnicCol] = await pool.query(`
      SELECT IS_NULLABLE FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'bus_managers' AND column_name = 'cnic'
    `);
    if (cnicCol.length && cnicCol[0].IS_NULLABLE === 'NO') {
      await pool.query(`ALTER TABLE bus_managers MODIFY cnic VARCHAR(40) NULL`);
      console.log('Modified bus_managers.cnic to allow NULL');
    }

    // bus_schedules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bus_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bus_manager_id INT NOT NULL,
        bus_number VARCHAR(60) NOT NULL,
        route_from VARCHAR(80) NOT NULL,
        route_to VARCHAR(80) NOT NULL,
        timing VARCHAR(40) NOT NULL,
        per_seat_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
        available_seats INT NOT NULL DEFAULT 45,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_manager (bus_manager_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // bus_seats
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bus_seats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NOT NULL,
        seat_number INT NOT NULL,
        status ENUM('available','booked') NOT NULL DEFAULT 'available',
        booked_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_schedule_seat (schedule_id, seat_number),
        INDEX idx_schedule (schedule_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // bus_bookings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bus_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bus_manager_id INT NOT NULL,
        schedule_id INT NOT NULL,
        total_seats INT NOT NULL,
        selected_seats TEXT NOT NULL,
        route_from VARCHAR(80) NOT NULL,
        route_to VARCHAR(80) NOT NULL,
        timing VARCHAR(40) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        latitude VARCHAR(64) NULL,
        longitude VARCHAR(64) NULL,
        status ENUM('pending','confirmed','canceled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_schedule (schedule_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Bus manager related tables check/creation completed');
  } catch (error) {
    console.error('Error creating bus manager tables:', error);
  }
}
