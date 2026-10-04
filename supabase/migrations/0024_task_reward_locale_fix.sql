-- Migration 0024: Populate name_vi / description_vi using ILIKE (case-insensitive)
-- to cover all name variants actually present in the database.
-- Covers both is_system_template=true rows AND family-cloned rows (is_system_template=false).

-- ─── TASKS — responsibility group ────────────────────────────────────────────

update tasks set name_vi = 'Dọn Giường', description_vi = 'Tự dọn giường gọn gàng mỗi sáng'
  where name ilike '%make%bed%';

update tasks set name_vi = 'Dọn Đồ Đạc', description_vi = 'Tự cất đồ đạc vào đúng chỗ mà không cần nhắc'
  where name ilike '%put away%belongings%'
     or name ilike '%tidy%space%'
     or name ilike '%tidy one%';

update tasks set name_vi = 'Dọn Bát Đĩa', description_vi = 'Tự dọn bát đĩa sau khi ăn'
  where name ilike '%clear%plate%'
     or name ilike '%help with dishes%';

update tasks set name_vi = 'Bỏ Quần Áo Bẩn', description_vi = 'Bỏ quần áo bẩn vào giỏ đúng chỗ'
  where name ilike '%dirty clothes%';

update tasks set name_vi = 'Đánh Răng', description_vi = 'Đánh răng sáng và tối'
  where name ilike '%brush teeth%';

update tasks set name_vi = 'Chăm Sóc Cây', description_vi = 'Tưới cây hoặc chăm sóc cây trong nhà'
  where name ilike '%take care of plant%'
     or name ilike '%water%plant%';

-- ─── TASKS — habit_building group ────────────────────────────────────────────

update tasks set name_vi = 'Chuẩn Bị Cặp Sách', description_vi = 'Chuẩn bị cặp sách cho ngày hôm sau mà không cần nhắc nhở'
  where name ilike '%school bag%'
     or name ilike '%prepare tomorrow%school%';

update tasks set name_vi = 'Sắp Xếp Bàn Học', description_vi = 'Giữ bàn học gọn gàng ngăn nắp'
  where name ilike '%desk organized%';

update tasks set name_vi = 'Làm Bài Tập', description_vi = 'Hoàn thành bài tập về nhà trước giờ ăn tối'
  where name ilike '%finish homework%';

update tasks set name_vi = 'Gấp Quần Áo', description_vi = 'Gấp quần áo sạch và để vào tủ'
  where name ilike '%fold%clothes%';

update tasks set name_vi = 'Dọn Phòng', description_vi = 'Dọn dẹp phòng ngủ sạch sẽ'
  where name ilike '%clean%room%';

update tasks set name_vi = 'Kiểm Soát Thời Gian Màn Hình', description_vi = 'Tự tắt máy khi hết giờ mà không cần nhắc'
  where name ilike '%screen time self%';

update tasks set name_vi = 'Ngủ Đúng Giờ', description_vi = 'Lên giường đúng giờ mà không cần nhắc'
  where name ilike '%sleep on time%';

update tasks set name_vi = 'Uống Đủ Nước', description_vi = 'Uống đủ 8 ly nước trong ngày'
  where name ilike '%drink%water%';

-- ─── TASKS — challenge / learning group ──────────────────────────────────────

update tasks set name_vi = 'Đọc Sách 20 Phút', description_vi = 'Đọc sách phù hợp lứa tuổi trong ít nhất 20 phút'
  where name ilike '%read%20%minute%';

update tasks set name_vi = 'Đọc Sách 30 Phút', description_vi = 'Đọc sách phù hợp lứa tuổi trong ít nhất 30 phút'
  where name ilike '%read%30%minute%';

update tasks set name_vi = 'Đọc Tiếng Anh', description_vi = 'Đọc sách tiếng Anh ít nhất 15 phút'
  where name ilike '%english reading%';

update tasks set name_vi = 'Đọc Sách Yêu Thích', description_vi = 'Đọc bất kỳ cuốn sách nào con thích trong 20 phút'
  where name ilike '%read for fun%';

update tasks set name_vi = 'Học 5 Từ Mới Tiếng Anh', description_vi = 'Học 5 từ tiếng Anh mới và dùng trong câu'
  where name ilike '%learn 5 new%word%'
     or name ilike '%learn%5%english%word%';

update tasks set name_vi = 'Học 10 Từ Mới Tiếng Anh', description_vi = 'Học 10 từ tiếng Anh mới và dùng trong câu'
  where name ilike '%learn 10%word%'
     or name ilike '%learn%10%english%word%';

update tasks set name_vi = 'Luyện Nói Tiếng Anh', description_vi = 'Luyện nói tiếng Anh ít nhất 5 phút'
  where name ilike '%english%speak%';

update tasks set name_vi = 'Luyện Toán', description_vi = 'Làm bài tập toán hoặc luyện toán 15 phút'
  where name ilike '%math practice%';

update tasks set name_vi = 'Luyện Chữ Đẹp', description_vi = 'Luyện viết chữ đẹp một trang'
  where name ilike '%handwriting%';

update tasks set name_vi = 'Kể Điều Học Được', description_vi = 'Kể cho ba/mẹ nghe điều con học được hôm nay'
  where name ilike '%tell me what%learn%';

update tasks set name_vi = 'Ôn Bài Hôm Nay', description_vi = 'Ôn lại bài học trong ngày trước khi đi ngủ'
  where name ilike '%review today%lesson%';

update tasks set name_vi = 'Luyện Nhạc', description_vi = 'Luyện nhạc cụ ít nhất 15 phút'
  where name ilike '%music practice%';

update tasks set name_vi = 'Chuẩn Bị Cho Ngày Mai', description_vi = 'Chuẩn bị quần áo và đồ dùng cho ngày hôm sau'
  where name ilike '%prepare for tomorrow%';

update tasks set name_vi = 'Lên Kế Hoạch Tuần', description_vi = 'Lên kế hoạch cho tuần tới'
  where name ilike '%plan%week%';

update tasks set name_vi = 'Học Điều Thú Vị Về Thế Giới', description_vi = 'Tìm hiểu một điều thú vị và kể lại'
  where name ilike '%learn%fun fact%'
     or name ilike '%watch%documentary%';

update tasks set name_vi = 'Thử Điều Mới', description_vi = 'Thử một hoạt động mới mà con chưa từng làm'
  where name ilike '%try something new%';

-- ─── TASKS — challenge / creative group ──────────────────────────────────────

update tasks set name_vi = 'Tìm Hiểu Về Một Đất Nước', description_vi = 'Đọc về một đất nước và chia sẻ 3 điều thú vị'
  where name ilike '%learn%about%countr%';

update tasks set name_vi = 'Hoàn Thành Một Quyển Sách', description_vi = 'Đọc xong và chia sẻ nội dung cuốn sách'
  where name ilike '%finish one book%'
     or name ilike '%finish%book%';

update tasks set name_vi = 'Dự Án Nghiên Cứu Nhỏ', description_vi = 'Nghiên cứu một chủ đề và trình bày kết quả'
  where name ilike '%mini research%';

update tasks set name_vi = 'Vẽ Sáng Tạo', description_vi = 'Vẽ hoặc tô màu một bức tranh theo ý thích'
  where name ilike '%draw%creative%'
     or name ilike '%draw something%';

update tasks set name_vi = 'Viết Truyện Ngắn', description_vi = 'Viết một câu chuyện ngắn sáng tạo'
  where name ilike '%write%story%';

update tasks set name_vi = 'Làm Đồ Thủ Công', description_vi = 'Tự tay làm một món đồ hoặc sản phẩm sáng tạo'
  where name ilike '%make something%hand%'
     or name ilike '%build%lego%';

update tasks set name_vi = 'Thiết Kế Thiệp', description_vi = 'Thiết kế và vẽ một tấm thiệp cho người thân'
  where name ilike '%design%card%';

-- ─── TASKS — health / exercise group ─────────────────────────────────────────

update tasks set name_vi = 'Tập Thể Dục 20 Phút', description_vi = 'Tập thể dục hoặc vận động ít nhất 20 phút'
  where name ilike '%exercise%20%'
     or name ilike '%exercise for 20%';

update tasks set name_vi = 'Chơi Ngoài Trời', description_vi = 'Chơi ngoài trời ít nhất 30 phút'
  where name ilike '%outdoor%play%'
     or name ilike '%go for a walk%';

update tasks set name_vi = 'Đạp Xe', description_vi = 'Đạp xe ít nhất 20 phút'
  where name ilike '%bike ride%';

update tasks set name_vi = 'Tập Bơi', description_vi = 'Tham gia buổi tập bơi'
  where name ilike '%swimming%';

update tasks set name_vi = 'Ăn Vặt Lành Mạnh', description_vi = 'Chọn một món ăn vặt lành mạnh thay vì đồ ngọt'
  where name ilike '%healthy snack%'
     or name ilike '%choose a healthy snack%'
     or name ilike '%choose%snack%';

-- ─── TASKS — character / family group ────────────────────────────────────────

update tasks set name_vi = 'Giúp Đỡ Người Khác', description_vi = 'Chủ động giúp đỡ một thành viên trong gia đình'
  where name ilike '%help someone%'
     or name ilike '%help%without being asked%'
     or name ilike '%do a kind act%'
     or name ilike '%help someone today%'
     or name ilike '%random act of kindness%';

update tasks set name_vi = 'Gọi Ông Bà', description_vi = 'Gọi điện thăm ông bà hoặc người thân'
  where name ilike '%call grandparent%'
     or name ilike '%call or chat with grandparent%';

update tasks set name_vi = 'Bày Bàn Ăn', description_vi = 'Bày bàn ăn trước bữa cơm'
  where name ilike '%set the table%';

update tasks set name_vi = 'Giúp Nấu Ăn', description_vi = 'Giúp chuẩn bị hoặc nấu một bữa ăn đơn giản'
  where name ilike '%help prepare dinner%'
     or name ilike '%cook%simple%'
     or name ilike '%cook or bake%';

update tasks set name_vi = 'Hút Bụi Phòng', description_vi = 'Hút bụi hoặc dọn sạch một phòng trong nhà'
  where name ilike '%vacuum%';

update tasks set name_vi = 'Nhận Lỗi Thành Thật', description_vi = 'Chủ động nhận lỗi khi mắc sai lầm'
  where name ilike '%admit%mistake%';

update tasks set name_vi = 'Giải Quyết Mâu Thuẫn Bình Tĩnh', description_vi = 'Giải quyết xung đột một cách bình tĩnh và tôn trọng'
  where name ilike '%resolve%conflict%';

update tasks set name_vi = 'Nói Lời Cảm Ơn', description_vi = 'Nói lời cảm ơn chân thành với người thân'
  where name ilike '%say thank you%'
     or name ilike '%write%thank-you%';

update tasks set name_vi = 'Dạy Em Điều Gì Đó', description_vi = 'Kiên nhẫn dạy em một kỹ năng hoặc bài học'
  where name ilike '%teach%sister%'
     or name ilike '%teach someone%'
     or name ilike '%help sister%';

-- ─── REWARDS — system templates ──────────────────────────────────────────────

update rewards set name_vi = 'Đồ Ăn Vặt Yêu Thích', description_vi = 'Chọn một món ăn vặt yêu thích'
  where name ilike '%favorite snack%';

update rewards set name_vi = 'Kem', description_vi = 'Một que kem hoặc ly kem'
  where name ilike '%ice cream%';

update rewards set name_vi = 'Chọn Món Tráng Miệng', description_vi = 'Chọn món tráng miệng tối nay'
  where name ilike '%choose%dessert%';

update rewards set name_vi = 'Chọn Phim Gia Đình', description_vi = 'Chọn bộ phim cho cả nhà cùng xem'
  where name ilike '%choose%movie%'
     or name ilike '%family movie%';

update rewards set name_vi = 'Thêm 20 Phút Màn Hình', description_vi = 'Thêm 20 phút xem màn hình'
  where name ilike '%extra%min%screen%'
     or name ilike '%screen time%';

update rewards set name_vi = 'Đồ Dùng Học Tập Nhỏ', description_vi = 'Một món đồ dùng học tập nhỏ tự chọn'
  where name ilike '%stationery%';

update rewards set name_vi = 'Sổ Tay Dễ Thương', description_vi = 'Một cuốn sổ tay dễ thương để ghi chép'
  where name ilike '%notebook%';

update rewards set name_vi = 'Đồ Chơi Nhỏ', description_vi = 'Một món đồ chơi nhỏ tự chọn'
  where name ilike '%small toy%'
     or name ilike '%toy or accessory%';

update rewards set name_vi = 'Trà Sữa Trân Châu', description_vi = 'Một ly trà sữa trân châu'
  where name ilike '%bubble tea%';

update rewards set name_vi = 'Chọn Bữa Sáng Cuối Tuần', description_vi = 'Chọn thực đơn bữa sáng cuối tuần'
  where name ilike '%weekend breakfast%';

update rewards set name_vi = 'Sách Mới', description_vi = 'Chọn một cuốn sách mới'
  where name ilike '%new book%';

update rewards set name_vi = 'Áo Mới', description_vi = 'Chọn một chiếc áo mới'
  where name ilike '%t-shirt%'
     or name ilike '%new shirt%';

update rewards set name_vi = 'Bộ LEGO Nhỏ', description_vi = 'Một bộ LEGO nhỏ'
  where name ilike '%small lego%';

update rewards set name_vi = 'Bộ LEGO Lớn', description_vi = 'Một bộ LEGO lớn'
  where name ilike '%large lego%';

update rewards set name_vi = 'Đồ Vẽ / Mỹ Thuật', description_vi = 'Bộ đồ vẽ hoặc đồ mỹ thuật'
  where name ilike '%art supplies%';

update rewards set name_vi = 'Đi Ăn Nhà Hàng Yêu Thích', description_vi = 'Đi ăn tại nhà hàng yêu thích'
  where name ilike '%favorite restaurant%';

update rewards set name_vi = 'Đi Rạp Chiếu Phim', description_vi = 'Đi xem phim tại rạp'
  where name ilike '%movie theater%';

update rewards set name_vi = 'Hoạt Động Gia Đình Tự Chọn', description_vi = 'Chọn một hoạt động gia đình vào cuối tuần'
  where name ilike '%family activity%';

update rewards set name_vi = 'Chuyến Đi Ngày', description_vi = 'Một chuyến đi chơi trong ngày cùng gia đình'
  where name ilike '%day trip%';

update rewards set name_vi = 'Công Viên Giải Trí', description_vi = 'Đi công viên giải trí'
  where name ilike '%theme park%';

update rewards set name_vi = 'Nhãn Dán', description_vi = 'Một bộ nhãn dán vui nhộn'
  where name ilike '%sticker%';

update rewards set name_vi = 'Tai Nghe', description_vi = 'Một chiếc tai nghe mới'
  where name ilike '%headphone%';

update rewards set name_vi = 'Đồng Hồ Thông Minh', description_vi = 'Một chiếc đồng hồ thông minh'
  where name ilike '%smart watch%'
     or name ilike '%apple watch%';

update rewards set name_vi = 'Máy Tính Bảng', description_vi = 'Máy tính bảng (iPad hoặc tương đương)'
  where name ilike '%ipad%'
     or name ilike '%tablet%';

update rewards set name_vi = 'Xe Đạp', description_vi = 'Một chiếc xe đạp mới'
  where name ilike '%bicycle%';

update rewards set name_vi = 'Chuyến Du Lịch Đặc Biệt', description_vi = 'Chuyến du lịch đặc biệt cùng gia đình'
  where name ilike '%resort trip%'
     or name ilike '%singapore%'
     or name ilike '%adventure%';

update tasks set name_vi = 'Giúp Em / Anh Chị', description_vi = 'Giúp đỡ anh chị em trong gia đình'
  where name ilike '%help a sibling%';
