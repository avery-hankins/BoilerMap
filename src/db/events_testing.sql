-- Insert dummy users
INSERT INTO Users (FirstName, LastName, Username, Email, Password, Bio) VALUES
('John', 'Doe', 'johndoe', 'john@example.com', 'hashed_password_1', 'Computer Science student'),
('Jane', 'Smith', 'janesmith', 'jane@example.com', 'hashed_password_2', 'Engineering major'),
('Mike', 'Johnson', 'mikej', 'mike@example.com', 'hashed_password_3', 'Tech enthusiast');

-- Grant Mike admin privileges
INSERT INTO Full_Website_Admins (User_ID) VALUES (3);

-- Insert dummy rooms
INSERT INTO Rooms (Building_Code, Room_Num, RoomCapacity) VALUES
('MATH', '175', 50),
('LWSN', 'B134', 100),
('ARMS', '1109', 30),
('PMU', '320', 200),
('HAMP', '3138', 40);

-- Insert dummy clubs
INSERT INTO Clubs (Name, Description, Auth_ID, Email, Instagram) VALUES
('Purdue Hackers', 'A community of students passionate about technology and building cool projects', 'purdue_hackers_001', 'hello@purduehackers.com', '@purduehackers'),
('Data Science Club', 'Exploring data science, machine learning, and AI', 'data_science_club_002', 'datascience@purdue.edu', '@purduedata'),
('Robotics Club', 'Building autonomous robots and competing in competitions', 'robotics_club_003', 'robotics@purdue.edu', NULL),
('Game Development Club', 'Creating games and learning game design', 'gamedev_club_004', 'gamedev@purdue.edu', '@purduegamedev'),
('Cybersecurity Club', 'Learning about security, CTFs, and ethical hacking', 'cyber_club_005', 'cybersec@purdue.edu', NULL);

-- Insert club admins (adjust User_ID and Club_ID based on your actual IDs)
INSERT INTO Club_Admins (User_ID, Auth_ID) VALUES
(1, 'purdue_hackers_001'),
(2, 'data_science_club_002'),
(3, 'robotics_club_003');

-- Add club admins as members in their respective clubs
INSERT INTO Club_Memberships (User_ID, Club_ID, Role) VALUES
(1, 1, 'Officer'),  -- John Doe is admin/officer of Purdue Hackers
(2, 2, 'Officer'),  -- Jane Smith is admin/officer of Data Science Club
(3, 3, 'Officer');  -- Mike Johnson is admin/officer of Robotics Club

-- Insert bookings and events
-- Booking 1: React Workshop
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(1, 1, 1, DATE_ADD(NOW(), INTERVAL 2 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 2 DAY) + INTERVAL 20 HOUR, 45, 'Introduction to React and Next.js workshop', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(1, LAST_INSERT_ID(), 1, DATE_ADD(NOW(), INTERVAL 2 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 2 DAY) + INTERVAL 20 HOUR, 'Introduction to React and Next.js - Learn modern web development frameworks and build your first application', 0, 0);

-- Booking 2: Machine Learning Workshop
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(2, 2, 2, DATE_ADD(NOW(), INTERVAL 5 DAY) + INTERVAL 19 HOUR, DATE_ADD(NOW(), INTERVAL 5 DAY) + INTERVAL 21 HOUR, 80, 'Machine Learning workshop with Python', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(2, LAST_INSERT_ID(), 2, DATE_ADD(NOW(), INTERVAL 5 DAY) + INTERVAL 19 HOUR, DATE_ADD(NOW(), INTERVAL 5 DAY) + INTERVAL 21 HOUR, 'Machine Learning Workshop - Hands-on session with Python, scikit-learn, and neural networks', 0, 0);

-- Booking 3: Robot Building Competition
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(3, 3, 3, DATE_ADD(NOW(), INTERVAL 7 DAY) + INTERVAL 17 HOUR + INTERVAL 30 MINUTE, DATE_ADD(NOW(), INTERVAL 7 DAY) + INTERVAL 19 HOUR + INTERVAL 30 MINUTE, 25, 'Robot building and programming competition', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(3, LAST_INSERT_ID(), 3, DATE_ADD(NOW(), INTERVAL 7 DAY) + INTERVAL 17 HOUR + INTERVAL 30 MINUTE, DATE_ADD(NOW(), INTERVAL 7 DAY) + INTERVAL 19 HOUR + INTERVAL 30 MINUTE, 'Robot Building Competition - Design and program autonomous robots for obstacle courses', 0, 0);

-- Booking 4: Annual Hackathon
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(4, 1, 1, DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL 22 HOUR, 150, 'Annual 24-hour hackathon event', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(4, LAST_INSERT_ID(), 1, DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 10 DAY) + INTERVAL 22 HOUR, 'Annual Hackathon - 24-hour coding competition with prizes, food, and networking opportunities', 0, 0);

-- Booking 5: Unity Game Engine Tutorial
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(5, 4, 2, DATE_ADD(NOW(), INTERVAL 3 DAY) + INTERVAL 20 HOUR, DATE_ADD(NOW(), INTERVAL 3 DAY) + INTERVAL 22 HOUR, 35, 'Unity game development tutorial', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(5, LAST_INSERT_ID(), 4, DATE_ADD(NOW(), INTERVAL 3 DAY) + INTERVAL 20 HOUR, DATE_ADD(NOW(), INTERVAL 3 DAY) + INTERVAL 22 HOUR, 'Unity Game Engine Tutorial - Create 2D platformer games with C# and Unity', 0, 1);

-- Booking 6: CTF Competition
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(1, 5, 3, DATE_ADD(NOW(), INTERVAL 12 DAY) + INTERVAL 19 HOUR, DATE_ADD(NOW(), INTERVAL 12 DAY) + INTERVAL 21 HOUR, 40, 'Capture The Flag cybersecurity challenge', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(1, LAST_INSERT_ID(), 5, DATE_ADD(NOW(), INTERVAL 12 DAY) + INTERVAL 19 HOUR, DATE_ADD(NOW(), INTERVAL 12 DAY) + INTERVAL 21 HOUR, 'CTF Competition - Capture The Flag cybersecurity challenge for beginners and experts', 0, 0);

-- Booking 7: Data Visualization Workshop
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(2, 2, 1, DATE_ADD(NOW(), INTERVAL 15 DAY) + INTERVAL 18 HOUR + INTERVAL 30 MINUTE, DATE_ADD(NOW(), INTERVAL 15 DAY) + INTERVAL 20 HOUR + INTERVAL 30 MINUTE, 60, 'Data visualization with Python libraries', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(2, LAST_INSERT_ID(), 2, DATE_ADD(NOW(), INTERVAL 15 DAY) + INTERVAL 18 HOUR + INTERVAL 30 MINUTE, DATE_ADD(NOW(), INTERVAL 15 DAY) + INTERVAL 20 HOUR + INTERVAL 30 MINUTE, 'Data Visualization with Python - Learn Matplotlib, Seaborn, and Plotly for beautiful charts', 0, 1);

-- Booking 8: API Development Workshop
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(3, 1, 2, DATE_ADD(NOW(), INTERVAL 8 DAY) + INTERVAL 17 HOUR, DATE_ADD(NOW(), INTERVAL 8 DAY) + INTERVAL 19 HOUR, 30, 'RESTful API development with Node.js', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(3, LAST_INSERT_ID(), 1, DATE_ADD(NOW(), INTERVAL 8 DAY) + INTERVAL 17 HOUR, DATE_ADD(NOW(), INTERVAL 8 DAY) + INTERVAL 19 HOUR, 'API Development Workshop - Build RESTful APIs with Node.js and Express', 0, 0);

-- Booking 9: Indie Game Showcase
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(4, 4, 3, DATE_ADD(NOW(), INTERVAL 20 DAY) + INTERVAL 19 HOUR, DATE_ADD(NOW(), INTERVAL 20 DAY) + INTERVAL 21 HOUR, 50, 'Showcase indie games and get feedback', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(4, LAST_INSERT_ID(), 4, DATE_ADD(NOW(), INTERVAL 20 DAY) + INTERVAL 19 HOUR, DATE_ADD(NOW(), INTERVAL 20 DAY) + INTERVAL 21 HOUR, 'Indie Game Showcase - Present your games and get feedback from fellow developers', 0, 0);

-- Booking 10: Network Security Basics
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(5, 5, 1, DATE_ADD(NOW(), INTERVAL 6 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 6 DAY) + INTERVAL 20 HOUR, 45, 'Introduction to network security', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(5, LAST_INSERT_ID(), 5, DATE_ADD(NOW(), INTERVAL 6 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 6 DAY) + INTERVAL 20 HOUR, 'Network Security Basics - Learn about firewalls, encryption, and penetration testing', 0, 1);

-- Booking 11: Arduino Workshop
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(1, 3, 2, DATE_ADD(NOW(), INTERVAL 14 DAY) + INTERVAL 16 HOUR, DATE_ADD(NOW(), INTERVAL 14 DAY) + INTERVAL 18 HOUR, 28, 'Arduino and IoT project workshop', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(1, LAST_INSERT_ID(), 3, DATE_ADD(NOW(), INTERVAL 14 DAY) + INTERVAL 16 HOUR, DATE_ADD(NOW(), INTERVAL 14 DAY) + INTERVAL 18 HOUR, 'Arduino Workshop - Build circuits and program microcontrollers for IoT projects', 0, 0);

-- Booking 12: Open Source Contributing
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(2, 1, 3, DATE_ADD(NOW(), INTERVAL 4 DAY) + INTERVAL 19 HOUR + INTERVAL 30 MINUTE, DATE_ADD(NOW(), INTERVAL 4 DAY) + INTERVAL 21 HOUR + INTERVAL 30 MINUTE, 55, 'Learn to contribute to open source projects', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(2, LAST_INSERT_ID(), 1, DATE_ADD(NOW(), INTERVAL 4 DAY) + INTERVAL 19 HOUR + INTERVAL 30 MINUTE, DATE_ADD(NOW(), INTERVAL 4 DAY) + INTERVAL 21 HOUR + INTERVAL 30 MINUTE, 'Open Source Contributing - Learn Git, GitHub, and how to contribute to real projects', 0, 0);

-- Booking 13: Deep Learning with TensorFlow
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(3, 2, 1, DATE_ADD(NOW(), INTERVAL 18 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 18 DAY) + INTERVAL 20 HOUR, 70, 'Deep learning and neural networks workshop', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(3, LAST_INSERT_ID(), 2, DATE_ADD(NOW(), INTERVAL 18 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 18 DAY) + INTERVAL 20 HOUR, 'Deep Learning with TensorFlow - Build and train neural networks for image recognition', 0, 0);

-- Booking 14: VR Game Development
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(5, 4, 2, DATE_ADD(NOW(), INTERVAL 9 DAY) + INTERVAL 17 HOUR + INTERVAL 30 MINUTE, DATE_ADD(NOW(), INTERVAL 9 DAY) + INTERVAL 19 HOUR + INTERVAL 30 MINUTE, 32, 'Virtual reality game development basics', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(5, LAST_INSERT_ID(), 4, DATE_ADD(NOW(), INTERVAL 9 DAY) + INTERVAL 17 HOUR + INTERVAL 30 MINUTE, DATE_ADD(NOW(), INTERVAL 9 DAY) + INTERVAL 19 HOUR + INTERVAL 30 MINUTE, 'Virtual Reality Game Development - Create immersive VR experiences with Unity and Unreal', 0, 0);

-- Booking 15: Cloud Computing Workshop
INSERT INTO Bookings (Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(4, 1, 1, DATE_ADD(NOW(), INTERVAL 16 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 16 DAY) + INTERVAL 20 HOUR, 65, 'Introduction to AWS and cloud services', 'PRIMARY_APPROVED');

INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description, Num_RSVPs, IsRecurring) VALUES
(4, LAST_INSERT_ID(), 1, DATE_ADD(NOW(), INTERVAL 16 DAY) + INTERVAL 18 HOUR, DATE_ADD(NOW(), INTERVAL 16 DAY) + INTERVAL 20 HOUR, 'Cloud Computing Workshop - Learn AWS, Azure, and deploy scalable applications', 0, 1);