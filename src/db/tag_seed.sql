-- Insert dummy tags
INSERT INTO Tags (Name) VALUES
('Workshop'),
('Competition'),
('Hackathon'),
('Networking'),
('Beginner Friendly'),
('Advanced'),
('Programming'),
('Hardware'),
('Cybersecurity'),
('AI/ML'),
('Web Development'),
('Game Development'),
('Cloud Computing'),
('Data Science'),
('Open Source');

-- Associate tags with events
-- Note: Event_ID values correspond to insertion order (1–15)
-- Adjust if your DB already has existing events.

-- 1: React Workshop
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(1, 1),  -- Workshop
(1, 7),  -- Programming
(1, 11); -- Web Development

-- 2: Machine Learning Workshop
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(2, 1),  -- Workshop
(2, 10), -- AI/ML
(2, 14); -- Data Science

-- 3: Robot Building Competition
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(3, 2),  -- Competition
(3, 8);  -- Hardware

-- 4: Annual Hackathon
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(4, 3),  -- Hackathon
(4, 7),  -- Programming
(4, 5);  -- Beginner Friendly

-- 5: Unity Game Engine Tutorial
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(5, 1),  -- Workshop
(5, 12); -- Game Development

-- 6: CTF Competition
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(6, 2),  -- Competition
(6, 9);  -- Cybersecurity

-- 7: Data Visualization Workshop
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(7, 1),  -- Workshop
(7, 14); -- Data Science

-- 8: API Development Workshop
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(8, 1),  -- Workshop
(8, 7),  -- Programming
(8, 11); -- Web Development

-- 9: Indie Game Showcase
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(9, 4),  -- Networking
(9, 12); -- Game Development

-- 10: Network Security Basics
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(10, 1), -- Workshop
(10, 9); -- Cybersecurity

-- 11: Arduino Workshop
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(11, 1), -- Workshop
(11, 8); -- Hardware

-- 12: Open Source Contributing
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(12, 1),  -- Workshop
(12, 15); -- Open Source

-- 13: Deep Learning with TensorFlow
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(13, 1),  -- Workshop
(13, 10); -- AI/ML

-- 14: VR Game Development
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(14, 1),  -- Workshop
(14, 12); -- Game Development

-- 15: Cloud Computing Workshop
INSERT INTO EventTags (Event_ID, Tag_ID) VALUES
(15, 1),  -- Workshop
(15, 13); -- Cloud Computing
