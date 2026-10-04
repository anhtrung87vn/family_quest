-- Migration 0023: Add name_vi / description_vi to tasks and rewards
-- for system templates so child-facing UI can show Vietnamese names.
-- Family-created tasks/rewards remain single-language (as entered by parent).

alter table tasks
  add column if not exists name_vi text,
  add column if not exists description_vi text;

alter table rewards
  add column if not exists name_vi text,
  add column if not exists description_vi text;

-- ─── System task templates — Vietnamese translations ─────────────────────────

update tasks set name_vi = 'Dọn Giường', description_vi = 'Tự dọn giường gọn gàng mỗi sáng'
  where is_system_template = true and name = 'Make My Bed';

update tasks set name_vi = 'Dọn Đồ Đạc', description_vi = 'Tự cất đồ đạc vào đúng chỗ mà không cần nhắc'
  where is_system_template = true and name = 'Put Away Belongings';

update tasks set name_vi = 'Dọn Bát Đĩa', description_vi = 'Tự dọn bát đĩa sau khi ăn'
  where is_system_template = true and name = 'Clear My Plate';

update tasks set name_vi = 'Bỏ Quần Áo Bẩn', description_vi = 'Bỏ quần áo bẩn vào giỏ đúng chỗ'
  where is_system_template = true and name = 'Put Dirty Clothes Away';

update tasks set name_vi = 'Đánh Răng', description_vi = 'Đánh răng sáng và tối'
  where is_system_template = true and name = 'Brush Teeth';

update tasks set name_vi = 'Chăm Sóc Cây', description_vi = 'Tưới cây hoặc chăm sóc cây trong nhà'
  where is_system_template = true and name = 'Take Care of Plants';

update tasks set name_vi = 'Chuẩn Bị Cặp Sách', description_vi = 'Chuẩn bị cặp sách cho ngày hôm sau mà không cần nhắc nhở'
  where is_system_template = true and name = 'Prepare School Bag';

update tasks set name_vi = 'Sắp Xếp Bàn Học', description_vi = 'Giữ bàn học gọn gàng ngăn nắp'
  where is_system_template = true and name = 'Keep Desk Organized';

update tasks set name_vi = 'Làm Bài Tập', description_vi = 'Hoàn thành bài tập về nhà trước giờ ăn tối'
  where is_system_template = true and name = 'Finish Homework';

update tasks set name_vi = 'Gấp Quần Áo', description_vi = 'Gấp quần áo sạch và để vào tủ'
  where is_system_template = true and name = 'Fold My Clothes';

update tasks set name_vi = 'Dọn Phòng', description_vi = 'Dọn dẹp phòng ngủ sạch sẽ'
  where is_system_template = true and name = 'Clean My Room';

update tasks set name_vi = 'Kiểm Soát Thời Gian Màn Hình', description_vi = 'Tự tắt máy khi hết giờ mà không cần nhắc'
  where is_system_template = true and name = 'Screen Time Self-Control';

update tasks set name_vi = 'Ngủ Đúng Giờ', description_vi = 'Lên giường đúng giờ mà không cần nhắc'
  where is_system_template = true and name = 'Sleep on Time';

update tasks set name_vi = 'Đọc Sách 20 Phút', description_vi = 'Đọc sách phù hợp lứa tuổi trong ít nhất 20 phút'
  where is_system_template = true and name = 'Read 20 Minutes';

update tasks set name_vi = 'Đọc Sách 30 Phút', description_vi = 'Đọc sách phù hợp lứa tuổi trong ít nhất 30 phút'
  where is_system_template = true and name = 'Read 30 Minutes';

update tasks set name_vi = 'Đọc Tiếng Anh', description_vi = 'Đọc sách tiếng Anh ít nhất 15 phút'
  where is_system_template = true and name = 'English Reading';

update tasks set name_vi = 'Học 5 Từ Mới', description_vi = 'Học 5 từ tiếng Anh mới và dùng chúng trong câu'
  where is_system_template = true and name = 'Learn 5 New English Words';

update tasks set name_vi = 'Học 10 Từ Mới', description_vi = 'Học 10 từ tiếng Anh mới và dùng chúng trong câu'
  where is_system_template = true and name = 'Learn 10 New English Words';

update tasks set name_vi = 'Luyện Nói Tiếng Anh', description_vi = 'Luyện nói tiếng Anh ít nhất 5 phút'
  where is_system_template = true and name = 'English Speaking Practice';

update tasks set name_vi = 'Luyện Toán', description_vi = 'Làm bài tập toán hoặc luyện toán 15 phút'
  where is_system_template = true and name = 'Math Practice';

update tasks set name_vi = 'Luyện Chữ Đẹp', description_vi = 'Luyện viết chữ đẹp một trang'
  where is_system_template = true and name = 'Beautiful Handwriting';

update tasks set name_vi = 'Kể Điều Học Được', description_vi = 'Kể cho ba/mẹ nghe điều con học được hôm nay'
  where is_system_template = true and name = 'Tell Me What You Learned';

update tasks set name_vi = 'Ôn Bài Hôm Nay', description_vi = 'Ôn lại bài học trong ngày trước khi đi ngủ'
  where is_system_template = true and name = 'Review Today''s Lessons';

update tasks set name_vi = 'Luyện Nhạc', description_vi = 'Luyện nhạc cụ ít nhất 15 phút'
  where is_system_template = true and name = 'Music Practice';

update tasks set name_vi = 'Chuẩn Bị Cho Ngày Mai', description_vi = 'Chuẩn bị quần áo và đồ dùng cho ngày hôm sau'
  where is_system_template = true and name = 'Prepare for Tomorrow';

update tasks set name_vi = 'Giúp Đỡ Người Khác', description_vi = 'Chủ động giúp đỡ một thành viên trong gia đình'
  where is_system_template = true and name = 'Help Someone';

update tasks set name_vi = 'Làm Việc Nhà', description_vi = 'Hoàn thành một việc nhà được giao'
  where is_system_template = true and name = 'Family Chores';

update tasks set name_vi = 'Gọi Ông Bà', description_vi = 'Gọi điện thăm ông bà hoặc người thân'
  where is_system_template = true and name = 'Call Grandparents';

update tasks set name_vi = 'Chia Sẻ Điều Tốt', description_vi = 'Chia sẻ điều tốt đẹp đã làm trong ngày'
  where is_system_template = true and name = 'Share Something Good';

update tasks set name_vi = 'Tập Thể Dục 20 Phút', description_vi = 'Tập thể dục hoặc vận động ít nhất 20 phút'
  where is_system_template = true and name = 'Exercise 20 Minutes';

update tasks set name_vi = 'Chơi Ngoài Trời', description_vi = 'Chơi ngoài trời ít nhất 30 phút'
  where is_system_template = true and name = 'Outdoor Play';

update tasks set name_vi = 'Đạp Xe', description_vi = 'Đạp xe ít nhất 20 phút'
  where is_system_template = true and name = 'Bike Ride';

update tasks set name_vi = 'Tập Bơi', description_vi = 'Tham gia buổi tập bơi'
  where is_system_template = true and name = 'Swimming Practice';

update tasks set name_vi = 'Ăn Vặt Lành Mạnh', description_vi = 'Chọn một món ăn vặt lành mạnh thay vì đồ ngọt'
  where is_system_template = true and name = 'Healthy Snack Choice';

-- ─── Choice pool tasks ───────────────────────────────────────────────────────

update tasks set name_vi = 'Tìm Hiểu Về Một Đất Nước', description_vi = 'Đọc về một đất nước và chia sẻ 3 điều thú vị'
  where is_system_template = true and name = 'Learn about a country';

update tasks set name_vi = 'Đọc Sách Yêu Thích', description_vi = 'Đọc bất kỳ cuốn sách nào con thích trong 20 phút'
  where is_system_template = true and name = 'Read for fun';

update tasks set name_vi = 'Học 5 Từ Mới Tiếng Anh', description_vi = 'Học 5 từ tiếng Anh mới và dùng trong câu'
  where is_system_template = true and name = 'Learn 5 new words';

update tasks set name_vi = 'Vẽ Sáng Tạo', description_vi = 'Vẽ hoặc tô màu một bức tranh theo ý thích'
  where is_system_template = true and name = 'Draw something creative';

update tasks set name_vi = 'Luyện Tiếng Anh', description_vi = 'Luyện nói hoặc viết tiếng Anh 10 phút'
  where is_system_template = true and name = 'Practice English';

update tasks set name_vi = 'Nhảy Theo Nhạc', description_vi = 'Nhảy theo bài nhạc yêu thích 10 phút'
  where is_system_template = true and name = 'Dance to music';

update tasks set name_vi = 'Xếp Lego', description_vi = 'Xây dựng một thứ gì đó từ Lego hoặc đồ xây dựng'
  where is_system_template = true and name = 'Build with Legos';

update tasks set name_vi = 'Nấu Ăn Cùng Ba/Mẹ', description_vi = 'Giúp nấu hoặc chuẩn bị một bữa ăn đơn giản'
  where is_system_template = true and name = 'Cook something simple';

update tasks set name_vi = 'Hoàn Thành Một Quyển Sách', description_vi = 'Đọc xong và chia sẻ nội dung cuốn sách'
  where is_system_template = true and name = 'Finish One Book';

update tasks set name_vi = 'Dự Án Nghiên Cứu Nhỏ', description_vi = 'Nghiên cứu một chủ đề và trình bày kết quả'
  where is_system_template = true and name = 'Mini Research Project';

update tasks set name_vi = 'Vẽ Gì Đó Sáng Tạo', description_vi = 'Vẽ hoặc tạo ra một tác phẩm nghệ thuật'
  where is_system_template = true and name = 'Draw Something Creative';

update tasks set name_vi = 'Lên Kế Hoạch Tuần', description_vi = 'Lên kế hoạch cho tuần tới'
  where is_system_template = true and name = 'Plan My Week';

update tasks set name_vi = 'Tìm Hiểu Về Một Đất Nước', description_vi = 'Đọc về một đất nước và chia sẻ điều thú vị'
  where is_system_template = true and name = 'Learn About a Country';

-- ─── System reward templates — Vietnamese translations ───────────────────────

update rewards set name_vi = 'Nhãn Dán', description_vi = 'Một nhãn dán vui'
  where is_system_template = true and name = 'Sticker';

update rewards set name_vi = 'Chọn Món Tráng Miệng', description_vi = 'Chọn món tráng miệng yêu thích'
  where is_system_template = true and name = 'Choose Dessert';

update rewards set name_vi = 'Thêm 30 Phút Chơi', description_vi = 'Thêm 30 phút giờ chơi'
  where is_system_template = true and name = 'Extra 30 min screen time';

update rewards set name_vi = 'Chọn Bữa Tối', description_vi = 'Chọn thực đơn bữa tối gia đình'
  where is_system_template = true and name = 'Choose Dinner Menu';

update rewards set name_vi = 'Đi Chơi Cùng Gia Đình', description_vi = 'Chuyến đi chơi cuối tuần cùng gia đình'
  where is_system_template = true and name = 'Family Outing';

update rewards set name_vi = 'Mua Sách Mới', description_vi = 'Chọn một cuốn sách mới'
  where is_system_template = true and name = 'New Book';

update rewards set name_vi = 'Đêm Xem Phim', description_vi = 'Tối xem phim cùng gia đình'
  where is_system_template = true and name = 'Movie Night';

update rewards set name_vi = 'Trò Chơi Điện Tử', description_vi = 'Thêm giờ chơi trò chơi điện tử'
  where is_system_template = true and name = 'Video Game Time';

update rewards set name_vi = 'Gối Ôm Mới', description_vi = 'Một chiếc gối ôm mới'
  where is_system_template = true and name = 'Stuffed Animal';

update rewards set name_vi = 'Phần Thưởng Lớn', description_vi = 'Một phần thưởng đặc biệt do ba/mẹ chọn'
  where is_system_template = true and name = 'Big Reward';

-- ─── System family quest templates — Vietnamese translations ─────────────────

alter table family_quests
  add column if not exists title_vi text,
  add column if not exists description_vi text;

update family_quests set
  title_vi = 'Tuần Đọc Sách Gia Đình',
  description_vi = 'Mọi người đọc sách 20 phút mỗi ngày trong tuần'
  where is_system_template = true and title = 'Family Reading Week';

update family_quests set
  title_vi = 'Dọn Nhà Cuối Tuần',
  description_vi = 'Cùng nhau dọn dẹp nhà cửa vào cuối tuần'
  where is_system_template = true and title = 'Weekend Cleanup';

update family_quests set
  title_vi = 'Thử Thách Không Màn Hình',
  description_vi = 'Không dùng màn hình sau 8 giờ tối trong một tuần'
  where is_system_template = true and title = 'Screen-Free Challenge';
