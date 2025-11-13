const db = require('../connection');

async function createSMSGatewayTables() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // otp_outbox
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otp_outbox (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        msisdn VARCHAR(20) NOT NULL,
        message VARCHAR(320) NOT NULL,
        status ENUM('pending','sent','delivered','failed') DEFAULT 'pending',
        attempts INT DEFAULT 0,
        last_error VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (msisdn),
        INDEX (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // sms_gateway_devices
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sms_gateway_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(64) UNIQUE NOT NULL,
        msisdn_slot1 VARCHAR(20) NULL,
        msisdn_slot2 VARCHAR(20) NULL,
        auth_token_hash VARCHAR(255) NOT NULL,
        last_seen_at TIMESTAMP NULL,
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // incoming_payment_sms
    await connection.query(`
      CREATE TABLE IF NOT EXISTS incoming_payment_sms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_id VARCHAR(64) NOT NULL,
        wallet ENUM('jazzcash','easypaisa','bank','unknown') DEFAULT 'unknown',
        raw_text TEXT NOT NULL,
        parsed_tid VARCHAR(64) NULL,
        amount DECIMAL(12,2) NULL,
        currency VARCHAR(8) DEFAULT 'PKR',
        sender_msisdn VARCHAR(20) NULL,
        tx_time TIMESTAMP NULL,
        hash VARCHAR(128) UNIQUE NULL,
        matched_payment_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (parsed_tid),
        INDEX (sender_msisdn),
        INDEX (wallet)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // manual_payment_submissions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS manual_payment_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_id INT NULL,
        wallet ENUM('jazzcash','easypaisa','bank','unknown') DEFAULT 'unknown',
        tid_submitted VARCHAR(64) NOT NULL,
        amount_claimed DECIMAL(12,2) NULL,
        status ENUM('pending','matched','rejected') DEFAULT 'pending',
        matched_sms_id INT NULL,
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (tid_submitted),
        INDEX (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.commit();
    console.log('SMS Gateway tables check/creation completed');
  } catch (e) {
    await connection.rollback();
    console.error('Error creating SMS Gateway tables', e);
    throw e;
  } finally {
    connection.release();
  }
}

module.exports = createSMSGatewayTables;
