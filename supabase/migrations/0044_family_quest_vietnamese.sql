-- 0044_family_quest_vietnamese.sql — Vietnamese titles for family quests.
--
-- Only "Family Reading Week" had title_vi, so the Vietnamese UI showed the
-- other family quests in English. Fill title_vi / description_vi for the
-- templates and their family copies, without overwriting existing text.

update family_quests f set
  title_vi = coalesce(f.title_vi, v.title_vi),
  description_vi = coalesce(f.description_vi, v.description_vi)
from (values
  ('Read 5 Books Together',     'Cùng Đọc 5 Cuốn Sách',          'Cả nhà đọc 5 cuốn sách — mỗi người chọn một cuốn'),
  ('Family Walk Week',          'Tuần Đi Bộ Cả Nhà',             'Cả nhà đi bộ cùng nhau mỗi ngày trong một tuần'),
  ('Screen-Free Evening',       'Buổi Tối Không Màn Hình',       '5 buổi tối cả nhà không dùng màn hình trong tháng này'),
  ('Math Masters',              'Cao Thủ Toán Học',              'Cả nhà hoàn thành 30 buổi luyện toán'),
  ('English Conversation Week', 'Tuần Nói Tiếng Anh',            'Chỉ nói tiếng Anh trong bữa tối suốt 5 ngày'),
  ('Game Night x4',             '4 Tối Chơi Board Game',         '4 tối chơi board game cùng cả nhà trong tháng này'),
  ('Cook Together',             'Cùng Nấu Ăn',                   'Cả nhà cùng nấu một bữa ăn 3 lần'),
  ('Tidy House Challenge',      'Thử Thách Nhà Gọn Gàng',        'Giữ nhà gọn gàng 5 ngày liên tiếp'),
  ('Morning Routine Streak',    'Chuỗi Buổi Sáng Ngăn Nắp',      'Hoàn thành tốt thói quen buổi sáng trong 7 ngày')
) as v(title, title_vi, description_vi)
where f.title = v.title;
