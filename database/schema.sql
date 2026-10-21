CREATE DATABASE IF NOT EXISTS peersync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE peersync;
CREATE TABLE IF NOT EXISTS Users(user_id INT AUTO_INCREMENT
PRIMARY KEY,
  student_id VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS Profiles(profile_id INT AUTO_INCREMENT
PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  bio VARCHAR(600) DEFAULT '',
  is_volunteer BOOLEAN NOT NULL DEFAULT FALSE,
  categories JSON NULL,
  skills JSON NULL,
  availability JSON NULL,
  support_mode ENUM('Virtual',
  'Face-to-face',
  'Both') NOT NULL DEFAULT 'Both',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES Users(user_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS Support_Requests(request_id INT AUTO_INCREMENT
PRIMARY KEY,
  student_id INT NOT NULL,
  volunteer_id INT NULL,
  category ENUM('Academic',
  'Technology',
  'New Student',
  'General Student') NOT NULL,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  preferred_date DATE NULL,
  preferred_time TIME NULL,
  support_mode ENUM('Virtual',
  'Face-to-face') NOT NULL,
  status ENUM('Pending',
  'Accepted',
  'Rejected',
  'Cancelled',
  'Completed') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES Users(user_id),
  FOREIGN KEY(volunteer_id) REFERENCES Users(user_id));
CREATE TABLE IF NOT EXISTS Volunteer_Matches(match_id INT AUTO_INCREMENT
PRIMARY KEY,
  request_id INT NOT NULL,
  volunteer_id INT NOT NULL,
  match_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_request_volunteer(request_id,
  volunteer_id),
  FOREIGN KEY(request_id) REFERENCES Support_Requests(request_id) ON DELETE CASCADE,
  FOREIGN KEY(volunteer_id) REFERENCES Users(user_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS Feedback(
  feedback_id INT AUTO_INCREMENT
PRIMARY KEY,
  request_id INT NOT NULL UNIQUE,
  student_id INT NOT NULL,
  volunteer_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comments VARCHAR(1000) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY(request_id) REFERENCES Support_Requests(request_id) ON DELETE CASCADE,
  FOREIGN KEY(student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY(volunteer_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
