# BloomQuest System Quest Curriculum — Goal & Implementation Plan

**Product:** BloomQuest Family  
**Purpose:** Implementation specification for coding AI  
**Age range:** 7–18  
**Primary context:** Vietnamese family, bilingual UI supported  
**Version:** V1 proposal  
**Date:** 2026-08-17

---

## 1. System Goal

BloomQuest must evolve from a simple family task/reward application into a **developmental life-skills system** that helps a child move gradually from parent-directed behavior toward self-directed adulthood.

The product must not optimize only for "more tasks completed" or "more Coins earned". Its long-term success criterion is:

> **At age 18, the child should need BloomQuest less than at age 7 because responsibilities, habits, planning, self-management, judgement and practical life skills have increasingly become internalized.**

Target progression:

```text
Age 7
"What do I need to do?"
        ↓
Age 10–12
"I can remember, choose and plan some things myself."
        ↓
Age 13–15
"I can manage goals and projects with decreasing parent direction."
        ↓
Age 16–18
"I can plan, decide, execute and review important parts of my life."
```

BloomQuest therefore needs to support:

- age-appropriate System Quest recommendations;
- skill progression rather than an unstructured task list;
- responsibilities that normally do **not** pay Quest Coins;
- temporary rewards while building selected habits;
- challenges and projects that can earn Coins and Stars;
- increasing child choice as age/capability grow;
- parent guidance rather than sibling comparison;
- Vietnamese family context while preserving globally useful life skills;
- family connection, kindness and contribution without turning them into paid work;
- money, digital, AI, communication, health and adult-readiness skills;
- clear habit graduation from externally rewarded behavior into normal responsibility.

---

## 2. Product Philosophy

### 2.1 Core progression

```text
Reward
  ↓
Practice
  ↓
Competence
  ↓
Reduce external reward
  ↓
Ownership
  ↓
Independence
```

BloomQuest must help create independence, not dependence on points.

### 2.2 Meaning of each system

```text
🪙 Quest Coins
Short-term reward for genuine extra effort, optional challenges and selected habit-building phases.

⭐ Stars
Long-term progression, achievement and mastery. Stars are not spent.

❤️ Parent Recognition
Emotional feedback: "I saw your effort."

🌱 Responsibilities
Normal things the child learns to do because they are growing and contributing to family life.

🌿 Habit Building
Temporary scaffolding for a behavior that is not yet stable.

🎯 Challenges
Extra effort, exploration, project work and deliberate practice.

✨ Choice Quests
Challenges chosen by the child from a curated Quest Pool.

👭 Family / Character
Cooperation, kindness, service and family contribution. Recognition and Stars are preferred over Coins.
```

### 2.3 Anti-patterns

Do not:

- reward every basic responsibility with Coins;
- create sibling leaderboards or comparisons;
- require evidence for ordinary trust-based family behavior;
- turn kindness into a paid transaction;
- keep 17–18-year-olds on the same daily chore UX as 7-year-olds;
- assume age alone equals ability;
- hard-block parents from overriding recommendations;
- introduce psychological scoring, diagnosis or ranking.

---

## 3. Development Domains

Every System Quest must have one primary domain.

| Code | Domain | Long-term capability |
|---|---|---|
| `LEARNING` | 🧠 Learning & Thinking | reading, curiosity, research, critical thinking, problem solving |
| `SELF_MANAGEMENT` | 🎯 Self Management | planning, focus, task initiation, goals, reflection, self-control |
| `LIFE_HOME` | 🏠 Life & Home Skills | cooking, cleaning, laundry, household independence |
| `MONEY` | 💰 Money | saving, budgeting, comparing, spending, financial awareness |
| `COMMUNICATION` | 💬 Communication | speaking, writing, listening, presenting, resolving disagreement |
| `CHARACTER_FAMILY` | ❤️ Character & Family | responsibility, empathy, contribution, family connection |
| `HEALTH` | 🏃 Health | movement, sleep routines, basic safety, sustainable health habits |
| `DIGITAL` | 💻 Digital Intelligence | privacy, scams, misinformation, attention, AI verification |
| `WORLD_INDEPENDENCE` | 🌍 World & Independence | navigation, culture, careers, travel, leadership, adult readiness |

V1 requires only one primary domain. Secondary domains may be added later without changing the recommendation model.

---

## 4. Behavior Types

### `RESPONSIBILITY`

A normal responsibility the child is expected to learn.

Default:

```text
Coins = 0
Stars = 0 per normal completion
```

It can still contribute to consistency, habit history, weekly reflection, badges and parent recognition.

### `HABIT_BUILDING`

A behavior not yet internalized.

May temporarily earn Coins and Stars, then fade through:

```text
FULL_REWARD
→ REDUCED_REWARD
→ STARS_ONLY
→ GRADUATED
```

### `CHALLENGE`

Extra effort, exploration, project work or deliberate practice.

Default:

```text
Coins = yes
Stars = yes
```

### `CHARACTER`

Kindness, contribution, mentoring, conflict resolution, service.

Default:

```text
Coins = 0 or very low
Stars = yes
Parent recognition = strongly encouraged
```

### `FAMILY`

Shared cooperative activity. Rewards may be Stars, experience progress, small Coins or recognition depending on configuration.

---

## 5. Who Chooses the Quest

Keep this independent from behavior type.

```text
ASSIGNED_ONLY
CHOICE_POOL
BOTH
```

Keep assignment source:

```text
PARENT
CHOICE_POOL
FAMILY
SYSTEM
```

Future-compatible value:

```text
CHILD_PROPOSED
```

---

## 6. Age Is a Recommendation, Not a Restriction

Do not use a single exact age as a hard eligibility rule.

Every System Quest should support:

```text
min_age
recommended_age
max_age
```

Example:

```text
Quest: Plan a Family Dinner
min_age: 12
recommended_age: 14
max_age: 17
```

Parent may still assign outside this range. Show an informational warning, not a hard block.

---

## 7. Independence Level

Each quest declares the expected execution mode:

```text
GUIDED
SUPPORTED
INDEPENDENT
```

Definitions:

- `GUIDED`: parent actively teaches, demonstrates or participates.
- `SUPPORTED`: child performs most steps; parent is available for help/checking.
- `INDEPENDENT`: child is expected to plan and complete the task mainly alone.

The same skill should become more independent over time.

---

## 8. Difficulty

Use a simple V1 scale:

```text
1–10
```

Suggested interpretation:

```text
1–2  Very small / simple
3–4  Easy
5–6  Moderate
7–8  Advanced
9–10 Major project / adult-readiness
```

Difficulty is not the same as age.

---

## 9. Recommended Autonomy Progression

This is a product recommendation, not a hard developmental rule.

| Age | Parent-assigned | Child choice / self-defined |
|---:|---:|---:|
| 7–8 | ~80% | ~20% |
| 9–10 | ~70% | ~30% |
| 11–12 | ~60% | ~40% |
| 13–14 | ~50% | ~50% |
| 15–16 | ~30% | ~70% |
| 17–18 | ~10–20% | ~80–90% |

Do not enforce exact percentages. Use them only to tune recommendations and UX.

---

## 10. UX Evolution by Age

### Ages 7–9 — Task-centric

```text
🌱 My Responsibilities
🎯 Today's Quests
✨ Pick a Quest
```

### Ages 10–12 — Task + Habit + Weekly Goal

Add:

```text
My Week
Habit Progress
Simple Goals
```

### Ages 13–15 — Goal + Project

Reduce micro-task emphasis. Add:

```text
My Goals
My Projects
Weekly Review
```

### Ages 16–18 — Life Readiness

Main concepts become:

```text
Goals
Projects
Responsibilities
Planning
Reflection
Adult-readiness skills
```

Coins should become progressively less central.

---

## 11. Database Changes

### 11.1 Add/confirm template fields

```sql
min_age integer,
recommended_age integer,
max_age integer,

skill_domain text,
skill_subdomain text,

behavior_type text,

difficulty integer,
independence_level text,

estimated_minutes integer,
recommended_frequency text,

availability_type text,

coin_reward integer,
star_reward integer,

requires_approval boolean,
requires_supervision boolean,

evidence_type text,

development_goal text,
parent_tip text,

skill_ladder_key text,
skill_ladder_level integer,

template_key text,
source_template_key text,

is_system_template boolean
```

### 11.2 Enums

```text
skill_domain:
LEARNING
SELF_MANAGEMENT
LIFE_HOME
MONEY
COMMUNICATION
CHARACTER_FAMILY
HEALTH
DIGITAL
WORLD_INDEPENDENCE
```

```text
behavior_type:
RESPONSIBILITY
HABIT_BUILDING
CHALLENGE
CHARACTER
FAMILY
```

```text
independence_level:
GUIDED
SUPPORTED
INDEPENDENT
```

```text
availability_type:
ASSIGNED_ONLY
CHOICE_POOL
BOTH
```

### 11.3 Backward compatibility

Existing family-created tasks must continue working.

Migration defaults:

```text
behavior_type = CHALLENGE
availability_type = ASSIGNED_ONLY
min_age = null
recommended_age = null
max_age = null
```

Do not silently reclassify existing family tasks.

---

## 12. Stable Template Identity

Every System Template needs a non-translated stable identifier:

```text
template_key
```

Examples:

```text
BQ-MONEY-NEEDS-WANTS-L01
BQ-LIFE-COOKING-L04-SIMPLE-DISH
BQ-DIGITAL-AI-VERIFY-L01
```

Requirements:

- unique for System Templates;
- stable across title/translation changes;
- used by migrations, analytics and copy-from-template;
- copied family task retains `source_template_key`.

---

## 13. Skill Ladders

Required V1 ladders:

```text
COOKING
HOUSEHOLD_CARE
PERSONAL_ORGANIZATION
READING
RESEARCH
COMMUNICATION
MONEY
DIGITAL_SAFETY
AI_LITERACY
FAMILY_CONTRIBUTION
PLANNING
PROJECT_EXECUTION
CAREER_EXPLORATION
TRAVEL_NAVIGATION
```

Example Cooking ladder:

```text
L1 Age ~7   Help wash/prepare fruit
L2 Age ~8   Make a simple sandwich
L3 Age ~9   Prepare a simple snack
L4 Age ~10  Cook a simple dish with parent
L5 Age ~11  Cook a simple meal with supervision
L6 Age ~13  Cook a basic meal independently
L7 Age ~15  Cook for the family
L8 Age ~17  Plan + cook a full family dinner
L9 Age ~18  Plan meals + grocery cost for a week
```

Example Money ladder:

```text
L1  Needs vs wants
L2  Compare two prices
L3  Shop/list within a small budget
L4  Compare price and quality
L5  Track spending
L6  Track a savings goal
L7  Manage allowance
L8  Manage personal spending
L9  Monthly budget
L10 Analyze spending
L11 Independent budget
L12 Adult monthly budget simulation/real use
```

---

## 14. Vietnamese Family Context

Include culturally relevant experiences without using rigid stereotypes.

Examples:

```text
Call/check in with grandparents
Interview grandparents about childhood
Learn a family recipe
Help prepare a family meal
Help prepare for Tết / family gathering
Learn about parents' hometown
Research a Vietnamese historical/cultural place
Preserve a family recipe
Help digitize old family photos
Plan a family event budget
Teach a younger family member a useful skill
```

Do not create reward quests such as "Respect elders +5 Coins". Prefer observable actions and parent recognition.

---

## 15. Reward Policy by Behavior Type

### Responsibility

```text
Coins = 0
Stars = 0 per normal completion
```

Use milestone recognition instead, e.g. 10 independent completions → badge/Stars milestone.

### Habit Building

Use small temporary Coins + Stars, then fade.

### Challenge

Coins + Stars. Scale with effort, duration, difficulty, independence and project scope.

### Character / Family Contribution

Default to 0 Coins, moderate Stars and strong parent recognition.

### Large projects

Reward meaningful checkpoints or completion, not every tiny sub-step.

---

## 16. Habit Graduation

Keep per-child habit state because children may master the same behavior at different times.

Use/extend:

```text
child_task_reward_progress
```

Fields:

```text
child_id
task_id
reward_stage
started_at
stage_changed_at
graduated_at
```

Stages:

```text
FULL_REWARD
REDUCED_REWARD
STARS_ONLY
GRADUATED
```

Parent controls transitions in V1.

---

## 17. Parent Quest Library UX

Replace a generic template list with an age-aware Quest Library.

```text
✨ QUEST LIBRARY

For:
[ Berry · Age 9 ▼ ]

Recommended for Berry
────────────────────────
🧠 Learning
🎯 Self Management
🏠 Life Skills
💰 Money
💬 Communication
❤️ Family & Character
🏃 Health
💻 Digital
🌍 World
```

Quest card example:

```text
🍳 Make Your Own Breakfast

Recommended: Ages 9–11
Difficulty: 2/10
Mode: Supported

Develops:
🏠 Life Skills
🎯 Planning

Why this matters:
Practice simple food preparation and independence.

Parent tip:
Let the child choose ingredients and do safe steps independently.

[ Add for Berry ]
```

Filters:

```text
Age
Domain
Behavior type
Difficulty
Independence level
Choice Pool / Assigned
Estimated time
```

---

## 18. Child Quest Pool

Do not expose the entire System Quest Library.

Suggested visible choices:

```text
Age 7–8:   3–4 options
Age 9–10:  4–5 options
Age 11–12: 5–6 options
Age 13–14: 5–7 options
Age 15–18: more project/goal choices, fewer micro-quests
```

Use rule-based recommendation in V1. No AI recommendation required.

---

## 19. V1 Recommendation Algorithm

Inputs:

```text
child age
recent completed quests
active assignments
skill domains practiced recently
difficulty
independence level
availability type
frequency/limits
school/vacation/travel mode
```

Base filter:

```text
is_system_template = true
AND availability_type IN ('CHOICE_POOL', 'BOTH')
AND min_age <= child_age
AND max_age >= child_age
AND enabled = true
AND completion limit not exceeded
```

Ranking:

1. `recommended_age` close to child age.
2. Prefer domains not practiced recently.
3. Avoid quests completed very recently.
4. Maintain variety across domains.
5. Prefer suitable independence level.
6. Avoid showing only chores or only school-like learning.
7. Respect School/Vacation/Travel mode.

Never use sibling performance in ranking.

---

## 20. Development Coverage

Parent child-profile may show **areas practiced recently**:

```text
🧠 Learning             ███████░░
🎯 Self Management      █████░░░░
🏠 Life Skills          ████░░░░░
💰 Money                ███░░░░░░
💬 Communication        ██████░░░
❤️ Character & Family   ███████░░
🏃 Health               █████░░░░
💻 Digital              ███░░░░░░
🌍 World                ████░░░░░
```

Rules:

- call it "areas practiced", not "performance score";
- low activity means less recent exposure, not weakness;
- no sibling comparison;
- no percentages implying child quality.

---

## 21. Explainable Recommendations

Every recommendation should have a simple explanation.

Example:

```text
Why recommended?
Berry has done several Learning quests this week
but no Money quest recently.

Suggested:
💰 Compare prices at the supermarket
```

No black-box AI explanation is needed.

---

## 22. Safety and Supervision

Every System Template may define:

```text
requires_supervision
```

Likely use cases:

```text
cooking with heat/sharp tools
travel/navigation outside the home
first-aid practice
online privacy/account work
shopping outside the home
care of younger children
```

`requires_supervision` and `requires_approval` remain separate.

---

## 23. Evidence Defaults

Integrate with the existing Completion Evidence system.

Recommended defaults:

```text
Normal responsibility → NONE
Reading → REFLECTION_CHOICE / optional reflection
English speaking → AUDIO_SHORT
Creative project → PHOTO_OPTIONAL
Cooking/project → PHOTO_OPTIONAL
Kindness → PARENT_OBSERVATION
Research → REFLECTION_TEXT
```

Media policy remains:

- photo/audio private;
- 7-day retention;
- Parent may Save to Device;
- Parent may Keep as Memory;
- Parent may Delete;
- text/choice reflection may remain with history.

Age metadata must never automatically convert optional evidence into required evidence.

---

## 24. Seed Architecture

Keep the current System Template architecture:

```text
System template
family_id = sentinel/system family
is_system_template = true
```

Parent flow:

```text
System Template
   ↓ Add to family
Family copy
   ↓ customize
Assign / put in Choice Pool
```

Do not show System Templates directly in the normal family task list.

Do not modify the System Template when the parent edits a copied quest.

---

# 25. Proposed System Quest Curriculum — 180 Seed Templates

The following curriculum contains **15 proposed templates for every age from 7 through 18**. They are seed recommendations, not mandatory daily tasks.

Reward values should be treated as recommendation defaults only. Parent may customize.

## Age 7 — “I can do things by myself”

1. 🌱 **Make My Bed** — LIFE_HOME — Responsibility — Assigned — Guided — 0 Coins — own personal space.
2. 🌱 **Put Dirty Clothes in the Basket** — LIFE_HOME — Responsibility — Assigned — Guided — 0 Coins — organize personal items.
3. 🌱 **Clear My Plate** — LIFE_HOME — Responsibility — Assigned/Both — Guided — 0 Coins — contribute to family routine.
4. 🌱 **Put Toys and Books Back** — SELF_MANAGEMENT — Responsibility — Both — Guided — 0 Coins — finish a task completely.
5. 🌿 **Prepare School Bag with Checklist** — SELF_MANAGEMENT — Habit — Assigned — Guided — small temporary reward — preparation routine.
6. 🌱 **Water the Plants** — LIFE_HOME — Responsibility — Both — Guided — 0 Coins — care for shared household needs.
7. 🌿 **Read for 15 Minutes** — LEARNING — Habit — Both — Guided — small temporary reward — reading consistency.
8. 🎯 **Read a Story Aloud** — COMMUNICATION — Challenge — Choice Pool — Guided — speaking confidence.
9. 🎯 **Learn 5 English Words** — LEARNING — Challenge — Choice Pool — Guided — language practice.
10. 🎯 **Draw and Explain My Picture** — COMMUNICATION — Challenge — Choice Pool — Guided — expression and creativity.
11. 🎯 **Learn 3 Facts About an Animal** — LEARNING — Challenge — Choice Pool — Guided — curiosity and recall.
12. 🎯 **Help Prepare Fruit or a Snack** — LIFE_HOME — Challenge — Choice Pool — Guided — food preparation.
13. ❤️ **Do One Kind Thing** — CHARACTER_FAMILY — Character — Choice Pool — Guided — notice opportunities to help.
14. 💰 **Needs or Wants?** — MONEY — Challenge — Choice Pool — Guided — basic spending judgement.
15. 🌿 **Save for One Small Goal** — MONEY — Habit — Both — Guided — delayed gratification.

## Age 8 — “I can remember my responsibilities”

1. 🌱 **Keep My Study Desk Tidy** — LIFE_HOME — Responsibility — Assigned — Supported.
2. 🌱 **Set the Dinner Table** — LIFE_HOME — Responsibility — Both — Supported.
3. 🌱 **Sort Laundry** — LIFE_HOME — Responsibility — Both — Supported.
4. 🌱 **Put Away My Clean Clothes** — LIFE_HOME — Responsibility — Assigned — Supported.
5. 🌱 **Feed a Pet** — CHARACTER_FAMILY — Responsibility — Both — Supported.
6. 🌿 **Prepare School Bag Independently** — SELF_MANAGEMENT — Habit — Assigned — Supported.
7. 🌿 **Read for 20 Minutes** — LEARNING — Habit — Both — Supported.
8. 🌿 **Finish One Responsibility Before Entertainment** — SELF_MANAGEMENT — Habit — Assigned — Supported.
9. 🌿 **Weekly Tidy-Up** — LIFE_HOME — Habit — Both — Supported.
10. 🎯 **Make a Simple Sandwich** — LIFE_HOME — Challenge — Choice Pool — Supported.
11. 🎯 **Tell What I Learned Today** — COMMUNICATION — Challenge — Choice Pool — Supported.
12. 🎯 **Speak English for 2 Minutes** — COMMUNICATION — Challenge — Choice Pool — Supported.
13. 🌍 **Learn About Another Country** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Supported.
14. 💰 **Make a Small Shopping List** — MONEY — Challenge — Choice Pool — Supported.
15. 💰 **Compare the Price of Two Snacks** — MONEY — Challenge — Choice Pool — Supported.

## Age 9 — “I can organize myself”

1. 🌱 **Fold and Put Away My Clothes** — LIFE_HOME — Responsibility — Assigned — Supported.
2. 🌱 **Vacuum a Small Area** — LIFE_HOME — Responsibility — Both — Supported.
3. 🌱 **Prepare My Own Simple Snack** — LIFE_HOME — Responsibility — Both — Supported.
4. 🌱 **Organize School Supplies** — SELF_MANAGEMENT — Responsibility — Assigned — Supported.
5. 🌱 **Own One Household Area** — CHARACTER_FAMILY — Responsibility — Assigned — Supported.
6. 🌿 **25-Minute Focus Time** — SELF_MANAGEMENT — Habit — Both — Supported.
7. 🌿 **Start Homework Without Reminder** — SELF_MANAGEMENT — Habit — Assigned — Supported.
8. 🌿 **Prepare Tomorrow Before Bed** — SELF_MANAGEMENT — Habit — Assigned — Supported.
9. 🌿 **Weekly Reading Goal** — LEARNING — Habit — Both — Supported.
10. 💰 **Create a Shopping List Under 100,000đ** — MONEY — Challenge — Choice Pool — Supported.
11. 🧠 **Research One Interesting Question** — LEARNING — Challenge — Choice Pool — Supported.
12. 💬 **Give a 2-Minute Presentation** — COMMUNICATION — Challenge — Choice Pool — Supported.
13. 🏃 **Learn Basic First Aid for a Small Scratch** — HEALTH — Challenge — Choice Pool — Supported/Supervised.
14. ❤️ **Interview Grandparents About Childhood** — CHARACTER_FAMILY — Challenge — Choice Pool — Supported.
15. 🌍 **Navigate a Familiar Place Using a Map** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Supported/Supervised.

## Age 10 — “I can plan ahead”

1. 🌱 **Help Prepare Dinner** — LIFE_HOME — Responsibility — Both — Supported.
2. 🌱 **Clean One Shared Family Area** — LIFE_HOME — Responsibility — Assigned — Supported.
3. 🌿 **Manage My Laundry with Help** — LIFE_HOME — Habit — Assigned — Supported.
4. 🌍 **Pack for a Day Trip** — WORLD_INDEPENDENCE — Challenge — Both — Supported.
5. 🌱 **Manage School Materials** — SELF_MANAGEMENT — Responsibility — Assigned — Supported.
6. 🌿 **Make Tomorrow’s Top-3 List** — SELF_MANAGEMENT — Habit — Both — Supported.
7. 🌿 **Read for 30 Minutes** — LEARNING — Habit — Both — Supported.
8. 💻 **Screen-Free Study Session** — DIGITAL — Habit — Both — Supported.
9. 🌿 **Weekly Room Reset** — LIFE_HOME — Habit — Both — Supported.
10. 🍳 **Cook One Simple Dish with Parent** — LIFE_HOME — Challenge — Choice Pool — Supported/Supervised.
11. 💰 **Compare 3 Products Before Choosing** — MONEY — Challenge — Choice Pool — Supported.
12. 💬 **Give a 3-Minute Presentation** — COMMUNICATION — Challenge — Choice Pool — Supported.
13. ❤️ **Plan a Family Game Night** — CHARACTER_FAMILY — Challenge — Choice Pool — Supported.
14. 🧠 **Complete a Small STEM Experiment** — LEARNING — Challenge — Choice Pool — Supported.
15. ❤️ **Teach Someone Something I Know** — COMMUNICATION — Character — Choice Pool — Supported.

## Age 11 — “I can manage more of my own life”

1. 🌱 **Change My Bedsheets** — LIFE_HOME — Responsibility — Assigned — Supported.
2. 🌿 **Do a Full Laundry Cycle with Guidance** — LIFE_HOME — Habit — Assigned — Supported.
3. 🌱 **Clean Part of the Bathroom** — LIFE_HOME — Responsibility — Assigned — Supported.
4. 🌱 **Help Clean the Kitchen** — LIFE_HOME — Responsibility — Both — Supported.
5. 🍳 **Cook a Simple Meal with Supervision** — LIFE_HOME — Challenge — Both — Supported/Supervised.
6. 🌿 **Manage Homework Without Reminders** — SELF_MANAGEMENT — Habit — Assigned — Supported.
7. 🌿 **Plan My Week** — SELF_MANAGEMENT — Habit — Both — Supported.
8. 🌿 **Track School Deadlines** — SELF_MANAGEMENT — Habit — Assigned — Supported.
9. 🧠 **Find Two Sources About One Topic** — LEARNING — Challenge — Choice Pool — Supported.
10. 🧠 **Explain Why Two Sources Agree or Disagree** — LEARNING — Challenge — Choice Pool — Supported.
11. 💻 **Fact-Check an Online Claim** — DIGITAL — Challenge — Choice Pool — Supported.
12. ❤️ **Explain a Hard Idea to a Younger Child** — COMMUNICATION — Character — Choice Pool — Supported.
13. 💰 **Plan a Small Purchase Budget** — MONEY — Challenge — Choice Pool — Supported.
14. 🌿 **Keep a Spending Log for One Week** — MONEY — Habit — Both — Supported.
15. ❤️ **Help a Younger Sibling While an Adult Is Home** — CHARACTER_FAMILY — Character — Both — Supported/Supervised.

## Age 12 — “I can set goals”

1. 🌱 **Manage School Preparation Independently** — SELF_MANAGEMENT — Responsibility — Assigned — Independent.
2. 🌱 **Do Personal Laundry** — LIFE_HOME — Responsibility — Assigned — Supported.
3. 🌱 **Clean My Room Fully** — LIFE_HOME — Responsibility — Assigned — Independent.
4. 🍳 **Cook a Basic Meal with Supervision** — LIFE_HOME — Challenge — Both — Supported.
5. 🌱 **Maintain One Shared Family Space** — CHARACTER_FAMILY — Responsibility — Assigned — Independent.
6. 🌿 **Weekly Planning** — SELF_MANAGEMENT — Habit — Both — Independent.
7. 🌿 **Weekly Reflection** — SELF_MANAGEMENT — Habit — Both — Independent.
8. 🌿 **45-Minute Focus Session** — SELF_MANAGEMENT — Habit — Choice Pool — Independent.
9. 🌿 **Track a Savings Goal** — MONEY — Habit — Both — Independent.
10. 🎯 **Learn a Skill for 7 Days** — LEARNING — Challenge — Choice Pool — Independent.
11. 🎯 **Build a Mini STEM Project** — LEARNING — Challenge — Choice Pool — Supported.
12. 📚 **Read a Nonfiction Book** — LEARNING — Challenge — Choice Pool — Independent.
13. 💻 **Recognize Phishing or Scam Examples** — DIGITAL — Challenge — Choice Pool — Supported.
14. 🤖 **Compare an AI Answer with a Trusted Source** — DIGITAL — Challenge — Choice Pool — Supported.
15. ❤️ **Create Something Useful for the Family** — CHARACTER_FAMILY — Challenge — Choice Pool — Supported.

## Age 13 — “I manage myself, not just my tasks”

1. 🌱 **Complete Personal Laundry Independently** — LIFE_HOME — Responsibility — Assigned — Independent.
2. 🌱 **Cook a Basic Meal** — LIFE_HOME — Responsibility — Both — Independent.
3. 🌱 **Own One Weekly Family Chore** — CHARACTER_FAMILY — Responsibility — Assigned — Independent.
4. 🌱 **Manage My Allowance** — MONEY — Responsibility — Both — Independent.
5. 🌱 **Maintain My Study Area** — SELF_MANAGEMENT — Responsibility — Assigned — Independent.
6. 🌿 **Choose My Top 3 Priorities** — SELF_MANAGEMENT — Habit — Both — Independent.
7. 🌿 **Weekly Review** — SELF_MANAGEMENT — Habit — Both — Independent.
8. 🌿 **Regular Physical Activity** — HEALTH — Habit — Both — Independent.
9. 🌿 **Notice and Manage Emotional Triggers** — HEALTH — Habit — Both — Supported.
10. 💰 **Plan a Meal Within a Budget** — MONEY — Challenge — Choice Pool — Supported.
11. 🌍 **Travel a Familiar Route with Increasing Independence** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Supported/Supervised.
12. 💬 **Give a 5-Minute Presentation** — COMMUNICATION — Challenge — Choice Pool — Independent.
13. 🎯 **Complete a 7-Day Personal Project** — SELF_MANAGEMENT — Challenge — Choice Pool — Independent.
14. 🌍 **Interview an Adult About Their Profession** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
15. ❤️ **Help in a Community or Family Service Activity** — CHARACTER_FAMILY — Character — Choice Pool — Supported.

## Age 14 — “I can make informed decisions”

1. 🌱 **Manage My Study Schedule** — SELF_MANAGEMENT — Responsibility — Assigned — Independent.
2. 🌿 **Cook 2–3 Basic Dishes** — LIFE_HOME — Habit — Both — Independent.
3. 🌱 **Participate in Grocery Planning** — LIFE_HOME — Responsibility — Both — Independent.
4. 🌱 **Own a Shared Household Chore** — CHARACTER_FAMILY — Responsibility — Assigned — Independent.
5. 🌱 **Manage Personal Spending** — MONEY — Responsibility — Both — Independent.
6. 🌿 **Weekly Planning Without Parent Doing It** — SELF_MANAGEMENT — Habit — Both — Independent.
7. 💻 **Focus Session with Phone Away** — DIGITAL — Habit — Both — Independent.
8. 📚 **Read Long-Form Content** — LEARNING — Habit — Choice Pool — Independent.
9. 💻 **Fact-Check 3 Social-Media Claims** — DIGITAL — Challenge — Choice Pool — Independent.
10. 💰 **Compare Three Products Before a Purchase** — MONEY — Challenge — Choice Pool — Independent.
11. 💬 **Create a Presentation Explaining an Issue** — COMMUNICATION — Challenge — Choice Pool — Independent.
12. 🌍 **Interview Two People About a Career** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
13. 🎯 **Build a Small Software, Art or Science Project** — LEARNING — Challenge — Choice Pool — Independent.
14. ❤️ **Organize a Family Activity** — CHARACTER_FAMILY — Challenge — Choice Pool — Independent.
15. 💻 **Review My Privacy Settings** — DIGITAL — Challenge — Choice Pool — Supported.

## Age 15 — “I can run a project”

1. 🌱 **Manage Personal Monthly Spending** — MONEY — Responsibility — Both — Independent.
2. 🌱 **Help Plan Family Meals** — LIFE_HOME — Responsibility — Both — Independent.
3. 🍳 **Cook for the Family** — LIFE_HOME — Challenge — Both — Independent.
4. 🌱 **Track School Deadlines Independently** — SELF_MANAGEMENT — Responsibility — Assigned — Independent.
5. 🌱 **Maintain Important Personal Items** — SELF_MANAGEMENT — Responsibility — Assigned — Independent.
6. 🌿 **Set a Monthly Goal** — SELF_MANAGEMENT — Habit — Both — Independent.
7. 🌿 **Weekly Review and Reset** — SELF_MANAGEMENT — Habit — Both — Independent.
8. 💻 **Manage Digital Distraction** — DIGITAL — Habit — Both — Independent.
9. 🎯 **Build Something Over 2 Weeks** — LEARNING — Challenge — Choice Pool — Independent.
10. 🌍 **Create a Personal Portfolio Project** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
11. 💰 **Create a Household Budget Spreadsheet** — MONEY — Challenge — Choice Pool — Independent.
12. 💬 **Give a 5–10 Minute Talk** — COMMUNICATION — Challenge — Choice Pool — Independent.
13. 🌍 **Research Three Possible Careers** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
14. 💬 **Write a Professional Email** — COMMUNICATION — Challenge — Choice Pool — Independent.
15. ❤️ **Resolve a Disagreement Calmly** — CHARACTER_FAMILY — Character — Both — Independent.

## Age 16 — “I prepare for adult independence”

1. 🌱 **Cook Several Complete Meals** — LIFE_HOME — Responsibility — Both — Independent.
2. 💰 **Do Grocery Shopping from a List and Budget** — LIFE_HOME/MONEY — Challenge — Both — Independent.
3. 🌱 **Manage Laundry Completely** — LIFE_HOME — Responsibility — Assigned — Independent.
4. 🌱 **Manage My Personal Schedule** — SELF_MANAGEMENT — Responsibility — Assigned — Independent.
5. 💻 **Handle Important Personal Information Safely** — DIGITAL — Responsibility — Assigned — Independent.
6. 🌿 **Make a Monthly Budget** — MONEY — Habit — Both — Independent.
7. 💰 **Analyze One Month of Spending** — MONEY — Challenge — Choice Pool — Independent.
8. 💰 **Explain Compound Interest** — MONEY — Challenge — Choice Pool — Independent.
9. 💰 **Compare Cash, Debit and Credit** — MONEY — Challenge — Choice Pool — Independent.
10. 💻 **Identify a Financial Scam** — DIGITAL — Challenge — Choice Pool — Independent.
11. 🌍 **Create My First CV** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
12. 💬 **Practice a Job Interview** — COMMUNICATION — Challenge — Choice Pool — Supported.
13. 🌍 **Research University or Education Routes** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
14. 🎯 **Complete a 30-Day Personal Project** — SELF_MANAGEMENT — Challenge — Choice Pool — Independent.
15. 🤖 **Use AI, Then Verify the Result** — DIGITAL — Challenge — Choice Pool — Independent.

## Age 17 — “I can run much of my life”

1. 🌱 **Manage My Schedule Without Parent Reminders** — SELF_MANAGEMENT — Responsibility — Assigned — Independent.
2. 🌱 **Prepare Family Meals Independently** — LIFE_HOME — Responsibility — Both — Independent.
3. 🌱 **Manage Laundry and Room Maintenance** — LIFE_HOME — Responsibility — Assigned — Independent.
4. 🌱 **Manage a Personal Budget** — MONEY — Responsibility — Both — Independent.
5. 🌱 **Plan My Transport** — WORLD_INDEPENDENCE — Responsibility — Both — Independent.
6. 🌱 **Organize Personal Documents** — SELF_MANAGEMENT — Responsibility — Assigned — Independent.
7. 🌍 **Plan a 3-Day Trip Itinerary and Budget** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
8. 🍳 **Cook a Complete Dinner for the Family** — LIFE_HOME — Challenge — Choice Pool — Independent.
9. 🌍 **Create an Education/Career Decision Matrix** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
10. 🎯 **Complete a One-Month Independent Project** — SELF_MANAGEMENT — Challenge — Choice Pool — Independent.
11. ❤️ **Lead a Family or Community Activity** — CHARACTER_FAMILY — Challenge — Choice Pool — Independent.
12. ❤️ **Teach a Younger Person a Useful Skill** — COMMUNICATION — Character — Choice Pool — Independent.
13. 💬 **Write a Formal Request or Email** — COMMUNICATION — Challenge — Choice Pool — Independent.
14. 🌍 **Compare 3 University or Career Routes** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
15. 💬 **Present a Recommendation to Parents** — COMMUNICATION — Challenge — Choice Pool — Independent.

## Age 18 — “Adult readiness”

1. 🌱 **Plan and Cook Meals Independently** — LIFE_HOME — Responsibility — Both — Independent.
2. 🌱 **Maintain Clothing and Living Space** — LIFE_HOME — Responsibility — Assigned — Independent.
3. 🌱 **Manage Appointments and Schedule** — SELF_MANAGEMENT — Responsibility — Both — Independent.
4. 💰 **Run a One-Month Personal Budget** — MONEY — Challenge — Choice Pool — Independent.
5. 🍳 **Plan One Week of Meals and Grocery Cost** — LIFE_HOME — Challenge — Choice Pool — Independent.
6. 💰 **Build an Emergency-Budget Simulation** — MONEY — Challenge — Choice Pool — Independent.
7. 🌍 **Compare Two Education or Job Offers** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
8. 🌍 **Create a CV and Portfolio** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
9. 🎯 **Complete a Long-Term Personal Project** — SELF_MANAGEMENT — Challenge — Choice Pool — Independent.
10. 🌍 **Organize an Important Appointment** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
11. 🌍 **Plan Independent Travel** — WORLD_INDEPENDENCE — Challenge — Choice Pool — Independent.
12. ❤️ **Lead a Volunteer or Community Project** — CHARACTER_FAMILY — Character — Choice Pool — Independent.
13. ❤️ **Learn One Adult Skill from a Parent** — CHARACTER_FAMILY — Challenge — Choice Pool — Independent.
14. 💻 **Protect My Professional Digital Identity** — DIGITAL — Habit — Both — Independent.
15. 🎯 **Create My 1-Year Personal Development Plan** — SELF_MANAGEMENT — Challenge — Choice Pool — Independent.

---

## 26. Recommended Age Ranges for Seed Data

The curriculum above uses an anchor age for readability. Database records should usually use practical ranges.

Suggested approach:

```text
Simple responsibility:
anchor age ± 1–2 years

Skill-building quest:
anchor age ± 1–2 years

Project:
anchor age through anchor age + 2 years

Adult-readiness:
curated within 16–18
```

Example:

```text
Anchor age: 10
Quest: Compare 3 Products Before Choosing

min_age = 9
recommended_age = 10
max_age = 12
```

Do not apply a universal formula blindly. Curated ranges override generated ranges.

---

## 27. Parent Tips

Every System Template should contain a short `parent_tip`.

Rules:

- explain how much help to provide;
- avoid doing the quest for the child;
- encourage effort and reflection;
- include safety guidance where needed;
- do not frame every activity around rewards.

Examples:

```text
"Show the steps once, then let the child try."
"Ask what they noticed rather than correcting immediately."
"Let the child make the shopping decision within the agreed budget."
"Stay nearby for safety, but allow the child to lead."
"Recognize initiative even if the result is imperfect."
```

---

## 28. Development Goal Text

`development_goal` is parent-facing and answers:

> Why might this quest be useful?

Good:

```text
"Practice planning a multi-step task."
"Build confidence speaking to another person."
"Practice comparing price and quality."
```

Avoid:

```text
"Fix poor executive function."
"Child is behind in independence."
```

---

## 29. Localization

Support at minimum:

```text
en
vi
```

Recommended concept if DB-based translations fit current architecture:

```text
task_template_translations

template_id
locale
title
description
development_goal
parent_tip
evidence_prompt
```

If BloomQuest already uses JSON-based localization for template strings, reuse the existing pattern rather than introducing a parallel i18n system.

Child names are never translated.

---

## 30. Vietnamese Money Examples

Templates may use localized examples such as:

```text
50,000đ
100,000đ
200,000đ
```

Do not hard-code VND into the core task schema.

Quest Coins remain the in-app reward currency.

---

## 31. School / Vacation / Travel Modes

Recommendations should respect existing family modes.

### School Mode

Prefer:

```text
planning
reading
school preparation
short chores
short choice quests
```

### Vacation Mode

Allow more:

```text
long projects
cooking
family interviews
outdoor activity
travel planning
creative projects
```

### Travel Mode

Prefer:

```text
packing
navigation
culture
budget
language
family documentation
```

---

## 32. Frequency and Anti-Farming

Every rewarded System Template should support:

```text
recommended_frequency
max_rewarded_per_day
max_rewarded_per_week
cooldown_days
```

Examples:

```text
Make bed
→ responsibility; no per-completion Coins

Read extra 30 minutes
→ max 1 rewarded completion/day

Learn about a country
→ e.g. max 2/week

Large project
→ milestone or one-time completion
```

Server remains source of truth for reward validation.

---

## 33. Parent Override Rules

Parent may customize copied templates:

```text
title
description
assigned child
reward
schedule
requires_approval
evidence
availability
```

If outside recommended age range, show:

```text
"This quest is usually recommended for ages 11–13. You can still add it."
```

Do not block.

---

## 34. Copy-from-Template Behavior

When parent chooses `Add for <child>`:

Copy:

```text
localized title/description
behavior_type
skill domain
skill ladder metadata
recommended reward
evidence defaults
approval defaults
difficulty
development goal
parent tip
```

Set:

```text
family_id = current family
is_system_template = false
source_template_id = system template id
source_template_key = system template key
```

Parent edits must not mutate the System Template.

---

## 35. Recommended Server/API Operations

Conceptually:

```text
getQuestLibrary(childId, filters)
getRecommendedTemplates(childId)
getTemplateDetails(templateId)
copyTemplateToFamily(templateId, childId, overrides)
getChildDevelopmentCoverage(childId)
getChoicePoolCandidates(childId)
claimChoiceQuest(childId, templateOrTaskId)
```

Authorization and reward validation remain server-side.

---

## 36. Recommendation Guardrails

Server must:

- derive family from authenticated session;
- never trust arbitrary family ID from client;
- preserve RLS;
- exclude disabled templates;
- apply completion limits;
- exclude recently repeated items where appropriate;
- avoid duplicate active claims;
- never use sibling performance.

---

## 37. Analytics

Parent-facing analytics should answer:

```text
Which areas has the child practiced?
Which responsibilities are becoming independent?
Which habits have graduated?
How many quests were self-chosen?
Which domains have had little recent exposure?
```

Do not answer:

```text
Which child is better?
What percentile is the child?
Who has the highest score?
```

---

## 38. Suggested Parent Dashboard Cards

Potential cards:

```text
🌱 Growing Independence
2 habits ready for parent review

✨ Self-Chosen This Month
8 quests

🧭 Explore Something New
No Money quest practiced in 3 weeks

🏠 Life Skills
Cooking L4 practiced recently

💌 Recognition
5 encouragement messages this week
```

Do not block V1 on all analytics cards.

---

## 39. Future: Child-Proposed Goals

Schema should not prevent this later:

```text
Age 13+
Child proposes:
"My goal is to build a small game."

Parent reviews goal/reward structure.
```

Potential source:

```text
assignment_source = CHILD_PROPOSED
```

Not required for the first age-aware Quest Library release.

---

## 40. Future: Projects

At older ages, one task may not be enough for multi-week work.

Future project model may include:

```text
project
milestones
target_date
reflection
parent_support
completion
```

V1 can represent projects as larger Challenge templates. Do not redesign the whole task architecture yet.

---

# 41. Implementation Phases

## Phase 1 — Schema Foundation

Implement:

```text
age metadata
domain
subdomain
behavior type
difficulty
independence level
supervision flag
template key
skill ladder key/level
development goal
parent tip
```

Acceptance:

- existing tasks still work;
- existing family data unchanged;
- migrations are incremental;
- production-applied historical migrations are not rewritten.

## Phase 2 — Seed Curriculum

Add the 180 System Templates from this document.

Acceptance:

- templates use the existing sentinel/system family mechanism;
- normal family task list does not show them directly;
- template keys are stable and unique;
- localized titles/descriptions are available.

## Phase 3 — Parent Quest Library

Implement:

```text
child selector
recommended-for-age view
domain filters
age filters
difficulty filter
independence filter
quest detail
development goal
parent tip
Add to Family
```

## Phase 4 — Rule-Based Recommendation

Implement candidate filtering and ranking described above.

Acceptance:

- child age strongly influences ranking;
- out-of-range tasks are not normally recommended;
- domain variety is maintained;
- parent can still search and manually add other tasks.

## Phase 5 — Choice Quest Pool Integration

Use age-aware candidates in Child Mode.

Acceptance:

- daily/weekly claim limits enforced;
- no duplicate claim;
- age-appropriate pool size;
- selected quest becomes a normal assignment;
- current approval/reward logic remains intact.

## Phase 6 — Skill Ladders and Coverage

Implement:

```text
skill ladder metadata
areas practiced
next suggested level
habit graduation signals
```

No sibling comparison.

## Phase 7 — Older-Child UX

Gradually add:

```text
weekly goals
projects
self-defined goals
monthly review
adult-readiness planning
```

Do not block V1 on full teenager UX redesign.

---

## 42. Migration Strategy

1. Inspect the current schema and latest migration.
2. Create a **new** migration after the current latest migration.
3. Never edit already-applied production migrations.
4. Add nullable/backward-compatible fields first.
5. Add constraints/enums only after checking existing data compatibility.
6. Seed System Templates via stable `template_key`.
7. Use upsert/unique constraints where appropriate to avoid accidental duplicates.
8. Do not run family seed logic that overwrites existing family-created tasks.

---

## 43. Testing Plan

### Schema tests

Verify:

- age metadata accepts 7–18;
- nullable age metadata preserves old tasks;
- invalid difficulty rejected;
- enum values constrained;
- stable template key unique.

### Template tests

Verify representative templates:

```text
Age 7 responsibility
Age 9 money challenge
Age 12 digital challenge
Age 15 project
Age 18 adult-readiness
```

### Recommendation tests

Child age 9:

- age-appropriate recommendations rank highly;
- compatible adjacent-age tasks may appear;
- age 17 adult-readiness tasks do not normally appear.

Parent override:

- parent can manually add an out-of-range quest.

### Behavior tests

Responsibility:

```text
completion → no Coin transaction
```

Challenge:

```text
completion → valid Coin/Star transaction
```

Habit:

```text
reward stage respected
```

Character:

```text
default no Coins
```

### Quest Pool tests

Verify:

- selection limit;
- no duplicate claim;
- cooldown;
- age filtering;
- domain diversity;
- server-side reward validation.

---

## 44. Acceptance Scenario — Younger Child

Example:

```text
Child age: 9
```

Parent opens Quest Library.

System recommends:

```text
💰 Create a Shopping List Under 100,000đ
Recommended: ages 8–10
Domain: Money
Behavior: Challenge
Mode: Supported
```

Parent sees:

```text
Why:
Practice budgeting within a limit.

Parent tip:
Let the child make the first list. Ask questions instead of correcting every choice.
```

Parent adds it.

Child completes the quest.

Existing approval logic determines when reward is granted.

Development coverage records Money as practiced.

No sibling comparison occurs.

---

## 45. Acceptance Scenario — Habit Graduation

Child has:

```text
Prepare School Bag Independently
behavior_type = HABIT_BUILDING
```

After repeated successful practice, parent selects:

```text
Make This a Responsibility
```

Result:

```text
reward_stage = GRADUATED
regular Coins stop
child sees positive mastery celebration
```

Do not frame this as losing a reward.

---

## 46. Acceptance Scenario — Older Teen

Example:

```text
Child age: 17
```

Quest Library prioritizes:

```text
Plan a 3-Day Trip
Create Career Decision Matrix
Complete a One-Month Project
Write Formal Email
Lead Family/Community Activity
```

It should not prioritize:

```text
Make My Bed
Put Toys Away
```

unless parent searches manually.

Child-facing experience should emphasize goals/projects more than Coins.

---

## 47. Definition of Done

V1 is complete when:

1. System Templates contain age-range metadata.
2. System Templates cover every age 7–18.
3. At least the 180 seed templates in this document are available.
4. Parent Quest Library can recommend/filter by child age.
5. Parent can see development goal and parent tip.
6. Parent can override age recommendations.
7. Responsibilities default to no Coins.
8. Habit-building remains compatible with reward fading.
9. Choice Pool can use age-aware templates.
10. Recommendations include multiple development domains.
11. Skill ladder metadata is stored.
12. Existing family tasks are not broken or silently reclassified.
13. No sibling ranking is introduced.
14. Existing approval, Coins, Stars, Parent Message and Evidence flows still work.
15. RLS/server-side authorization remains enforced.

---

## 48. Non-Goals

Do not implement in this iteration:

```text
AI-generated parenting diagnosis
AI scoring of the child
personality/IQ prediction
sibling ranking
public child profiles
social leaderboard
automatic psychological assessment
automatic habit graduation
complex ML recommendation
```

Rule-based recommendation is sufficient.

---

## 49. Instructions to Coding AI

1. Inspect the current schema and code before modifying anything.
2. Preserve all existing working behavior.
3. Add migrations incrementally; do not rewrite applied historical migrations.
4. Reuse existing localization, auth, RLS, task completion, reward, Parent Message and Evidence architecture.
5. Do not invent a second parallel task system.
6. Implement age metadata and Quest Library first.
7. Seed templates through the existing System Template/sentinel-family mechanism.
8. Do not make System Templates appear directly in normal family task lists.
9. Keep business validation server-side.
10. Add tests for new enum/range/recommendation rules.
11. If current field naming conflicts with this document, adapt to existing naming while preserving behavior.
12. Document deliberate deviations.
13. Keep current working functionality as baseline; add this feature incrementally.

---

## 50. Recommended Implementation Order

```text
Step 1  Audit current task/template schema and migrations
Step 2  Add age/domain/difficulty/independence/template-key fields
Step 3  Add translation/development_goal/parent_tip support
Step 4  Seed 180 curriculum templates
Step 5  Build Parent Quest Library
Step 6  Implement age-aware recommendation
Step 7  Connect recommendation to Add-from-Template flow
Step 8  Connect age-aware candidates to Choice Quest Pool
Step 9  Add skill ladders and development coverage
Step 10 Tune age ranges/economy using real family usage
```

Do not redesign unrelated working features while executing these steps.

---

## 51. Product North Star

BloomQuest should help create this progression:

```text
Age 7:
"What should I do?"

Age 10:
"I know what I am responsible for."

Age 12:
"I can plan my week and choose challenges."

Age 15:
"I can set a goal and run a project."

Age 18:
"I can manage important parts of my life and ask for help when needed."
```

> **BloomQuest is not a chore marketplace. It is a gradual independence curriculum for family life.**

Every future System Quest should answer:

```text
1. What capability does this practice?
2. Is it appropriate for this child's current maturity and independence?
3. Should it really earn Coins, or is it a normal responsibility?
4. Does it help the child need less external control over time?
```

If the answer to question 4 is no, reconsider the quest design.
