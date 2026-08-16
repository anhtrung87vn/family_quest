-- 0006_seed_templates.sql — System templates for tasks and rewards.
-- Aligned with Habit.md: Responsibilities → 0 coins/stars, Habits → moderate,
-- Challenges → full rewards, Character/Family → 0 coins + stars recognition.
-- These live under a "system" family (nil UUID) with is_system_template = true.

-- System family sentinel (family_id = 00000000-0000-0000-0000-000000000000)
insert into families(id, name)
values ('00000000-0000-0000-0000-000000000000', 'System Templates')
on conflict (id) do nothing;

-- Delete any existing system task templates so we start fresh
delete from tasks where is_system_template = true
  and family_id = '00000000-0000-0000-0000-000000000000';

-- =========================================================
-- 🌱 RESPONSIBILITIES — things children should do without payment
--    Coins: 0, Stars: 0, no external reward
-- =========================================================
insert into tasks(family_id, name, description, category, coin_reward, star_reward, difficulty, is_system_template)
values
 ('00000000-0000-0000-0000-000000000000','Make My Bed','Make the bed independently every morning','responsibility',0,0,1,true),
 ('00000000-0000-0000-0000-000000000000','Put Away Belongings','Put personal belongings back in their place','responsibility',0,0,1,true),
 ('00000000-0000-0000-0000-000000000000','Clear My Plate','Clear own plate and cup after eating','responsibility',0,0,1,true),
 ('00000000-0000-0000-0000-000000000000','Put Dirty Clothes Away','Put dirty clothes in the laundry basket','responsibility',0,0,1,true),
 ('00000000-0000-0000-0000-000000000000','Brush Teeth','Brush teeth morning and evening','responsibility',0,0,1,true),
 ('00000000-0000-0000-0000-000000000000','Take Care of Plants','Water and tend to the plants','responsibility',0,0,1,true)
on conflict do nothing;

-- =========================================================
-- 🌿 HABIT BUILDING — behaviors temporarily supported by rewards
--    Coins: moderate (will fade over time), Stars: moderate
-- =========================================================
insert into tasks(family_id, name, description, category, coin_reward, star_reward, difficulty, is_system_template)
values
 ('00000000-0000-0000-0000-000000000000','Prepare School Bag','Prepare school bag for the next day without reminder','responsibility',5,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Keep Desk Organized','Keep study desk organized','responsibility',5,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Finish Homework','Finish homework on time independently','learning',5,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Fold My Clothes','Fold clothing items neatly','responsibility',5,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Clean My Room','Clean and organize the bedroom','responsibility',5,2,2,true),
 ('00000000-0000-0000-0000-000000000000','Screen Time Self-Control','Stop screen time at the agreed time without reminder','responsibility',5,2,2,true),
 ('00000000-0000-0000-0000-000000000000','Sleep on Time','Go to bed on time 5 days this week','health',15,5,2,true)
on conflict do nothing;

-- =========================================================
-- 🎯 CHALLENGES — genuine extra effort, full rewards make sense
--    Coins: yes, Stars: yes
-- =========================================================
insert into tasks(family_id, name, description, category, coin_reward, star_reward, difficulty, is_system_template)
values
 -- Learning challenges
 ('00000000-0000-0000-0000-000000000000','Read 20 Minutes','Read an age-appropriate book for at least 20 minutes','learning',5,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Read 30 Minutes','Read for at least 30 minutes','learning',7,2,1,true),
 ('00000000-0000-0000-0000-000000000000','English Reading','Read an English book or story','learning',7,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Learn 5 New English Words','Learn and remember 5 new English words','learning',5,1,2,true),
 ('00000000-0000-0000-0000-000000000000','Learn 10 New English Words','Learn 10 words and use them in sentences','learning',10,3,2,true),
 ('00000000-0000-0000-0000-000000000000','English Speaking Practice','Practice speaking English for 15–20 minutes','learning',10,3,2,true),
 ('00000000-0000-0000-0000-000000000000','Math Practice','Complete extra math problems beyond homework','learning',7,2,2,true),
 ('00000000-0000-0000-0000-000000000000','Beautiful Handwriting','Practice one careful page of handwriting','learning',5,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Tell Me What You Learned','Explain one new thing learned today','learning',5,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Review Today''s Lessons','Review lessons learned during the day','learning',5,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Music Practice','Practice an instrument for 15+ minutes','learning',6,1,2,true),
 -- Big challenges
 ('00000000-0000-0000-0000-000000000000','Finish One Book','Finish one age-appropriate book','learning',40,15,3,true),
 ('00000000-0000-0000-0000-000000000000','Mini Research Project','Research a topic and present the findings','learning',15,5,3,true),
 ('00000000-0000-0000-0000-000000000000','Draw Something Creative','Draw or paint something creative','creativity',5,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Learn About a Country','Research and learn about a new country','learning',5,2,2,true),
 -- Health & activity challenges
 ('00000000-0000-0000-0000-000000000000','Exercise 20 Minutes','Exercise for at least 20 minutes','health',5,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Outdoor Play','Play or exercise outside for 30 minutes','health',5,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Bike Ride','Complete a meaningful bike ride','health',5,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Swimming Practice','Practice swimming with good effort','health',8,2,2,true),
 ('00000000-0000-0000-0000-000000000000','Healthy Snack Choice','Choose a healthy snack voluntarily','health',3,1,1,true),
 -- Self-management challenges (Grade 6+)
 ('00000000-0000-0000-0000-000000000000','Plan My Week','Create a simple school/activity plan for the week','responsibility',10,3,2,true),
 ('00000000-0000-0000-0000-000000000000','Prepare for Tomorrow','Check schedule and prepare school materials','learning',5,1,1,true)
on conflict do nothing;

-- =========================================================
-- ❤️ CHARACTER / FAMILY — kindness & contribution
--    Coins: 0 (not paid work), Stars: yes (recognition)
-- =========================================================
insert into tasks(family_id, name, description, category, coin_reward, star_reward, difficulty, is_system_template)
values
 ('00000000-0000-0000-0000-000000000000','Help Someone','Proactively help a family member','family',0,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Do a Kind Act','Do a kind action without being asked','family',0,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Help Sister','Help sister with something useful','family',0,2,2,true),
 ('00000000-0000-0000-0000-000000000000','Help Family Without Being Asked','Proactively help without being asked','family',0,3,2,true),
 ('00000000-0000-0000-0000-000000000000','Help Sister With Homework','Help sibling with homework','family',0,3,2,true),
 ('00000000-0000-0000-0000-000000000000','Teach Sister Something','Teach younger sister something useful','family',0,3,3,true),
 ('00000000-0000-0000-0000-000000000000','Call Grandparents','Call or spend time talking with grandparents','family',0,2,1,true),
 ('00000000-0000-0000-0000-000000000000','Say Thank You','Express gratitude at an appropriate moment','family',0,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Resolve a Conflict Calmly','Handle a disagreement calmly','family',0,3,3,true),
 ('00000000-0000-0000-0000-000000000000','Admit a Mistake Honestly','Own up to a mistake with honesty','family',0,3,2,true),
 -- Household contribution
 ('00000000-0000-0000-0000-000000000000','Help Set the Table','Help prepare the dining table','family',0,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Help With Dishes','Help clear dishes after a meal','family',0,1,1,true),
 ('00000000-0000-0000-0000-000000000000','Help Prepare Dinner','Help prepare a family meal','family',0,2,2,true),
 ('00000000-0000-0000-0000-000000000000','Vacuum a Room','Vacuum a room in the house','family',0,2,2,true)
on conflict do nothing;

-- Rewards (design §34.1–§34.4)
insert into rewards(family_id, name, description, category, coin_cost, requires_approval, dream_eligible, is_system_template)
values
 -- Small rewards (§34.1)
 ('00000000-0000-0000-0000-000000000000','Sticker','A fun sticker','small',30,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Favorite snack','Choose a favorite snack','small',60,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Ice cream','Enjoy an ice cream treat','small',100,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Choose tonight''s dessert','Pick what dessert the family has','small',100,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Choose family movie','Pick the family movie','small',120,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Extra 20 min screen time','Extra 20 minutes of screen time','small',150,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Small stationery item','A pen, eraser, or notebook','small',150,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Cute notebook','A cute new notebook','small',200,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Small toy','A small toy or trinket','small',300,true,false,true),
 -- Medium rewards (§34.2)
 ('00000000-0000-0000-0000-000000000000','Bubble tea','Bubble tea or favorite drink','medium',250,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Choose weekend breakfast','Pick what the family eats for breakfast','medium',300,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Movie theater','A trip to the movies','medium',500,true,false,true),
 ('00000000-0000-0000-0000-000000000000','New book','A new book of your choice','medium',500,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Small LEGO set','A small LEGO set','medium',700,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Art supplies','Art or craft supplies','medium',700,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Eat at favorite restaurant','Dinner at a favorite restaurant','medium',800,true,false,true),
 ('00000000-0000-0000-0000-000000000000','New T-shirt','A new T-shirt of your choice','medium',1000,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Toy or accessory','A toy or accessory','medium',1000,true,false,true),
 ('00000000-0000-0000-0000-000000000000','Family activity of choice','Choose a family activity','medium',1200,true,false,true),
 -- Large rewards (§34.3)
 ('00000000-0000-0000-0000-000000000000','Large LEGO set','A large LEGO set','large',2000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Nice headphones','A nice pair of headphones','large',2500,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Day trip','Day trip chosen by child','large',2500,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Theme park','Theme park or special activity day','large',3000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Smart watch','A smart watch','large',5000,true,true,true),
 -- Dream rewards (§34.4)
 ('00000000-0000-0000-0000-000000000000','Bicycle','A new bicycle','dream',5000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Apple Watch','Apple Watch or similar device','dream',6000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','iPad','An iPad','dream',8000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Special family resort trip','A special family resort trip','dream',10000,true,true,true),
 ('00000000-0000-0000-0000-000000000000','Singapore Adventure','A family trip to Singapore','dream',15000,true,true,true)
on conflict do nothing;
