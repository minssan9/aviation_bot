-- Aviation Bot Database Initialization
-- This file creates the necessary tables for the aviation bot

-- Create users table for storing user information
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    language_code VARCHAR(10) DEFAULT 'en',
    is_bot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create aviation_knowledge table for storing aviation facts/questions
CREATE TABLE IF NOT EXISTS aviation_knowledge (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create user_interactions table for tracking user activity
CREATE TABLE IF NOT EXISTS user_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    interaction_type ENUM('command', 'message', 'callback') NOT NULL,
    command VARCHAR(100),
    message_text TEXT,
    response_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create daily_facts table for scheduled content
CREATE TABLE IF NOT EXISTS daily_facts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fact_id INT NOT NULL,
    scheduled_date DATE NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fact_id) REFERENCES aviation_knowledge(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_fact (scheduled_date)
);

-- Insert some sample aviation knowledge
INSERT IGNORE INTO aviation_knowledge (title, content, category, difficulty_level) VALUES
('The Wright Brothers First Flight', 'On December 17, 1903, Orville and Wilbur Wright made the first powered, sustained, and controlled heavier-than-air human flight at Kitty Hawk, North Carolina. The flight lasted 12 seconds and covered 120 feet.', 'History', 'beginner'),
('Lift Generation', 'Aircraft generate lift through the difference in air pressure above and below the wing. This is primarily explained by Bernoulli''s principle and Newton''s third law of motion.', 'Aerodynamics', 'intermediate'),
('Jet Engine Operation', 'A jet engine works on the principle of Newton''s third law - for every action, there is an equal and opposite reaction. Air is sucked in, compressed, mixed with fuel, ignited, and expelled at high speed.', 'Propulsion', 'intermediate');

-- Create indexes for better performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_aviation_knowledge_category ON aviation_knowledge(category);
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_daily_facts_scheduled_date ON daily_facts(scheduled_date);