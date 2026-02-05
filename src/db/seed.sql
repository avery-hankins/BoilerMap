-- ========================
-- Tags
-- ========================
INSERT INTO Tags (Name) VALUES 
('Music'),
('Fun'),
('Leisure'),
('Off Campus'),
('Education'),
('Athletics');

-- ========================
-- Users
-- ========================
INSERT INTO Users (FirstName, LastName, Username, Email, Password, Bio) VALUES
('Alice', 'Johnson', 'alicej', 'alice@example.com', 'password1', 'Loves music and sports'),
('Bob', 'Smith', 'bobsmith', 'bob@example.com', 'password2', 'Enjoys off-campus activities'),
('Charlie', 'Lee', 'charliel', 'charlie@example.com', 'password3', 'Math major'),
('Diana', 'Nguyen', 'dnguyen', 'diana@example.com', 'password4', 'Club officer');

-- ========================
-- Clubs
-- ========================
INSERT INTO Clubs (Name, Auth_ID, Email, Officer_Email, Instagram, Description) VALUES
('Music Club', 'music-club-auth', 'music@example.com', 'officer1@example.com', '@musicclub', 'For music lovers'),
('Chess Club', 'chess-club-auth', 'chess@example.com', 'officer2@example.com', '@chessclub', 'For chess enthusiasts'),
('Athletics Club', 'athletics-club-auth', 'athletics@example.com', 'officer3@example.com', '@athleticsclub', 'Sports and athletics');

-- ========================
-- Club Admins
-- ========================
INSERT INTO Club_Admins (User_ID, Auth_ID) VALUES
(4, 'music-club-auth'), -- Diana is an admin of Music Club
(4, 'chess-club-auth'); -- Diana is also an admin of Chess Club

-- ========================
-- Club Memberships
-- ========================
INSERT INTO Club_Memberships (User_ID, Club_ID, Role) VALUES
(1, 1, 'Member'),
(2, 2, 'Member'),
(3, 3, 'Treasurer'),
(4, 1, 'Officer');

-- ========================
-- Rooms
-- ========================
INSERT INTO Rooms (Building_Code, Room_Num, RoomCapacity) VALUES
('ENG', '101', 30),
('ENG', '102', 25),
('SCI', '201', 50),
('SCI', '202', 40),
('LIB', '301', 20);

-- ========================
-- Amenities
-- ========================
INSERT INTO Amenities (Name) VALUES
('Projector'),
('Whiteboard'),
('Speaker System'),
('Video Conferencing');

-- ========================
-- Room Amenities
-- ========================
INSERT INTO Room_Amenities (Room_ID, Amenity_ID) VALUES
(1,1),(1,2),(2,2),(3,1),(3,3),(4,2),(4,4),(5,1),(5,4);

-- ========================
-- Posts
-- ========================
INSERT INTO Posts (User_ID, Club_ID, Title, Description, Image_URL) VALUES
(1, NULL, 'Guitar Jam Session', 'Join us for a fun jam session!', NULL),
(NULL, 1, 'Music Club Event', 'Concert on Friday', 'https://example.com/concert.jpg'),
(2, NULL, 'Chess Tournament', 'Register for the chess tournament', NULL);

-- ========================
-- PostTags
-- ========================
INSERT INTO Post_Tags (Post_ID, Tag_ID) VALUES
(1,1),(1,2),(2,1),(2,3),(3,2),(3,5);

-- ========================
-- Bookings
-- ========================
INSERT INTO Bookings (Room_ID, Fallback_Room_ID, Club_ID, User_ID, Start_Time, End_Time, Expected_Attendance, Description, Approval_Status) VALUES
(1, 2, 1, 1, '2025-10-20 14:00:00', '2025-10-20 16:00:00', 20, 'Music practice', 'PRIMARY_APPROVED'),
(3, 4, 2, 2, '2025-10-21 10:00:00', '2025-10-21 12:00:00', 15, 'Chess tournament prep', 'DENIED'),
(5, NULL, 3, 3, '2025-10-22 09:00:00', '2025-10-22 11:00:00', 10, 'Athletics meeting', 'FALLBACK_APPROVED');

-- ========================
-- Events
-- ========================
INSERT INTO Events (Room_ID, Booking_ID, Club_ID, Start_Time, End_Time, Description) VALUES
(1, 1, 1, '2025-10-20 14:00:00', '2025-10-20 16:00:00', 'Music Jam'),
(3, 2, 2, '2025-10-21 10:00:00', '2025-10-21 12:00:00', 'Chess Tournament'),
(5, 3, 3, '2025-10-22 09:00:00', '2025-10-22 11:00:00', 'Athletics Planning');
