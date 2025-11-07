-- Create call_logs table for tracking voice/video calls
CREATE TABLE IF NOT EXISTS call_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    caller_id INT NOT NULL,
    receiver_id INT NOT NULL,
    call_type ENUM('voice', 'video') NOT NULL,
    room_id VARCHAR(255) NOT NULL,
    status ENUM('initiated', 'answered', 'rejected', 'ended', 'missed') DEFAULT 'initiated',
    duration INT DEFAULT 0 COMMENT 'Call duration in seconds',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    
    FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_caller (caller_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_room (room_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
