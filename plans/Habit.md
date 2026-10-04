BloomQuest — Motivation-Safe Task System Implementation Plan
1. Objective

Refactor the current task/reward model so BloomQuest does not teach children that every good behavior must be paid with Quest Coins.

The system should distinguish between:

🌱 Responsibilities
Things the child should gradually learn to do without rewards

🌿 Habit Building
Behaviors temporarily supported by rewards, then gradually faded

🎯 Challenges
Extra effort that can earn Quest Coins and Stars

✨ Choice Quests
Optional challenges chosen by the child from a Quest Pool

❤️ Character / Family Contribution
Kindness and contribution, emphasizing recognition over payment

👭 Family Quests
Shared cooperative goals

Core philosophy:

Reward
   ↓
Build Habit
   ↓
Reduce External Reward
   ↓
Internalize
   ↓
Graduate to Responsibility

The final goal is:

BloomQuest should eventually make some rewards unnecessary.

2. Important Backward Compatibility Rule

Do not break the current task completion, approval, Coins, Stars, reward redemption, or existing task UI.

Current behavior must continue working after migration.

Add new behavior incrementally.

For existing tasks, default to:

behavior_type = challenge
reward_policy = fixed
availability_type = assigned

This preserves current behavior.

Do not automatically remove Coins from existing family tasks.

Only new system templates should receive the new recommended behavior configuration.

Parents can later convert an existing task manually.

3. Task Behavior Types

Add a field conceptually equivalent to:

behavior_type

Allowed values:

responsibility
habit_building
challenge
character
family
responsibility

Examples:

Make own bed
Put dirty clothes away
Prepare school bag
Clear own plate
Keep personal things organized

Default:

Coins: 0
Stars: 0

The child can still mark the responsibility complete.

It contributes to:

Consistency
Habit progress
Weekly reflection
Badges
Parent recognition

but does not behave like paid work.

habit_building

Used when the behavior is not yet established.

Examples:

Prepare school bag without reminder
Read regularly
Keep desk organized
Sleep on time
Manage screen time independently

Initially:

🪙 Coins
⭐ Stars

Later rewards can decrease.

Eventually it can graduate to:

🌱 Responsibility
challenge

Used for genuine extra effort.

Examples:

Read an extra 30 minutes
Learn 10 new English words
Mini research project
Extra music practice
Finish a book
Learn about a country
Exercise challenge

Default:

Coins: Yes
Stars: Yes

These are the main tasks where Quest Coins make sense.

character

Examples:

Help sister
Help grandparents
Do something kind
Help family without being asked
Resolve disagreement calmly

Default recommendation:

Coins: 0 or low
Stars: Yes
Parent recognition: Strongly encouraged

Do not make kindness feel like paid work.

family

Examples:

Clean living room together
Prepare dinner together
Family walk
Help grandparents together

Reward may be:

Stars
Experience progress
Small Coins
Family recognition

depending on configuration.

4. Separate Behavior Type from Assignment Type

Do not mix:

"What kind of behavior is this?"

with:

"Who chooses this task?"

Add another field:

availability_type

Allowed values:

assigned_only
choice_pool
both

Examples:

Prepare school bag
behavior_type = responsibility
availability_type = assigned_only
Learn about a country
behavior_type = challenge
availability_type = choice_pool
Read 30 minutes
behavior_type = challenge
availability_type = both
5. Child Home Screen Structure

Change Child Home into four conceptual sections.

Section 1 — Responsibilities
🌱 VIỆC CON TỰ LÀM

🎒 Prepare school bag       ✅
🧹 Keep my room tidy        ○
🍽 Clear my plate           ✅

Do not show:

🪙 +5

for normal responsibilities.

Optional copy:

Những việc con tự làm vì con đang lớn lên 🌱
Section 2 — Today's Core Quests

Keep approximately 2–3 important quests.

Example:

🎯 NHIỆM VỤ HÔM NAY

📚 Read 20 minutes
🪙 +5   ⭐ +1
[ ✅ Xong rồi! ]

🎵 Music practice
🪙 +6   ⭐ +1
[ ✅ Xong rồi! ]
Section 3 — Choice Quest Pool

Replace the current concept:

✨ Kiếm thêm

with:

✨ CHỌN THỬ THÁCH

English:

✨ Pick a Quest

Example:

🌍 Learn about a country
🪙 +5 ⭐ +1
[ 🙋 Con chọn! ]

🎨 Draw something creative
🪙 +5 ⭐ +2
[ 🙋 Con chọn! ]

❤️ Help somebody
⭐ +2
[ 🙋 Con chọn! ]

After child selects one:

✨ BERRY ĐÃ CHỌN

🌍 Learn about a country
🪙 +5 ⭐ +1

[ ✅ Xong rồi! ]
Section 4 — Family / Character

Optionally show:

❤️ GIA ĐÌNH

👭 Help your sister
⭐ +2

❤️ Parent recognition available

Do not make Coins the primary visual element here.

6. Quest Pool Rules

Add configurable limits per child.

Suggested defaults:

Berry
Grade: 3

Quest Pool options shown:
4

Rewarded choice quests/day:
1
July
Grade: 6

Quest Pool options shown:
6

Rewarded choice quests/day:
2

Do not display the entire system task catalog.

The database may contain 50+ pool tasks, but UI should recommend only a small rotating selection.

7. Quest Pool Recommendation Logic — V1

Do not implement AI recommendations yet.

Use deterministic rule-based selection.

Example:

Pick up to:

1 Learning
1 Creativity / Explore
1 Responsibility / Life Skill
1 Character / Family

Exclude:

Tasks completed recently
Tasks exceeding daily limit
Tasks not recommended for the child's grade
Disabled tasks
Tasks unavailable for current mode

Optional later:

Prefer tasks the child likes
Avoid repeating the same tasks every day
8. Claiming a Choice Quest

When child taps:

🙋 Con chọn!

server should:

Validate child is allowed to choose the task.
Validate daily choice limit.
Validate task availability.
Validate completion limits.
Create a task assignment for today.
Mark source as choice_pool.
Return the claimed quest.
Move it to the child's active quests.

Suggested assignment field:

assignment_source

Values:

parent
choice_pool
family
system
9. Approval Logic

Keep existing:

requires_approval

This remains the source of truth.

If true
Child Done
   ↓
SUBMITTED
   ↓
Parent Approval
   ↓
Coins / Stars
If false
Child Done
   ↓
Server validation
   ↓
Auto Complete
   ↓
Coins / Stars

Important:

Auto approval must never mean client-side reward calculation.

Server must still verify:

Task active?
Assignment valid?
Already rewarded?
Daily limit reached?
Weekly limit reached?
Choice Quest quota reached?

Only then create:

coin_transaction
star_transaction
10. Anti-Farming Rules

Each rewarded task should support:

max_rewarded_per_day
max_rewarded_per_week

Example:

Water the plants

Max rewarded:
1/day

Choice Quest system should also have a child-level quota.

Example:

Berry:
1 rewarded Choice Quest/day

July:
2 rewarded Choice Quests/day

Children may still perform additional positive activities, but BloomQuest should not produce unlimited Coins.

11. Habit Building Reward Fade

Introduce a per-child reward state.

Do not store habit stage only on tasks, because July and Berry may progress differently on the same task.

Add a new table conceptually similar to:

child_task_reward_progress

Suggested fields:

id
child_id
task_id

reward_stage

started_at
stage_changed_at
graduated_at

created_at
updated_at

Allowed reward_stage:

full_reward
reduced_reward
stars_only
graduated
12. Reward Fade Behavior

Example:

Prepare School Bag
Stage 1
full_reward

🪙 +5
⭐ +2
Stage 2
reduced_reward

🪙 +2
⭐ +2
Stage 3
stars_only

⭐ +1
Stage 4
graduated

🌱 Responsibility
No Coins
No regular Stars

Do not automatically change stage without parent control in V1.

Parent initiates transition.

13. Parent UX — Graduate Habit

On Parent Task/Child detail screen provide:

🎒 Prepare school bag

Current:
🌿 Habit Building

Completed independently:
18 times

[ Reduce Reward ]

[ ⭐ Stars Only ]

[ 🌱 Make This a Responsibility ]

When parent chooses:

🌱 Make This a Responsibility

show confirmation:

July has been doing this independently.

This task will become a normal responsibility.

Regular Quest Coin rewards will stop.

[ Cancel ]
[ Graduate Habit ]
14. Child Celebration When a Habit Graduates

Do not communicate:

"You no longer get Coins."

Instead:

🌟 NEW HABIT!

You prepared your school bag
by yourself again and again.

You mastered it! 🎉

This is now one of your:

🌱 MY RESPONSIBILITIES

You're growing up! 💪

Vietnamese:

🌟 THÓI QUEN MỚI!

Con đã tự chuẩn bị cặp rất nhiều lần.

Con đã làm chủ được việc này! 🎉

Từ giờ đây là:

🌱 VIỆC CON TỰ LÀM

Con đang lớn lên mỗi ngày! 💪

This should be presented as progression, not loss.

15. Parent Task Creation Form

Add a section:

MỤC TIÊU HÀNH VI

Options:

🌱 Trách nhiệm
🌿 Xây dựng thói quen
🎯 Thử thách
❤️ Phẩm chất / giúp đỡ
👭 Gia đình

Then:

CÁCH SỬ DỤNG

○ Bố mẹ giao
○ Con tự chọn
○ Cả hai

Then:

PHẦN THƯỞNG

🪙 Quest Coins
⭐ Stars

For responsibility, default:

Coins = 0
Stars = 0

For habit_building:

Coins = configurable
Stars = configurable
Enable reward fading

For challenge:

Coins = configurable
Stars = configurable

For character:

Coins = 0 by default
Stars = configurable

Parent may override defaults.

16. Parent Templates

Update system templates with sensible presets.

Examples:

Make My Bed
behavior_type:
responsibility

availability:
assigned_only

coin_reward:
0

star_reward:
0
Prepare School Bag
behavior_type:
habit_building

availability:
both

coin_reward:
5

star_reward:
2
Read Extra 30 Minutes
behavior_type:
challenge

availability:
choice_pool

coin_reward:
7

star_reward:
2
Mini Research Project
behavior_type:
challenge

availability:
choice_pool

coin_reward:
15

star_reward:
5

requires_approval:
true
Help Sister
behavior_type:
character

availability:
both

coin_reward:
0

star_reward:
2

requires_approval:
true
17. Review Existing Tasks

Current examples should be reconsidered as follows.

Current task	Recommended behavior
Read 20 minutes	Challenge if extra reading; Responsibility if mandatory
Read 30 minutes	Challenge / Choice Quest
Tidy your room	Habit Building → eventually Responsibility
Water the plants	Responsibility or Family Contribution
Help fold laundry	Family Contribution / Character
Music practice	Habit Building if required; Challenge if extra
Sleep on time	Habit Building → Responsibility
Learn about a country	Challenge + Choice Pool

Avoid permanently paying Coins for:

Sleep on time
Make bed
Brush teeth
Clear own plate
Put away own belongings
18. Change “Sleep on Time”

Instead of:

Sleep on time
+3 Coins every day

prefer:

🌙 Bedtime Hero

Go to bed on time
5 days this week

Reward:
🪙 +15
⭐ +5

Then eventually graduate the behavior.

This rewards consistency while learning the habit, not basic behavior forever.

19. Stars Policy

Stars should not simply become another form of money.

Use Stars primarily for:

Levels
Badges
Adventure Map
Collections
Avatar Frames
Milestones

For normal Responsibilities:

No Star reward per completion

Instead, milestone achievements may award Stars.

Example:

Prepare school bag independently
10 times

🏆 Independent Kid
⭐ +15

This reduces point-dependency.

20. Parent Recognition

Recognition should become a first-class part of the system.

When parent approves a task:

✅ Approve

allow optional:

❤️ Add encouragement

Quick options:

🌟 Great job!
💪 I noticed your effort!
❤️ Thank you for helping!
📚 Great reading!
🚀 Keep going!

or custom message.

21. Child Approval Celebration

When Berry receives an approved task:

🎉 BỐ/MẸ ĐÃ DUYỆT!

📚 Read 20 Minutes

🪙 +5
⭐ +1

❤️ Bố nhắn:

"Con tự giác đọc sách hôm nay,
bố rất vui!"

Recognition should be visually more prominent than the Coin animation.

22. Parent Messages

Implement a table conceptually similar to:

parent_messages

Fields:

id
family_id
child_id
parent_user_id

message_type
message

reference_type
reference_id

created_at
read_at
reaction

Message types:

QUEST_APPROVAL
WEEKLY_JOURNAL
GENERAL_ENCOURAGEMENT
ACHIEVEMENT
DREAM_MILESTONE
23. Child Message UI

Home may show the latest unread message:

💌 BỐ NHẮN

"Con hôm nay tự giác học rất tốt!"

❤️

Của con page should provide:

💌 Lời nhắn từ bố mẹ
[ Xem tất cả ]

Do not build a full chat system.

Child reaction can be limited to:

❤️
😊
🌟
24. Weekly Journal Child View

Existing Parent Weekly Journal must become visible to the child.

Parent wording should change from:

Cần cải thiện

to:

🌱 Điều mình có thể thử tốt hơn tuần tới

Child view:

📖 TUẦN CỦA BERRY

🎯 14 nhiệm vụ
🪙 +70 Xu
⭐ +18 Sao

🌟 Điều bố mẹ tự hào

"Con đã tự chuẩn bị đồ học
4 ngày liên tiếp."

🌱 Tuần tới mình thử

"Đọc sách đều hơn một chút nhé."

❤️ Lời nhắn

"Bố mẹ thấy con đã cố gắng rất nhiều."
25. Analytics for Parents

Later, Parent Dashboard should help identify over-reliance on Coins.

Useful indicators:

% task completions with Coins
% responsibilities without Coins
Choice Quests selected
Habits graduated
Parent recognition messages

Example:

Berry this month

🌱 Responsibilities      42 completions
🎯 Rewarded Challenges   18 completions
✨ Self-chosen Quests      9
🌿 Habits Graduated        2
❤️ Parent Messages        11

Avoid ranking July against Berry.

26. Database Migration Strategy

Implement migration safely.

Step 1

Add fields with backward-compatible defaults:

behavior_type
availability_type
max_rewarded_per_day
max_rewarded_per_week

Suggested defaults:

behavior_type = challenge
availability_type = assigned_only

Existing behavior remains unchanged.

Step 2

Create:

child_task_reward_progress
parent_messages
Step 3

Update system templates only.

Do not automatically rewrite family-created tasks.

Step 4

Add Parent UI allowing existing tasks to be reclassified manually.

27. Server-Side Rules

All reward logic must remain server-side.

Never trust:

coin_reward
star_reward
completion_count
reward_stage

coming from the browser.

Server should load those from database.

Before reward:

Validate authenticated child session
Validate assignment
Validate child ownership
Validate completion limit
Validate reward stage
Validate requires_approval
Validate duplicate transaction

Then create idempotent transactions.

28. Idempotency

Existing duplicate-protection requirements remain mandatory.

A completion must not produce rewards twice.

Conceptually:

UNIQUE(
  reference_type,
  reference_id,
  transaction_type
)

This applies to both:

coin_transactions
star_transactions
29. Implementation Phases
Phase 1 — Behavior Types

Implement:

behavior_type
availability_type
Parent configuration
Responsibility UI

No Quest Pool yet.

Acceptance:

Parent can classify tasks.
Responsibilities display without Coins.
Existing tasks continue functioning.
Phase 2 — Choice Quest Pool

Implement:

Choice Quest templates
Child Pick a Quest
Claim flow
Daily limits
Rule-based selection

Acceptance:

Berry can choose one quest.
July can choose configured number.
Claimed quest becomes an assignment.
Coins cannot be farmed.
Phase 3 — Habit Fading

Implement:

child_task_reward_progress
Reward stages
Parent Reduce Reward
Graduate Habit
Child graduation celebration

Acceptance:

full_reward
→ reduced_reward
→ stars_only
→ graduated

works independently per child.

Phase 4 — Recognition

Implement:

Approval messages
Parent messages
Child celebration
Message history

Acceptance:

Parent can approve without typing a message.
Parent can attach encouragement.
Child sees approved-task celebration.
Messages remain accessible.
Phase 5 — Weekly Reflection

Expose existing Weekly Journal to Child Mode.

Add:

Weekly stats
Parent proud-of message
Next-week growth goal
Encouragement
30. MVP Acceptance Scenario

A complete test flow should work like this:

Parent creates:

🎒 Prepare School Bag
Type: Habit Building
Coins: 5
Stars: 2
Approval: Automatic

Parent creates:

🌍 Learn About a Country
Type: Challenge
Availability: Choice Pool
Coins: 5
Stars: 2
Approval: Parent

Berry opens Home.

Berry sees:

🌱 Responsibilities
🎯 Today's Quest
✨ Pick a Quest

Berry selects:
🌍 Learn About a Country

Berry finishes it.

Task becomes:
⏳ Waiting for Parent

Parent approves.

Parent selects:
🌟 Great job!

Berry opens app.

Berry sees:

🎉 Quest Approved
+5 Coins
+2 Stars

❤️ "Great job!"

After several weeks:

Parent opens:
Prepare School Bag

Selects:
🌱 Make This a Responsibility

Berry receives:

🌟 NEW HABIT!
You mastered this!

Prepare School Bag moves to:
🌱 My Responsibilities

Future completion:
No Coins required.

If this scenario works correctly, the main behavioral design has been implemented.

31. Non-Goals for This Iteration

Do not add yet:

AI task recommendation
Complex machine learning personalization
Public leaderboard
Sibling competition
Chat between child and parent
Loot boxes
Random Coin rewards
Infinite Quest Pool
Automatic habit graduation without Parent decision

Keep the system understandable and parent-controlled.

32. Final Product Rule for Future Development

Whenever adding a new task or reward feature, ask:

Does this help the child become
more independent over time?

OR

Does this make the child more dependent
on BloomQuest rewards?

Prefer the first.

Implementation principle:

Coins motivate a challenge.
Stars show growth.
Parent recognition gives meaning.
Responsibilities build independence.
Successful habits eventually graduate out of rewards.