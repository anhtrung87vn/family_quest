-- 0042_laundry_and_dishes_templates.sql — Two everyday household templates.
--
-- "Hang the laundry" had no template of its own, and "wash the dishes" only
-- survived as an old, deactivated template. Both are responsibilities:
-- 0 coins / 0 stars per completion, counted toward the weekly responsibility
-- stars. Parents can turn either into a temporary habit if the child resists.

insert into tasks (
  family_id, template_key, name, name_vi, description, description_vi,
  category, skill_domain, behavior_type, availability_type,
  coin_reward, star_reward, difficulty, independence_level,
  min_age, recommended_age, max_age,
  development_goal, development_goal_vi, parent_tip, parent_tip_vi,
  estimated_minutes, recommended_frequency, in_pool, evidence_type,
  requires_approval, requires_supervision, is_system_template, active
) values
  ('00000000-0000-0000-0000-000000000000', 'BQ-LIFE-HANG-LAUNDRY-A08',
   'Hang the Laundry to Dry', 'Phơi Quần Áo',
   'Hang the washed clothes neatly on the rack or line so they dry well',
   'Phơi quần áo đã giặt lên sào hoặc giá phơi cho ngay ngắn để mau khô',
   'responsibility', 'LIFE_HOME', 'responsibility', 'assigned_only',
   0, 0, 2, 'GUIDED',
   7, 8, 12,
   'Take part in caring for the family''s clothes.',
   'Cùng chăm lo quần áo của cả nhà.',
   'Show how to shake out and hang each piece once; let the child do the small items first.',
   'Chỉ con cách giũ và phơi từng món một lần; để con phơi đồ nhỏ trước.',
   15, 'weekly', false, 'photo',
   true, false, true, true),
  ('00000000-0000-0000-0000-000000000000', 'BQ-LIFE-WASH-DISHES-A09',
   'Wash the Dishes', 'Rửa Chén',
   'Wash, rinse and put the dishes on the rack after a meal',
   'Rửa, tráng sạch và úp chén bát lên giá sau bữa ăn',
   'responsibility', 'LIFE_HOME', 'responsibility', 'assigned_only',
   0, 0, 3, 'SUPPORTED',
   8, 9, 14,
   'Contribute to daily family life after meals.',
   'Góp sức vào việc nhà hằng ngày sau bữa ăn.',
   'Start with cups and plastic dishes; leave knives and glass for later.',
   'Bắt đầu với ly và chén nhựa; dao và đồ thủy tinh để sau.',
   15, 'daily', false, 'none',
   true, false, true, true)
on conflict do nothing;
