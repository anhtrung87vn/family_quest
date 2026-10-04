# BloomQuest Family – Web App Design & Deployment Plan

## 1. Product Vision

BloomQuest Family is a private family reward web application designed for children to:

- Complete positive daily tasks.
- Earn Quest Coins.
- Save Quest Coins toward meaningful rewards.
- Build good habits.
- Track achievements.
- Work toward personal dreams such as an iPad or a family trip to Singapore.

The core idea is:

> **Do good things → Earn Quest Coins → Build Stars → Unlock Dreams**

The application should feel more like a lightweight kids game than a traditional task-management system.

---

## 2. Main Design Principles

### 2.1 Keep the experience simple for children

The child-facing application should use:

- Large buttons.
- Large icons.
- Short text.
- Bright and friendly visual elements.
- Progress bars.
- Reward cards.
- Simple navigation.
- Minimal typing.

The main interface should work well on:

- iPhone.
- Android phones.
- iPad.
- Tablets.
- Desktop browsers.

### 2.3 Language Support

The application language should be:

- **English by default**.
- **Vietnamese as an optional language**.
- Language can be changed from Settings.
- The selected language should be remembered per user/device.
- Child-facing text should stay short and easy to understand in both languages.

Examples:

| English | Vietnamese |
|---|---|
| Home | Trang chủ |
| Quests | Nhiệm vụ |
| Rewards | Phần thưởng |
| My Dream | Ước mơ của con |
| Quest Coins | Vàng |
| I'm Done! | Con làm xong rồi! |
| Waiting for Approval | Đang chờ duyệt |
| Approve | Duyệt |
| Reward Store | Cửa hàng phần thưởng |
| Settings | Cài đặt |

All UI text should be implemented through localization keys rather than hard-coded strings.

Example:

```text
home.title
home.myDream
quests.today
quests.completed
rewards.store
profile.goldHistory
settings.language
```

### 2.2 Avoid direct competition between siblings

The application should not primarily rank the two children against each other.

Avoid a leaderboard such as:

```text
1. July   3,200 Quest Coins
2. Berry  2,100 Quest Coins
```

Instead, each child should have an individual journey:

- My Quest Coins.
- My Dream.
- My Tasks.
- My Badges.
- My Streak.
- My Achievements.

The application can still provide cooperative **Family Quests**.

Example:

```text
Family Quest:
Clean the living room together.

July: +20 Quest Coins
Berry: +20 Quest Coins
```

---

# 3. User Roles

The system has two primary user roles.

## 3.1 Parent

Parents can:

- Login securely.
- Manage the two child profiles: **July** and **Berry**.
- Upload or change an avatar for July.
- Upload or change an avatar for Berry.
- Create tasks.
- Assign tasks.
- Configure Quest Coin values.
- Approve completed tasks.
- Create rewards.
- Approve reward redemption.
- Adjust Quest Coins.
- View Quest Coin transaction history.
- View child progress.
- Configure recurring tasks.
- Manage family settings.

## 3.2 Child

Children can:

- Select either **July** or **Berry**.
- See their own uploaded avatar.
- Login with a PIN.
- View today's quests.
- Submit completed tasks.
- Check Quest Coin balance.
- View Quest Coin history.
- Browse rewards.
- Select a dream reward.
- Redeem rewards.
- View badges.
- View streaks.
- View achievements.

---

# 4. Quest Coins & Stars Reward System


## 4.1 Quest Coins

**Quest Coins** are the spendable reward currency.

Recommended UI name:

```text
🪙 Quest Coins
```

Vietnamese:

```text
🪙 Xu
```

Quest Coins are earned from approved quests and can be spent on rewards.

Example:

```text
📚 Read 30 Minutes

Reward:
🪙 +15 Quest Coins
```

Reward redemption:

```text
🎁 Ice Cream

Cost:
🪙 100 Quest Coins
```

When a reward is redeemed, the Quest Coin balance decreases.

---

## 4.2 Stars

**Stars** represent lifetime achievement and personal progress.

Recommended UI:

```text
⭐ Stars
```

Vietnamese:

```text
⭐ Sao
```

Stars:

- Are earned from meaningful quests and achievements.
- Never decrease when rewards are redeemed.
- Can unlock levels, badges, avatar frames and visual milestones.
- Represent long-term effort rather than purchasing power.
- Should not be transferable between July and Berry.

Example:

```text
🎯 Quest Complete!

🪙 +15 Quest Coins
⭐ +10 Stars
```

After redeeming a reward:

```text
Before:

🪙 1,000 Quest Coins
⭐ 1,600 Stars

Redeem LEGO:
🪙 -800 Quest Coins

After:

🪙 200 Quest Coins
⭐ 1,600 Stars
```

The child still sees permanent progress even after spending currency.

---

## 4.3 Why Use Two Systems

Using only one spendable point balance can create a negative feeling after redemption:

```text
Earn 1,000 points
→ Spend 800
→ Balance returns to 200
```

A dual system separates:

```text
Quest Coins = "What can I spend?"
Stars       = "How far have I grown?"
```

This supports both short-term motivation and long-term identity.

---

## 4.4 Suggested Level System

Levels should be based on lifetime Stars, not Quest Coin balance.

Example starting thresholds:

| Stars | Level | Title |
|---:|---:|---|
| 0–499 | 1 | Explorer |
| 500–999 | 2 | Adventurer |
| 1,000–1,999 | 3 | Champion |
| 2,000–3,499 | 4 | Superstar |
| 3,500–5,499 | 5 | Trailblazer |
| 5,500+ | 6 | Quest Master |

The thresholds should be configurable later.

Example profile:

```text
👧 July

🪙 1,240 Quest Coins
⭐ 3,850 Stars

Level 5 — Trailblazer

🌈 My Dream
🇸🇬 Singapore Adventure
8,250 / 15,000 Quest Coins
```

---

## 4.5 Recommended Reward Split

A task can grant both currencies:

```text
Easy Quest:
🪙 +5 to +10 Coins
⭐ +3 to +8 Stars

Medium Quest:
🪙 +10 to +20 Coins
⭐ +8 to +15 Stars

Challenge Quest:
🪙 +20 to +40 Coins
⭐ +15 to +30 Stars

Major Achievement:
🪙 Optional bonus
⭐ Large Star award
```

Stars should emphasize effort, consistency, independence, learning and character.

Quest Coins should primarily support the Reward Store and Dream Reward economy.

---

# 5. Dream Reward

Each child can select one reward as their current dream.

Example:

```text
MY DREAM

Singapore Adventure

Current Quest Coins:
8,250

Required Quest Coins:
15,000

Progress:
███████████░░░░░░ 55%

6,750 Quest Coins to go!
```

The Dream Reward should appear prominently on the child's Home screen.

This should be one of the application's main motivational elements.

---

# 6. Task Workflow

Tasks should use an approval workflow.

```text
TODO
  ↓
SUBMITTED
  ↓
APPROVED
  ↓
GOLD AWARDED
```

The child should not receive Quest Coins immediately after pressing **I'M DONE**.

Instead:

1. Child completes the task.
2. Child presses **I'M DONE**.
3. Task status changes to `SUBMITTED`.
4. Parent receives a pending approval.
5. Parent approves the task.
6. Quest Coins are awarded.
7. A Quest Coin transaction is recorded.

Example child screen:

```text
Read English Book

Goal:
Read for 30 minutes

Reward:
+15 Quest Coins

[ I'M DONE! ]
```

After submission:

```text
Awesome!

Waiting for Mom or Dad to approve.
```

Parent view:

```text
July completed:

Read English Book

Reward:
+15 Quest Coins

[ Approve ]
[ Reject ]
```

---

# 7. Quest Coin Ledger

The application should not rely only on a single Quest Coin balance field.

Instead, all changes to Quest Coins should be recorded in a transaction ledger.

Example:

```text
+15  Read Book
+10  Clean Room
+20  Help Grandma
-100 Ice Cream Reward
+50  Weekly Bonus
```

The current balance can then be calculated from these transactions.

Benefits:

- Full history.
- Easier debugging.
- Transparent for parent and child.
- Supports corrections.
- Supports rewards.
- Supports bonuses.
- Supports future reporting.

Typical Quest Coin transaction types:

```text
TASK_REWARD
BONUS
REWARD_REDEMPTION
MANUAL_ADJUSTMENT
CORRECTION
STREAK_BONUS
FAMILY_QUEST
```

---

# 8. Reward Store

The Reward Store should feel similar to a simple game shop.

Example:

```text
REWARD SHOP

Sticker
30 Quest Coins
[ REDEEM ]

Ice Cream
100 Quest Coins
[ REDEEM ]

iPad
8,000 Quest Coins
Progress: 16%

Singapore Trip
15,000 Quest Coins
Progress: 8%
```

A reward can have:

- Name.
- Description.
- Icon or image.
- Required Quest Coins.
- Enabled/disabled state.
- Category.
- Optional stock/availability.
- Optional approval requirement.

Suggested workflow:

```text
AVAILABLE
   ↓
REQUESTED
   ↓
PARENT APPROVED
   ↓
GOLD DEDUCTED
   ↓
REDEEMED
```

---

# 9. Badge & Achievement System

Quest Coins are spendable.

Achievements should remain permanently visible.

Examples:

### Book Worm

```text
Read 10 books
```

### 7 Day Streak

```text
Complete tasks for 7 consecutive days
```

### Super Helper

```text
Complete 20 family-help tasks
```

### English Star

```text
Complete 50 English tasks
```

### Coin Master

```text
Earn 1,000 Quest Coins
```

Profile example:

```text
JULY

Level 7

1,240 Quest Coins

Badges:

Book Worm
7 Day Streak
Super Helper
English Star
```

---

# 10. Recurring Tasks

Parents should be able to configure repeating tasks.

Example:

```text
Task:
Read English

Repeat:
Monday
Tuesday
Wednesday
Thursday
Friday

Quest Coins:
10
```

Another example:

```text
Task:
Clean bedroom

Repeat:
Every Sunday

Quest Coins:
30
```

The application should generate the appropriate task assignment automatically.

---

# 11. Bonus & Streak System

Gamification can be added after the MVP.

Examples:

```text
3-day streak
+10 Quest Coins

7-day streak
+30 Quest Coins

Complete all tasks today
+20 Quest Coins
```

Quest Coins should primarily reward positive behavior.

Avoid making punishment the main mechanic.

Parents can still manually adjust Quest Coins when necessary.

Example:

```text
Adjust Quest Coins

+50

Reason:
Birthday bonus
```

or:

```text
Adjust Quest Coins

-100

Reason:
Reward correction
```

Every change must appear in the Quest Coin Ledger.

---

# 12. Family Quests

Family Quests encourage cooperation.

Example:

```text
FAMILY QUEST

Clean the living room together.

July:
+20 Quest Coins

Berry:
+20 Quest Coins
```

Other examples:

- Prepare dinner together.
- Organize books.
- Help grandparents.
- Complete a weekend reading challenge.
- Prepare luggage for a family trip.
- Clean up toys together.

Future group reward example:

```text
Family Goal

Both children earn 500 Quest Coins this month.

Reward:
Family picnic
```

---

# 13. Child Application Navigation

The Child Mode should remain very simple.

Recommended bottom navigation:

```text
Home
Quests
Rewards
Me
```

## 13.1 Home

The Home screen should show:

- Greeting.
- Uploaded avatar for July or Berry.
- Current Quest Coins.
- Dream Reward.
- Dream progress.
- Today's main quests.
- Current streak.
- Recent achievement.

Example:

```text
Hi July!

1,250 Quest Coins

MY DREAM

Singapore Adventure

███████░░░ 72%

TODAY'S ADVENTURES

Read
30 minutes
+15 Quest Coins

[ I'M DONE! ]
```

## 13.2 Quests

Sections:

```text
Today
Upcoming
Waiting for Approval
Completed
Family Quests
```

## 13.3 Rewards

Sections:

```text
My Dream
Available Rewards
Almost Unlocked
Redeemed Rewards
```

## 13.4 Me

Show:

- Avatar.
- Current Quest Coins.
- Level.
- Streak.
- Badges.
- Achievements.
- Quest Coin history.

---

# 14. Parent Dashboard

Recommended navigation:

```text
Dashboard
Tasks
Rewards
Kids
Settings
```

## Dashboard

Example:

```text
FAMILY DASHBOARD

Children

July
2,340 Quest Coins

Berry
1,820 Quest Coins

Pending Approval:
3 Tasks

Read book - July
Clean room - Berry
English - Berry

[ Create Task ]
[ Create Reward ]
```

Parent dashboard widgets may include:

- Pending approvals.
- Today's tasks.
- Quest Coins earned this week.
- Recent rewards.
- Child progress.
- Dream progress.
- Family Quest status.

---

# 15. Language & Localization

The application should support two languages from the first production version.

## 15.1 Default Language

The default application language is:

```text
English
```

If the user has never selected a language before, the application opens in English.

## 15.2 Vietnamese Support

Vietnamese should be available from Settings.

Example:

```text
Settings
  └── Language
       ├── English
       └── Tiếng Việt
```

The application should remember the selected language.

Recommended persistence:

- Parent preference stored in the user profile or `user_preferences`.
- Child preference can optionally be stored in the `children` table.
- A local browser/device preference can also be cached for faster startup.

## 15.3 Translation Strategy

Do not hard-code UI strings directly in React components.

Recommended structure:

```text
messages/
  en.json
  vi.json
```

Example:

```json
{
  "home": {
    "greeting": "Hi {name}!",
    "myDream": "My Dream"
  },
  "quests": {
    "title": "Quests",
    "done": "I'm Done!",
    "waitingApproval": "Waiting for Approval"
  }
}
```

Vietnamese:

```json
{
  "home": {
    "greeting": "Chào {name}!",
    "myDream": "Ước mơ của con"
  },
  "quests": {
    "title": "Nhiệm vụ",
    "done": "Con làm xong rồi!",
    "waitingApproval": "Đang chờ duyệt"
  }
}
```

The names **July** and **Berry** should not be translated.

## 15.4 Child-Friendly Language

Translations should prioritize natural, short, child-friendly wording rather than literal translation.

For example:

```text
English:
Great job, July!

Vietnamese:
Giỏi lắm, July!
```

rather than using formal wording.

---


## UI Terminology for Currency and Progress

English:

```text
🪙 Quest Coins
⭐ Stars
🎁 Rewards
🌈 My Dream
🏆 Achievements
```

Vietnamese:

```text
🪙 Xu
⭐ Sao
🎁 Phần thưởng
🌈 Ước mơ của con
🏆 Thành tích
```

Important rule:

- Keep **BloomQuest** as the product name.
- Do not label the spendable currency simply as "Quest Coins" in the UI.
- Use **Quest Coins** in English.
- Use **Xu** in Vietnamese.
- Use **Stars / Sao** for lifetime achievement progress.


# 16. Authentication

## 15.1 Parent Authentication

Recommended options:

- Email OTP.
- Magic link.

A full password-based account is not required for the first version.

## 15.2 Child Authentication

Children should not need an email address.

Recommended flow:

```text
Who's playing?

July
Berry
```

Then:

```text
Enter PIN

● ● ● ●
```

Use a four- or six-digit PIN.

Parent Mode should use separate authentication.

---

# 17. Proposed Technology Stack

Recommended stack:

```text
Frontend:
Next.js
TypeScript

UI:
Tailwind CSS
Responsive Design

Localization:
English default
Vietnamese optional
next-intl or equivalent i18n library

Backend:
Next.js Server Actions / API Routes

Database:
PostgreSQL

Backend Platform:
Supabase

Authentication:
Supabase Auth

Storage:
Supabase Storage for child avatars and future reward images

Hosting:
Vercel

Source Control:
GitHub

Mobile Experience:
Progressive Web App (PWA)
```

Architecture:

```text
        iPhone / iPad / Browser
                  │
                  ▼
            PWA / Web App
                  │
                  ▼
        ┌──────────────────┐
        │     Next.js      │
        │    TypeScript    │
        │ Responsive UI    │
        └────────┬─────────┘
                 │
              Vercel
                 │
                 ▼
        ┌──────────────────┐
        │     Supabase     │
        │                  │
        │ PostgreSQL       │
        │ Authentication   │
        │ Avatar Storage   │
        └──────────────────┘
```

---

# 18. Why PWA

A Progressive Web App is a good fit because the application can:

- Run in Safari or Chrome.
- Be added to the iPhone/iPad Home Screen.
- Have its own application icon.
- Launch in an app-like window.
- Avoid App Store deployment.
- Be updated immediately from the server.
- Work across phones, tablets, and desktops.

This keeps development and deployment simple.

---

# 19. Initial Database Design

Suggested tables:

```text
families
users
children
user_preferences

tasks
task_assignments
task_completions

rewards
reward_redemptions

coin_transactions

badges
child_badges

family_quests
family_quest_members
```

---

# 20. Suggested Entity Relationships

```text
Family
 │
 ├── Parent Users
 │
 ├── Children
 │
 ├── Tasks
 │     │
 │     └── Task Assignments
 │             │
 │             └── Task Completions
 │
 ├── Rewards
 │     │
 │     └── Reward Redemptions
 │
 ├── Quest Coin Transactions
 │
 ├── Badges
 │
 └── Family Quests
```

---

# 21. Example Data Models

## Child

```text
id
family_id
name
avatar_url
pin_hash
current_dream_reward_id
preferred_language
lifetime_stars
created_at
updated_at
```

Initial children:

```text
July
Berry
```

### Avatar Storage

Child avatars should be uploaded by the parent.

Recommended storage structure:

```text
family-avatars/
  <family_id>/
    july/
      avatar.jpg
    berry/
      avatar.jpg
```

Requirements:

- Parent can upload an image from phone, tablet, or desktop.
- Parent can replace an existing avatar.
- The UI should show a preview before saving.
- Images should be resized/compressed before or during upload.
- Store only the avatar URL/path in the `children` table.
- Avatar files should be kept in a private or appropriately protected storage bucket.
- A default illustrated avatar should be shown if no image has been uploaded.

## Task

```text
id
family_id
name
description
coin_reward
star_reward
category
is_recurring
recurrence_rule
created_by
active
created_at
```

## Task Assignment

```text
id
task_id
child_id
due_date
status
created_at
```

## Task Completion

```text
id
assignment_id
submitted_at
approved_at
approved_by
status
note
```

## Quest Coin Transaction

```text
id
child_id
amount
transaction_type
reference_id
description
created_by
created_at
```

## Reward

```text
id
family_id
name
description
coin_cost
image_url
active
created_at
```

## Reward Redemption

```text
id
reward_id
child_id
coin_cost
status
requested_at
approved_at
approved_by
```

---


## Star Transaction Model

Stars should also use an immutable ledger rather than only storing a total.

Suggested table:

```text
star_transactions
```

Fields:

```text
id
child_id
amount
transaction_type
reference_id
description
created_by
created_at
```

Typical Star transaction types:

```text
TASK_STAR_REWARD
BADGE_BONUS
STREAK_BONUS
WEEKLY_CHALLENGE
FAMILY_QUEST
MANUAL_ADJUSTMENT
CORRECTION
```

`children.lifetime_stars` may be cached for fast display, but the ledger remains the source of truth.


# 22. MVP Scope

The first usable version should include only the essential features.

## Parent

- Parent login.
- Create child profiles.
- Create task.
- Assign task.
- Configure Quest Coin reward.
- Approve completed task.
- Create reward.
- Approve reward redemption.
- View Quest Coin ledger.
- Manual Quest Coins adjustment.

## Child

- Select profile.
- Enter PIN.
- View today's tasks.
- Submit completed task.
- View pending approval.
- View Quest Coin balance.
- View Quest Coin history.
- Browse rewards.
- Request reward redemption.

## Platform

- Responsive phone layout.
- Responsive tablet layout.
- PWA configuration.
- English as the default language.
- Vietnamese language support.
- Language switcher in Settings.
- Persist selected language.
- Upload avatar for July.
- Upload avatar for Berry.
- Avatar preview and replacement.
- Supabase Storage for avatar files.
- Deploy to Vercel.
- Supabase database.
- GitHub repository.

---

# 23. Features After MVP

After the family has used the MVP for a while, add:

- Dream Reward.
- Avatar customization.
- Badges.
- Levels.
- Streaks.
- Family Quests.
- Weekly challenges.
- Push notifications.
- Confetti animations.
- Photo proof.
- Weekly statistics.
- Task categories.
- Reward categories.
- Parent insights.
- Vacation mode.
- Offline-friendly screens.

---

# 24. UI/UX Direction

Do not design the child application like:

- JIRA.
- Trello.
- Todoist.
- A corporate dashboard.

Preferred inspiration:

```text
Duolingo
+
Kids Game
+
Reward Chart
+
Savings Goal
```

Recommended visual style:

- Rounded cards.
- Large illustrations.
- Quest Coins coin icon.
- Stars.
- Trophies.
- Gift boxes.
- Friendly avatars.
- Progress bars.
- Small animations.
- Confetti for achievements.
- Large tap targets.

Avoid excessive text.

---

# 25. Child Home Screen Wireframe

```text
┌──────────────────────────────┐
│ 👧 Hi July!                │
│                              │
│       🪙 1,240 GOLD          │
│                              │
│ ❤️ MY DREAM                  │
│                              │
│ 🇸🇬 Singapore Adventure      │
│ ████████░░░░░░ 55%           │
│                              │
│ 8,250 / 15,000 Quest Coins          │
│                              │
│ ⭐ TODAY'S QUESTS            │
│                              │
│ 📚 Read 30 min        +10 🪙 │
│ 🧹 Clean room         +15 🪙 │
│ 🇬🇧 English           +10 🪙 │
│ ❤️ Help family        +10 🪙 │
│                              │
│ Home Quests Rewards Me       │
└──────────────────────────────┘
```

---

# 26. Deployment Architecture

Recommended deployment flow:

```text
Developer
   │
   ▼
GitHub Repository
   │
   │ git push
   ▼
Vercel
   │
   ├── Next.js frontend
   ├── API routes
   └── PWA
          │
          ▼
      Supabase
   ├── PostgreSQL
   ├── Authentication
   └── Storage
```

Initial URL can use:

```text
goldquest.vercel.app
```

A custom domain can be added later.

---

# 27. Development Roadmap

## Phase 1 – Product Foundation

Build:

- Family model.
- Parent user.
- Child profiles for **July** and **Berry**.
- Avatar upload and storage.
- English/Vietnamese localization foundation.
- Task model.
- Reward model.
- Quest Coin ledger.

Goal:

> Establish the core business model.

---

## Phase 2 – Usable MVP

Build:

- Task creation.
- Task assignment.
- Child task screen.
- Task completion.
- Parent approval.
- Quest Coin transaction.
- Reward store.
- Reward redemption.
- Responsive UI.

Goal:

> The family can start using the system every day.

---

## Phase 3 – Kids Experience

Build:

- Dream Reward.
- Progress bar.
- Avatar.
- Badges.
- Streak.
- Levels.
- Confetti animation.
- Better visual design.

Goal:

> Make the application fun and motivating.

---

## Phase 4 – Family Experience

Build:

- Family Quests.
- Weekly challenge.
- Shared family goals.
- Statistics.
- Weekly review.
- Notifications.

Goal:

> Encourage cooperation and create family habits.

---

## Phase 5 – PWA Experience

Build:

- App manifest.
- Application icon.
- Splash screen.
- Add to Home Screen.
- Push notifications.
- Offline-friendly loading.

Goal:

> Make the web app feel like a native mobile application.

---

# 28. Recommended First Release

For the first real version, focus only on:

```text
Parent Login

2 Child Profiles:
July
Berry

Upload / Change Child Avatar

English Default Language
Vietnamese Language Option

Create Task
Assign Task
Task Quest Coins

Child Task List
Mark Complete

Parent Approval

Quest Coin Balance
Lifetime Stars / Level
Quest Coin Ledger

Reward Store
Redeem Reward

Parent Approve Reward

Responsive Mobile / iPad UI

PWA

Vercel Deployment
```

Do not build all gamification features before using the application with the children.

Observe how they use the MVP first, then decide which game mechanics actually create motivation.

---

# 29. Recommended Product Center

The emotional center of the child application should be:

```text
MY DREAM

Singapore Adventure

8,250 / 15,000 Quest Coins

███████████░░░░░░ 55%

6,750 Quest Coins to go!
```

Tasks are the daily actions.

Quest Coins are the progress mechanism.

Rewards are the motivation.

Achievements create long-term pride.

Family Quests encourage cooperation.

Together, these make the application more than a task tracker: it becomes a simple family habit-building game.
---

# 30. Initial Task Catalog by Age

The first version of the application should include a useful set of preconfigured tasks so the parent can start using the app immediately and customize later.

The two children are currently in:

- **Grade 6**
- **Grade 3**

Tasks should not be identical for both children. Similar behaviors may exist at different difficulty levels, with different expectations and Quest Coin rewards.

The purpose is to keep the system fair by age and maturity rather than comparing the children directly.

---

## 30.1 Suggested Quest Coins Economy

Recommended starting scale:

| Task / Reward Type | Suggested Quest Coins |
|---|---:|
| Small task, 10–20 minutes | 5–10 |
| Moderate effort task | 15–25 |
| Weekly challenge | 30–75 |
| Special achievement | 50–100 |
| Small reward | 50–300 |
| Medium reward | 500–2,000 |
| Large reward | 2,000–6,000 |
| Dream reward | 5,000+ |

Large Dream Rewards such as an iPad or Singapore trip should normally require months of saving rather than only a few weeks.

All values remain configurable by the parent.

---

## 30.2 Grade 3 Tasks

### Learning

| Task | Description | Quest Coins |
|---|---|---:|
| Read 20 Minutes | Read an age-appropriate book for at least 20 minutes | 10 |
| English Reading | Read an English book or story for 15 minutes | 10 |
| Learn 5 New English Words | Learn and remember 5 new English words | 10 |
| Math Practice | Complete 10–15 additional math problems | 10 |
| Finish Homework | Finish homework on time | 10 |
| Beautiful Handwriting | Practice one careful page of handwriting | 8 |
| Tell Me What You Learned | Explain one new thing learned today | 8 |
| Reading Challenge | Finish one age-appropriate book | 40 |

### Responsibility

| Task | Description | Quest Coins |
|---|---|---:|
| Make My Bed | Make the bed independently | 5 |
| Clean My Desk | Organize the study desk | 5 |
| Prepare School Bag | Prepare school bag for the next day | 5 |
| Put Away Toys | Put toys and belongings back in place | 5 |
| Fold My Clothes | Fold simple clothing items | 8 |
| Clean My Room | Clean and organize the bedroom | 15 |
| Help Set the Table | Help prepare the dining table | 8 |
| Help With Dishes | Help clear dishes after a meal | 8 |

### Family & Character

| Task | Description | Quest Coins |
|---|---|---:|
| Help Someone | Proactively help a family member | 10 |
| Kind Act | Do a kind action without being asked | 10 |
| Help Sister | Help her sister with something useful | 10 |
| Call Grandparents | Call or spend time talking with grandparents | 10 |
| No Reminder Challenge | Complete a responsibility without parent reminder | 15 |
| Say Thank You | Proactively express gratitude at an appropriate moment | 5 |

### Health & Activity

| Task | Description | Quest Coins |
|---|---|---:|
| Exercise 20 Minutes | Exercise for at least 20 minutes | 10 |
| Outdoor Play | Play or exercise outside for 30 minutes | 10 |
| Bike Ride | Complete a meaningful bike ride | 10 |
| Swimming Practice | Practice swimming with good effort | 15 |
| Healthy Snack Choice | Choose a healthy snack voluntarily | 5 |

---

# 31. Grade 6 Task Catalog

Grade 6 tasks should increasingly reward self-management, independence and responsibility.

## 31.1 Learning

| Task | Description | Quest Coins |
|---|---|---:|
| Read 30 Minutes | Read for at least 30 minutes | 15 |
| English Reading | Read English material for 30 minutes | 15 |
| Learn 10 New English Words | Learn 10 words and use them in sentences | 15 |
| Math Practice | Complete extra math practice beyond homework | 15 |
| Finish Homework Independently | Complete homework without parent reminder | 15 |
| Review Today's Lessons | Review lessons learned during the day | 10 |
| Prepare for Tomorrow | Check schedule and prepare school materials | 10 |
| Explain What You Learned | Explain a new concept clearly to a parent | 15 |
| Finish One Book | Finish one suitable book | 50 |
| Mini Research Project | Research a topic and present the findings | 40 |
| English Speaking Practice | Practice speaking English for 15–20 minutes | 15 |

## 31.2 Self-Management

| Task | Description | Quest Coins |
|---|---|---:|
| Plan My Week | Create a simple school/activity plan for the week | 20 |
| Finish Tasks Without Reminder | Complete assigned work without reminders | 20 |
| Keep Desk Organized | Keep study desk organized for the week | 30 |
| Prepare School Bag | Prepare everything needed for the next school day | 5 |
| Track Homework | Check homework and deadlines independently | 10 |
| Screen Time Self-Control | Stop screen time at the agreed time without reminder | 15 |

The **Screen Time Self-Control** task is intended to reward self-regulation rather than making the parent responsible for ending device time.

## 31.3 Responsibility

| Task | Quest Coins |
|---|---:|
| Clean My Room | 20 |
| Fold My Clothes | 10 |
| Organize Wardrobe | 20 |
| Help With Dishes | 10 |
| Help Prepare Dinner | 15 |
| Vacuum a Room | 15 |
| Take Care of Plants | 10 |
| Help Younger Sister | 15 |
| Organize Bookshelf | 15 |

## 31.4 Character & Family

| Task | Quest Coins |
|---|---:|
| Help Family Without Being Asked | 15 |
| Help Sister With Homework | 15 |
| Teach Sister Something | 20 |
| Call Grandparents | 10 |
| Resolve a Conflict Calmly | 20 |
| Admit a Mistake Honestly | 15 |
| Do a Kind Act | 15 |

The application should reward not only academic performance but also communication, maturity, responsibility and cooperation.

---

# 32. Family Quest Catalog

Family Quests encourage July and Berry to cooperate rather than compete.

| Family Quest | Quest Coins per Child |
|---|---:|
| Clean the living room together | 20 |
| Organize the bookshelf together | 20 |
| Prepare breakfast with parents | 20 |
| Help grandparents | 25 |
| Family walk for 45 minutes | 15 |
| Cook one simple dish together | 30 |
| No-fighting afternoon challenge | 20 |
| Prepare luggage together before a trip | 25 |
| Clean up after family dinner | 15 |
| Teach each other something new | 20 |

## Sister Teamwork Challenge

Example special quest:

```text
SISTER TEAMWORK CHALLENGE

Complete one shared task together.

Requirements:
- Divide the work by yourselves.
- Cooperate.
- Finish without arguing.

Reward:
July +30 Quest Coins
Berry +30 Quest Coins
```

---

# 33. Weekly Challenges

Weekly Challenges create larger goals beyond daily tasks.

## 33.1 Suggested Grade 3 Weekly Challenges

| Challenge | Bonus |
|---|---:|
| Read on 5 days | +40 Quest Coins |
| Keep room clean for 5 days | +30 Quest Coins |
| Learn 25 English words | +40 Quest Coins |
| Help family 5 times | +40 Quest Coins |

## 33.2 Suggested Grade 6 Weekly Challenges

| Challenge | Bonus |
|---|---:|
| Read 150 minutes in one week | +60 Quest Coins |
| Learn 50 English words | +60 Quest Coins |
| Complete homework without reminders all week | +75 Quest Coins |
| Manage school preparation independently for 5 days | +60 Quest Coins |
| Help family or sister 5 times | +50 Quest Coins |

---

# 34. Initial Reward Store Catalog

The initial Reward Store should contain multiple reward levels so children can enjoy short-term rewards while also saving for larger dreams.

---

## 34.1 Small Rewards

These should be reachable relatively often.

| Reward | Quest Coins |
|---|---:|
| Sticker | 30 |
| Favorite snack | 60 |
| Ice cream | 100 |
| Choose tonight's dessert | 100 |
| Choose family movie | 120 |
| Extra 20 minutes screen time | 150 |
| Small stationery item | 150 |
| Cute notebook | 200 |
| Small toy | 300 |

Not all rewards need to cost money.

---

## 34.2 Medium Rewards

| Reward | Quest Coins |
|---|---:|
| Bubble tea / favorite drink | 250 |
| Choose weekend breakfast | 300 |
| Movie theater | 500 |
| New book | 500 |
| Small LEGO set | 700 |
| Art supplies | 700 |
| Eat at favorite restaurant | 800 |
| New T-shirt | 1,000 |
| Toy / accessory | 1,000 |
| Family activity of choice | 1,200 |

---

## 34.3 Large Rewards

| Reward | Quest Coins |
|---|---:|
| Large LEGO set | 2,000 |
| Nice headphones | 2,500 |
| Bicycle accessory | 2,000 |
| Day trip chosen by child | 2,500 |
| Theme park / special activity | 3,000 |
| Special birthday experience | 3,000 |
| Smart watch | 5,000 |

---

## 34.4 Dream Rewards

| Dream Reward | Quest Coins |
|---|---:|
| Large LEGO / favorite toy | 4,000 |
| Bicycle | 5,000 |
| Apple Watch or similar device | 6,000 |
| iPad | 8,000 |
| Special family resort trip | 10,000 |
| Singapore Adventure | 15,000 |

Example Dream screen:

```text
SINGAPORE ADVENTURE

15,000 Quest Coins

July
████████░░░░░░░ 42%

Berry
██████░░░░░░░░░ 31%
```

This is a shared view of two individual progress journeys, not a leaderboard.

---

# 35. Experience Rewards

The Reward Store should include experiences, not only physical products.

Suggested experience rewards:

- Cook with Dad.
- Bake a cake with Mom.
- Choose Family Movie.
- Choose Dinner.
- Swimming Day.
- Art Day.
- Bike Trip.
- Stay up 30 minutes later on Saturday.
- Choose a restaurant.
- Family Game Night.
- Weekend camping.
- One-on-one Dad & Daughter Day.
- One-on-one Mom & Daughter Day.
- Choose a weekend family activity.

Experience rewards can create memorable family moments while keeping the system from becoming purely materialistic.

---

# 36. Initial Badge Catalog

Badges are permanent achievements and should not disappear when Quest Coins are spent.

| Badge | Condition |
|---|---|
| Book Worm | Finish 5 books |
| Super Reader | Finish 20 books |
| English Star | Complete 30 English quests |
| Math Hero | Complete 30 Math quests |
| Super Helper | Complete 30 helping tasks |
| Great Sister | Complete 20 sister-help tasks |
| 7 Day Streak | Be active for 7 consecutive days |
| 30 Day Streak | Be active for 30 days |
| Coin Collector | Earn the first 1,000 Quest Coins |
| Coin Master | Earn 5,000 Quest Coins |
| Independent Kid | Complete 20 tasks without parent reminder |
| Curious Mind | Complete 10 research/learning challenges |

Badges may later have:

- Icon.
- Name.
- Description.
- Unlock condition.
- Date unlocked.
- Progress toward unlock.
- Rarity or category.

---

# 37. Basic Responsibility vs Extra Effort

The reward system should distinguish between:

## Basic Responsibility

Examples:

- Brush teeth.
- Go to school.
- Eat meals.
- Go to bed.
- Put away personal belongings after normal use.

These actions do not necessarily need to award Quest Coins every time because they are part of normal daily responsibility.

## Extra Effort, Consistency or Independence

Examples:

- Prepare school materials independently.
- Finish homework without reminder.
- Read an extra 30 minutes.
- Help a sister voluntarily.
- Help family without being asked.
- Practice English beyond required homework.
- Organize a personal space independently.
- Manage screen time responsibly.

These are stronger candidates for Quest Coin rewards.

The design goal is to avoid teaching:

> "Why should I do normal responsibilities if I do not receive Quest Coins?"

Instead, Quest Coins should primarily reinforce:

- Extra effort.
- Consistency.
- Initiative.
- Independence.
- Self-management.
- Learning.
- Cooperation.
- Positive character.

---

# 38. Seed Data for First Release

The first release should provide useful seed data rather than starting with an empty configuration.

Recommended initial dataset:

```text
Grade 3 Tasks:
~25 tasks

Grade 6 Tasks:
~30 tasks

Family Quests:
~10 quests

Rewards:
~20 rewards

Badges:
~12 badges

Weekly Challenges:
~8 challenges
```

Parents should be able to:

```text
Edit
Duplicate
Disable
Add New
Delete Custom Item
Adjust Quest Coins
Change Assignment
```

System-provided templates should be editable or duplicable so the family can customize the app over time.

Recommended data behavior:

```text
System Template
      │
      ├── Use as-is
      │
      ├── Edit for Family
      │
      └── Duplicate
              │
              ▼
        Custom Family Item
```

This allows BloomQuest Family to be useful from the first day while remaining fully customizable for July, Berry and future family needs.

---

# 39. Task and Reward Customization Requirements

Each task should support:

```text
Name
Description
Category
Quest Coin value
Child assignment
Age/grade recommendation
One-time or recurring
Schedule
Difficulty
Requires parent approval
Active / inactive
System template / custom
```

Each reward should support:

```text
Name
Description
Category
Quest Coin cost
Image or icon
Child availability
Stock / availability
Requires parent approval
Dream Reward eligibility
Active / inactive
System template / custom
```

Parents should be able to customize all initial values without modifying source code.

---

# 40. Recommended Initial Configuration for July and Berry

The setup wizard should allow the parent to map each child to a grade instead of hard-coding assumptions into the application.

Example:

```text
July
Grade: 6
Avatar: Uploaded by parent
Language: English / Vietnamese

Berry
Grade: 3
Avatar: Uploaded by parent
Language: English / Vietnamese
```

The parent can change the grade later.

Task recommendations should use the configured grade as a default filter, while the parent can still assign any task to either child.

Example:

```text
Recommended for Grade 6
Recommended for Grade 3
Family Quest
Custom
```

This keeps the product flexible as July and Berry move to higher grades.
---

# 41. Evidence-Based Long-Term Motivation Strategy

BloomQuest Family should be designed for **months and years of use**, not only for the first few exciting weeks.

Research on gamification consistently shows that points, badges and rewards can improve engagement, but novelty and purely extrinsic rewards may lose effectiveness over time. The product therefore should not rely only on:

```text
Task → Quest Coins → Buy Reward
```

Instead, the long-term motivation model should be:

```text
Choice
  +
Visible Progress
  +
Mastery
  +
Family Connection
  +
Variety
  +
Meaningful Rewards
  +
Personal Identity
```

The design should support three core motivational needs:

### Autonomy

Children feel:

> "I have some choice in what I do."

Implementation:

- Let July and Berry choose from a small set of optional quests.
- Let them select their own Dream Reward.
- Let them choose an avatar or avatar frame.
- Let them choose some weekly challenges.
- Allow them to suggest a new reward to the parent.
- Allow Grade 6 to create a simple weekly plan.

### Competence

Children feel:

> "I am getting better."

Implementation:

- Clear progress bars.
- Skill-specific levels.
- Badges.
- Milestones.
- Immediate positive feedback.
- Weekly progress summaries.
- Personal bests.
- Increasingly challenging quests.
- Visible completed collections.

### Relatedness

Children feel:

> "I am doing this together with people I care about."

Implementation:

- Family Quests.
- Sister Teamwork challenges.
- Parent celebration messages.
- Cooperative goals.
- Shared family experiences.
- Helping-family task category.
- No public sibling leaderboard.

This model should guide all future gamification features.

---

# 42. The Core Engagement Loop

The app should use a short daily loop that can be understood almost immediately.

```text
1. Open App
       ↓
2. See Today's Adventure
       ↓
3. Choose / Complete Quest
       ↓
4. Get Immediate Positive Feedback
       ↓
5. Parent Approves
       ↓
6. Earn Quest Coins + Progress
       ↓
7. Move Closer to Dream / Badge / Level
       ↓
8. Discover Tomorrow's New Quests
```

The important point is that the user should progress in **more than one dimension**.

Example after completing a reading task:

```text
+15 Quest Coins

Reading Journey
██████████░░ 8 / 10

Book Worm Badge
80%

Singapore Dream
42%

🔥 Weekly Goal
3 / 5 days
```

The child therefore sees:

- Immediate reward.
- Skill progress.
- Badge progress.
- Dream progress.
- Weekly progress.

This reduces dependence on Quest Coins alone.

---

# 43. Anti-Boredom Design

The system should deliberately prevent repetitive use from feeling stale.

## 43.1 Rotate Content

Do not show the exact same quest cards in the exact same order every day.

Use:

```text
Daily Core Quests
+
Optional Quest
+
Weekly Challenge
+
Family Quest
+
Occasional Special Quest
```

Example:

```text
TODAY'S ADVENTURE

📚 Core Quest
Read for 20 minutes

🎨 Pick One
Draw something new
OR
Learn 5 English words

👭 Family Quest
Help prepare dinner together

🌟 Special Friday Quest
Teach the family something interesting
```

---

## 43.2 Use Quest Pools

Instead of hard-coding one repeated task, create pools.

Example:

```text
English Quest Pool

🔤 Learn new words
📖 Read English story
🎤 Speak English
🎧 Listen and summarize
✍️ Write five sentences
🎭 Role-play conversation
```

The app can rotate recommended quests while the parent can still control them.

---

## 43.3 Monthly Themes

Introduce optional visual themes that refresh the experience without changing the basic navigation.

Examples:

```text
January     🚀 Space Explorer
February    ❤️ Kindness Month
March       🌳 Jungle Adventure
April       🌊 Ocean Explorer
May         🧠 Brain Challenge
June        🏕️ Summer Adventure
July        🎨 Creativity Month
August      🌏 World Explorer
September   🎒 School Power-Up
October     🔬 Science Explorer
November    👨‍👩‍👧 Family Heroes
December    🎄 Holiday Adventure
```

Themes may change:

- Background illustrations.
- Badge art.
- Quest card decorations.
- Collection items.
- Celebration animations.

Themes should **not** change the basic location of navigation controls.

Children should never need to relearn the interface every month.

---

# 44. Adventure Map

Instead of showing only a numeric Level, children can move through a visual Adventure Map.

Example:

```text
🌱 START
   │
   ▼
📚 Reading Forest
   │
   ▼
🧠 Brain Mountain
   │
   ▼
❤️ Kindness Village
   │
   ▼
🌊 Ocean Challenge
   │
   ▼
🌏 World Explorer
   │
   ▼
🏆 Dream Castle
```

Each zone can contain:

- 5–10 milestones.
- A collectible sticker.
- A badge.
- A visual celebration.

The map is not a race between July and Berry.

Each child has an independent map.

---

# 45. Personal Progress Instead of Sibling Ranking

Do not show:

```text
1. July  3,200 Quest Coins
2. Berry 2,600 Quest Coins
```

Instead show:

```text
JULY'S JOURNEY

Reading Level      ⭐⭐⭐⭐☆
Independence       ⭐⭐⭐☆☆
Family Helper      ⭐⭐⭐⭐☆
Weekly Goal        80%
Dream Goal         42%
```

and separately:

```text
BERRY'S JOURNEY

Reading Level      ⭐⭐⭐☆☆
Kindness           ⭐⭐⭐⭐☆
Math Adventure     ⭐⭐⭐☆☆
Weekly Goal        100%
Dream Goal         35%
```

Parents can view both children from the Parent Dashboard, but the child UI should emphasize self-improvement.

Useful comparison:

```text
This week vs your previous week
```

rather than:

```text
You vs your sister
```

---

# 46. Safe Streak Design

Streaks can be motivating but should not become stressful.

Recommended system:

```text
🔥 3 Day Streak
🔥 7 Day Streak
🔥 14 Day Streak
🔥 30 Day Journey
```

However:

- Do not erase all progress after one missed day.
- Do not use threatening notifications.
- Do not punish a child for illness, travel or family schedules.
- Allow a parent to pause streak tracking.
- Provide one optional Grace Day per week.
- Prefer weekly consistency over perfect daily activity.

Example:

```text
🔥 Great Week!

You completed quests on
5 of 7 days.

Weekly Goal Complete!
```

Instead of:

```text
You lost your 48-day streak!
```

A missed period should generate a positive comeback state:

```text
🌈 Welcome Back, Berry!

Ready for a new adventure?

[ Start Today's Quest ]
```

No lost Quest Coins.

No shame message.

---

# 47. Milestones Inside Large Dream Rewards

A reward such as the Singapore trip may take many months.

Waiting until 15,000 Quest Coins can feel too distant.

Add intermediate milestones.

Example:

```text
🇸🇬 SINGAPORE ADVENTURE

3,750 Quest Coins   25%   🌟 Explorer Sticker
7,500 Quest Coins   50%   🦁 Merlion Badge
11,250 Quest Coins  75%   🧳 Travel Hero Badge
15,000 Quest Coins 100%   🇸🇬 Dream Unlocked
```

These milestone rewards should mostly be:

- Badges.
- Stickers.
- Avatar frames.
- Celebration screens.
- Collections.

They should not reduce the saved Quest Coins.

---

# 48. Collection System

Children can collect visual items without spending Quest Coins.

Examples:

```text
🐾 Animal Stickers
🌍 Country Stickers
🪐 Space Collection
🐠 Ocean Collection
📚 Book Collection
🌈 Kindness Collection
```

Example:

```text
WORLD EXPLORER

🇻🇳 Vietnam       ✅
🇸🇬 Singapore     ✅
🇯🇵 Japan         🔒
🇫🇷 France        🔒
🇦🇺 Australia     🔒
```

Collections provide a long-term completion goal that is separate from material rewards.

Collection items should be earned through milestones, not random paid mechanics.

---

# 49. Choice-Based Quests

Every day should not be a fixed list of mandatory tasks.

Where appropriate, provide choices.

Example for Grade 3:

```text
🎯 PICK ONE

📖 Read 20 minutes
+10 Quest Coins

OR

🔤 Learn 5 English words
+10 Quest Coins
```

Example for Grade 6:

```text
🎯 CHOOSE YOUR CHALLENGE

📚 Read 30 minutes
+15 Quest Coins

🎤 English speaking practice
+15 Quest Coins

🧠 Mini research
+20 Quest Coins
```

Parent-required tasks remain separate.

Example:

```text
MUST DO
School homework

CHOOSE ONE
Reading / English / Research
```

This gives children autonomy while keeping responsibilities clear.

---

# 50. Quest Difficulty

Tasks can optionally have difficulty levels.

```text
⭐ Easy
⭐⭐ Medium
⭐⭐⭐ Challenge
```

Example:

```text
📚 Reading

⭐
Read 20 minutes
+10 Quest Coins

⭐⭐
Read 30 minutes and tell Dad/Mom what happened
+18 Quest Coins

⭐⭐⭐
Finish a chapter and write a short summary
+25 Quest Coins
```

The parent can disable difficulty levels if they become unnecessary.

---

# 51. Surprise Without Manipulative Random Rewards

The app may occasionally contain a positive surprise, but it should avoid casino-like mechanics or loot-box behavior.

Recommended:

```text
Weekly Treasure Box
```

Unlock condition is visible:

```text
Complete 5 weekly quests
to unlock the Treasure Box.
```

The box may reveal:

- A fun sticker.
- Avatar accessory.
- Celebration animation.
- New background.
- Small bonus badge.

The child should **not** spend real money or Quest Coins to open random boxes.

Do not use:

```text
Buy another spin
Pay Quest Coins for a random prize
Limited-time gambling-like wheel
```

---

# 52. Parent Celebration Messages

Approval should feel human rather than mechanical.

When a parent approves a task, the parent can optionally choose a quick message.

Examples:

```text
🌟 Great job!
💪 I'm proud of your effort!
📚 Awesome reading!
❤️ Thank you for helping!
🚀 Keep going!
```

Parent can also type a short custom note.

Child sees:

```text
✅ APPROVED!

+15 Quest Coins

❤️ Dad says:
"Great job finishing it by yourself!"
```

This links the digital reward to family recognition.

---

# 53. Weekly Reflection

Once per week, show a short positive review.

Example:

```text
🌟 YOUR WEEK

You completed:
18 Quests

You earned:
210 Quest Coins

Your strongest area:
📚 Reading

New badge:
❤️ Super Helper

Dream progress:
38% → 42%

What are you proud of?

[ Reading ]
[ Helping ]
[ School ]
[ Something Else ]
```

For Grade 3, reflection should be mostly icons and selections.

For Grade 6, optionally allow one short sentence.

The purpose is to help the children notice their own progress, not merely collect currency.

---

# 54. Age-Adaptive Experience

July and Berry should use the same product but not necessarily see the same interface density.

The application should use the child's configured grade to choose sensible defaults.

## Grade 3 Experience

Prioritize:

- Large icons.
- Short labels.
- Fewer cards.
- More illustrations.
- Clear visual progress.
- Simple choices.
- More immediate celebrations.

Example:

```text
📖 READ

20 minutes

🪙 +10

[ I'M DONE! ]
```

## Grade 6 Experience

Can show slightly more planning information:

```text
THIS WEEK

Homework        4 / 5
Reading         90 / 150 min
English         3 / 5
Family Help     2 / 3

🎯 Weekly Goal: 72%
```

Grade 6 may also have:

- My Plan.
- Weekly goals.
- Personal challenge selection.
- More detailed progress.
- Self-management tasks.

---

# 55. UI/UX Design Principles

The child interface should be designed first for touch.

Primary principles:

```text
Big
Simple
Visual
Positive
Predictable
Fast
```

Each screen should have one clear main purpose.

Avoid:

- Dense tables.
- Long text.
- Tiny menus.
- Multiple nested dialogs.
- Corporate dashboard appearance.
- Too many statistics.
- Hidden gestures.
- Icon-only actions that are difficult to understand.

---

# 56. Touch Target and Spacing Guidelines

For this product, use generous touch areas.

Recommended product rule:

```text
Primary button:
Minimum height 52–56 px

Regular tappable item:
Minimum 44–48 px

Bottom navigation item:
At least 48 px high with generous horizontal area

Quest card:
Whole card may be tappable where appropriate
```

Do not place small action icons tightly together.

Example:

Bad:

```text
✎ × ⋮
```

Better:

```text
[ ✏️ Edit ]    [ ⋯ More ]
```

This is especially important for the Grade 3 experience.

---

# 57. Visual Language and Fun Icons

The application should have a consistent, friendly visual language.

## 57.1 Core Icon Vocabulary

Recommended semantic icons:

| Meaning | Icon |
|---|---|
| Quest Coins | 🪙 |
| Quest | 🎯 |
| Reading | 📚 |
| Homework | ✏️ |
| English | 🔤 |
| Math | ➗ |
| Research | 🔬 |
| Creativity | 🎨 |
| Responsibility | 🌱 |
| Home Task | 🧹 |
| Health / Exercise | 🏃 |
| Kindness | ❤️ |
| Sister Team | 👭 |
| Family | 👨‍👩‍👧 |
| Dream | 🌈 |
| Reward | 🎁 |
| Badge | 🏆 |
| Achievement | 🌟 |
| Streak | 🔥 |
| Adventure | 🧭 |
| School | 🎒 |
| Completed | ✅ |
| Waiting | ⏳ |
| Locked | 🔒 |
| Celebration | 🎉 |

Emoji are useful for prototypes and seed content.

For production, use a **consistent illustrated icon family** rather than mixing many unrelated icon styles.

Recommended style:

```text
Rounded
Soft
Playful
Sticker-like
Friendly facial expressions where appropriate
Simple silhouette
High contrast
Easy to recognize at small sizes
```

Possible visual treatment:

```text
     ✨
   ┌───────┐
   │  📚   │
   │ READ  │
   └───────┘
```

---

## 57.2 Icon + Text Rule

Do not depend on icons alone for important actions.

Use:

```text
🎁 Rewards
📚 Reading
✅ Done
⏳ Waiting
```

rather than only:

```text
🎁
📚
✅
⏳
```

This improves recognition for both children and supports English/Vietnamese localization.

---

# 58. Child Home Screen – Revised UX

Recommended layout:

```text
┌─────────────────────────────────┐
│  👧 July              🪙 1,240  │
│  Level 7                        │
│                                 │
│  🌈 MY DREAM                    │
│  🇸🇬 Singapore Adventure        │
│  █████████░░░░░ 42%             │
│  Next milestone: 50% 🦁         │
│                                 │
│  🧭 TODAY'S ADVENTURE           │
│                                 │
│  📚 Read 30 min         +15 🪙  │
│  ██████████████████             │
│                                 │
│  🎯 PICK ONE                    │
│  🔤 English  |  🧠 Research     │
│                                 │
│  👭 FAMILY QUEST                │
│  Help prepare dinner    +20 🪙  │
│                                 │
│  🔥 Weekly Journey  4 / 5       │
│                                 │
│ 🏠 Home  🎯 Quests  🎁 Rewards │
│                👧 Me            │
└─────────────────────────────────┘
```

The screen should not contain every feature.

Additional information belongs in the relevant tab.

---

# 59. Quest Card Design

Quest card structure:

```text
┌────────────────────────────────┐
│ 📚                              │
│ READ 30 MINUTES                │
│                                │
│ Finish today's reading quest   │
│                                │
│ 🪙 +15        ⭐⭐ Medium       │
│                                │
│        [ ✅ I'M DONE! ]        │
└────────────────────────────────┘
```

After submission:

```text
┌────────────────────────────────┐
│ ⏳ WAITING FOR APPROVAL        │
│                                │
│ Nice work, July!               │
│ Dad or Mom will check it.      │
└────────────────────────────────┘
```

After approval:

```text
🎉 QUEST COMPLETE!

+15 🪙

Reading Journey
████████░░ 8 / 10

❤️ Great job!
```

---

# 60. Reward Card Design

Example:

```text
┌──────────────────────────┐
│       🍦                 │
│     ICE CREAM            │
│                          │
│       100 🪙             │
│                          │
│    [ 🎁 REDEEM ]         │
└──────────────────────────┘
```

Locked Dream Reward:

```text
┌──────────────────────────┐
│       🇸🇬                 │
│ SINGAPORE ADVENTURE      │
│                          │
│ 6,300 / 15,000 🪙        │
│ ███████░░░░░ 42%         │
│                          │
│ Next: 🦁 50% milestone   │
└──────────────────────────┘
```

---

# 61. Celebration Design

Celebrations should be short and meaningful.

Use:

- Confetti burst.
- Coin movement animation.
- Badge reveal.
- Star sparkle.
- Avatar celebration.
- Progress bar animation.

Recommended animation duration:

```text
~0.5–1.5 seconds for normal task feedback
```

Larger celebrations may be used for:

- New badge.
- Level up.
- 50% Dream milestone.
- Dream Reward unlocked.

Do not interrupt every normal interaction with a long animation.

Allow motion reduction for accessibility.

---

# 62. Navigation

## Child Navigation

Keep four primary destinations:

```text
🏠 Home
🎯 Quests
🎁 Rewards
👧 Me
```

Do not add more primary tabs unless there is a strong need.

Adventure Map can be accessed from Home or Me.

## Parent Navigation

```text
📊 Dashboard
✅ Tasks
🎁 Rewards
👧 Kids
⚙️ Settings
```

Parent UI can be more information-dense than Child UI.

---

# 63. Empty States

Empty states should feel positive.

Instead of:

```text
No tasks found.
```

Use:

```text
🎉 You're all done!

No more quests for today.

Want to read, draw or help someone
for an optional bonus quest?
```

Instead of:

```text
No badges.
```

Use:

```text
🏆 Your Badge Collection

Your first badge is waiting for you!

Complete 3 quests to begin.
```

---

# 64. Localization and Visual Consistency

English remains the default language.

Vietnamese is optional.

Examples:

```text
English:
🎯 Today's Adventure

Vietnamese:
🎯 Phiêu lưu hôm nay
```

```text
English:
✅ I'm Done!

Vietnamese:
✅ Con làm xong rồi!
```

```text
English:
🌈 My Dream

Vietnamese:
🌈 Ước mơ của con
```

The icon should remain consistent between languages.

Do not use dramatically longer Vietnamese labels where a shorter child-friendly phrase is possible.

---

# 65. Child-Safe Engagement Principles

Because this product is designed for children, engagement should support wellbeing rather than maximize screen time.

The app should intentionally avoid:

- Infinite scrolling.
- Autoplay content.
- Repeated pressure notifications.
- Fear-of-missing-out countdowns.
- Punitive streak loss.
- Loot boxes.
- Real-money random rewards.
- Public sibling ranking.
- Dark patterns.
- Unnecessary collection of personal data.

The successful behavior is:

```text
Open App
→ Understand Today's Goal
→ Complete Real-World Activity
→ Record It
→ Leave App
```

The app itself should not become the activity.

---

# 66. Avatar UX and Privacy

July and Berry can use real uploaded photos or illustrated avatars.

Parent controls avatar upload.

Recommended behavior:

```text
Kids
  ↓
July
  ↓
Avatar
  ↓
[ Upload Photo ]
[ Choose Illustration ]
[ Remove Photo ]
```

Privacy rules:

- Avatar images are private to the family.
- Do not expose public profile URLs.
- Do not make profiles discoverable.
- Store only required image data.
- Parent can replace or delete uploaded images.
- Provide default illustrated avatars so real photos are optional.

For a playful experience, the app may also provide avatar frames:

```text
🌟 Star Frame
🌈 Rainbow Frame
🚀 Space Frame
📚 Reader Frame
🦁 Explorer Frame
```

Frames can be unlocked as achievements.

---

# 67. Notifications

Notifications should be optional and primarily controlled by the parent.

Child notifications should be limited.

Good examples:

```text
🎉 Dad approved your Reading Quest!
```

```text
🌟 You unlocked the Book Worm badge!
```

Avoid:

```text
You haven't opened BloomQuest today!
Hurry or lose your streak!
```

Parent notifications may include:

```text
⏳ July has 2 quests waiting for approval.
```

Notifications should be configurable per family.

---

# 68. Personalization Settings

Parent can tune the experience for each child.

Example:

```text
July

Grade:
6

Difficulty:
Standard

Daily Quest Count:
4

Preferred Categories:
📚 Reading
🔤 English
🧠 Research

Celebration Level:
Normal

Streak:
Enabled

Weekly Challenge:
Enabled
```

```text
Berry

Grade:
3

Difficulty:
Standard

Daily Quest Count:
3

Preferred Categories:
📚 Reading
🎨 Creativity
➗ Math

Celebration Level:
High

Streak:
Enabled

Weekly Challenge:
Enabled
```

These are defaults only.

Parent can adjust them at any time.

---

# 69. Child Preference Signals

To prevent boredom, allow simple feedback.

After selected quests:

```text
Did you like this quest?

😍 Love it
🙂 It's OK
😐 Not for me
```

Do not ask after every task.

Collect lightweight signals occasionally.

Parent can view:

```text
July likes:
📚 Reading
🧠 Research
🎤 Speaking

Berry likes:
🎨 Creativity
📖 Story Reading
👭 Family Quests
```

Future recommendations can use these preferences.

No complex AI personalization is required for the MVP.

Simple rule-based personalization is sufficient.

---

# 70. Suggested Recommendation Logic

Possible initial rule:

```text
Daily Quest Set

1 required responsibility task
+
1 learning task
+
1 child-selected task
+
0–1 family or special quest
```

Avoid showing too many tasks.

Suggested defaults:

```text
Grade 3:
3 primary daily quests

Grade 6:
3–5 primary daily quests
```

More tasks can remain in:

```text
Optional Quests
```

This prevents the Home screen from feeling like a long chore list.

---

# 71. Quest Coins Economy Health Check

Parents should periodically see whether Quest Coin values remain motivating.

Dashboard example:

```text
QUEST COIN ECONOMY

Average weekly Quest Coins:
July   310
Berry  260

Small reward:
~2–5 days

Medium reward:
~2–4 weeks

Dream reward:
Long-term goal
```

The system may suggest:

```text
July is earning much faster than expected.

Review task rewards?
```

But it should never automatically change Quest Coin values without parent approval.

---

# 72. Parent Monthly Refresh

Once per month, Parent Dashboard can offer:

```text
🌟 MONTHLY REFRESH

[ ] Add 3 new quests
[ ] Retire boring quests
[ ] Pick next Family Quest
[ ] Review Quest Coins prices
[ ] Choose monthly theme
[ ] Ask July for one reward idea
[ ] Ask Berry for one reward idea
```

This is one of the simplest mechanisms for keeping the app fresh over long periods.

---

# 73. Feature Priority for Long-Term Engagement

## MVP

Must have:

```text
Quest Coins
Tasks
Approval
Rewards
Dream Reward
Avatar
Progress Bars
English / Vietnamese
Simple celebrations
```

## Engagement V1

Add:

```text
Badges
Weekly Challenges
Streak with Grace Day
Family Quests
Milestone Rewards
Quest Choices
```

## Engagement V2

Add:

```text
Adventure Map
Collections
Monthly Themes
Avatar Frames
Weekly Reflection
Preference Feedback
```

## Later / Optional

Consider:

```text
Rule-based quest recommendations
Seasonal content packs
Parent-created story themes
Additional family members
```

Avoid adding complexity merely to increase screen usage.

---

# 74. Acceptance Criteria for Child UX

The child UI should meet these product-level criteria:

### Discoverability

A child can identify the main action on the Home screen without help.

### Readability

Important labels use large, high-contrast text.

### Tapability

Primary controls are large enough for reliable touch use.

### Consistency

The same icon and wording represent the same action everywhere.

### Feedback

Every important action gives immediate visual confirmation.

### Safety

Destructive actions are not available in Child Mode.

### Simplicity

No child screen requires understanding a complex table.

### Localization

Every user-visible UI string supports English and Vietnamese.

### Positive Tone

Failure, missed tasks and returning after absence use neutral or encouraging wording.

### Independence

A child should be able to complete the normal daily flow without parent navigation help.

---

# 75. Research Basis

The motivation and UX recommendations above are informed by the following research and guidance.

## R1 — Self-Determination and Gamification

Research on educational gamification commonly uses Self-Determination Theory to explain sustainable motivation through:

- Autonomy.
- Competence.
- Relatedness.

Design implication for BloomQuest:

> Quest Coins should complement choice, mastery and family connection rather than replace them.

## R2 — Novelty Effect and Extrinsic Rewards

Systematic reviews of gamified learning report that novelty and extrinsic rewards can produce strong initial engagement followed by decreasing motivation with continued exposure.

Design implication:

> Use content rotation, progress, personalization, meaningful feedback and changing challenges instead of relying only on points.

## R3 — Gamification in Education

Meta-analyses and systematic reviews report generally positive effects of well-designed gamification on engagement and motivation, while outcomes depend strongly on implementation context.

Frequently studied elements include:

- Progress.
- Challenges.
- Badges.
- Achievements.
- Levels.
- Feedback.
- Story.
- Rewards.

Design implication:

> Use a balanced combination rather than a simple point system.

## R4 — Personalized / Adaptive Gamification

Recent reviews of personalized and adaptive gamification emphasize that one-size-fits-all systems may not work equally well for every learner.

Design implication:

> July and Berry can have different task difficulty, preferred categories, daily quest count and visual feedback while staying in the same family system.

## R5 — UNICEF RITEC

UNICEF's Responsible Innovation in Technology for Children work studied children's wellbeing in digital play and developed the RITEC-8 framework.

Relevant dimensions include:

- Safety and security.
- Autonomy.
- Emotions.
- Competence.
- Relationships.
- Creativity.
- Identity.
- Diversity, equity and inclusion.

The underlying research involved children aged approximately 8–12, making it particularly relevant to the intended BloomQuest age range.

Design implication:

> Optimize for children's wellbeing and agency, not maximum screen time.

## R6 — Touch Interface Guidance

Apple Human Interface Guidelines recommend approximately 44 × 44 points as a reliable minimum hit region for touch controls.

WCAG 2.2 specifies a 24 × 24 CSS pixel minimum target criterion with defined exceptions, and larger targets improve ease of interaction.

Design implication:

> BloomQuest should use large 44–56 px/pt class touch targets, especially in Grade 3 screens.

## R7 — Child-Friendly Nudges

Age-appropriate design guidance warns against using manipulative nudges with children and encourages design that supports wellbeing and conscious decisions.

Design implication:

> Do not use fear-based streak messages, dark patterns, loot boxes or pressure to remain in the app.

---

# 76. Research References

1. **The role of gamified learning strategies in student's motivation in high school and higher education: A systematic review** — Heliyon / PubMed, 2023.
2. **Gamification enhances student intrinsic motivation, perceptions of autonomy and relatedness, but minimal impact on competency: a meta-analysis and systematic review** — Educational Technology Research and Development, 2024.
3. **Effects of Gamification on Behavioral Change in Education: A Meta-Analysis** — International Journal of Environmental Research and Public Health, 2021.
4. **Gamification in education and training: A literature review** — International Review of Education, 2025.
5. **Adaptive Gamification and Game-Based Learning in Preschool and Early Primary Education: A Systematic Literature Review** — Computers, 2026.
6. **Personalized Gamification: A Technological Approach for Student Education — A Systematic Literature Review** — IEEE, 2025.
7. **Responsible Innovation in Technology for Children (RITEC) / RITEC Design Toolbox** — UNICEF.
8. **Age Appropriate Design Code — Nudge Techniques** — UK Information Commissioner's Office.
9. **Human Interface Guidelines / UI Design Tips** — Apple Developer.
10. **Web Content Accessibility Guidelines (WCAG) 2.2** — W3C.

---

# 77. Final Product Experience Goal

BloomQuest should make July and Berry feel:

```text
"I know what I can do today."

"I can choose some of my challenges."

"I can see that I am improving."

"My effort is noticed."

"I am getting closer to something I really want."

"My sister and I can achieve things together."

"There is something new to discover."

"This is my adventure."
```

The app should **not** make them feel:

```text
"I have another list of chores."

"I have to beat my sister."

"I will lose everything if I miss one day."

"I only do good things when I get Quest Coins."

"I need to stay inside the app."
```

The desired product loop is therefore:

```text
Fun UI
  ↓
Clear Real-World Quest
  ↓
Meaningful Effort
  ↓
Positive Family Recognition
  ↓
Visible Personal Progress
  ↓
New Choice / New Challenge
  ↓
Long-Term Growth
```

This should be the guiding principle for future BloomQuest design decisions.
---

# 78. Currency Model Decision

BloomQuest keeps its current product name, but the point model is now standardized as:

```text
🪙 Quest Coins = spendable currency
⭐ Stars       = lifetime achievement
```

This replaces the previous design where "Quest Coins" was used as the single point unit.

## Rules

### Quest Coins

- Earned from approved quests.
- Used to redeem rewards.
- Used to measure Dream Reward progress.
- Can decrease after redemption.
- Stored through `coin_transactions`.

### Stars

- Earned from quests, badges, streaks, challenges and meaningful achievements.
- Never spent on normal rewards.
- Never decrease due to redemption.
- Used for levels and long-term progress.
- Stored through `star_transactions`.

### Example

```text
📚 Read 30 Minutes

Reward:
🪙 +15 Quest Coins
⭐ +10 Stars
```

```text
July

🪙 1,240 Quest Coins
⭐ 3,850 Stars

Level 5 — Trailblazer
```

```text
🎁 Redeem LEGO

Cost:
🪙 800 Quest Coins

Stars:
No change
```

This dual-currency model is the default design for future implementation.
---

# 79. Additional Product and Architecture Considerations

The following requirements should be considered before implementation because they affect core business logic, data integrity, security and long-term usability.

---

# 80. Parent Approval Should Not Become a Bottleneck

If July and Berry each complete 4–5 quests per day, parents may need to review dozens of submissions every week.

The app should support flexible approval modes.

Suggested task setting:

```text
Approval Mode

○ Always require parent review
○ Auto approve
○ Parent review only for selected completions
```

Recommended defaults:

- Learning challenges: parent review.
- Household responsibility: configurable.
- Repetitive low-risk tasks: optionally auto approve.
- High-value or special reward tasks: always require approval.

Parent approval screen:

```text
⏳ 6 Waiting

📚 July - Read 30 min       +15 🪙  +10 ⭐
🧹 Berry - Clean desk        +5 🪙   +4 ⭐
🔤 July - English           +15 🪙  +10 ⭐

[ ✅ Approve All ]
```

Useful parent actions:

```text
Approve
Reject
Approve All
Swipe to Approve
Open Details
Add Parent Message
```

Bulk approval should still create one validated transaction per completion.

---

# 81. Quest Completion Limits and Anti-Farming

The system must prevent children from repeatedly completing the same quest to generate unlimited Quest Coins.

Each quest should support limits.

Examples:

```text
Maximum:
1 rewarded completion / day
```

```text
Maximum:
3 rewarded completions / week
```

```text
Maximum:
1 rewarded completion / assignment
```

Recommended fields:

```text
max_completions_per_day
max_completions_per_week
max_completions_per_assignment
cooldown_minutes
```

Example:

```text
📚 Read 20 Minutes

Reward:
🪙 +10 Quest Coins
⭐ +8 Stars

Reward Limit:
1 / day
```

A child may still read more, but extra completions should not automatically generate more currency unless the parent creates another challenge.

The server must enforce these limits.

Do not rely only on disabled UI buttons.

---

# 82. Quest Coin Economy and Inflation Control

Quest Coin values may become unbalanced over time as new quests and bonuses are added.

Parent Dashboard should include an economy health view.

Example:

```text
🪙 QUEST COIN ECONOMY

July
Average: 285 Coins / week

Berry
Average: 240 Coins / week

Estimated Reward Time

🍦 Ice Cream       ~2 days
📚 New Book        ~2 weeks
🚲 Bicycle         ~5 months
🇸🇬 Singapore      ~12 months
```

The system may generate suggestions such as:

```text
July is earning Quest Coins faster than the current reward economy expects.

Review task rewards?
```

The app must never automatically change task or reward values without parent approval.

Useful metrics:

```text
Average Coins earned per week
Average Coins spent per week
Current savings rate
Estimated time to Dream Reward
Most common earning source
Most redeemed rewards
```

---

# 83. Recommended Reward Mix

The reward system should not become a direct "chore = money" system.

Recommended target mix:

```text
40% Experience
30% Privilege
20% Small Physical Item
10% Large Dream Reward
```

Examples of privileges:

```text
🎬 Choose family movie
🍕 Choose dinner
🛌 Stay up 30 minutes later
🎮 Extra game time
🎵 Choose music in the car
👨‍👧 Dad & Daughter time
👩‍👧 Mom & Daughter time
```

Experience and privilege rewards should remain highly visible in the Reward Store.

---

# 84. Stars Must Unlock Meaningful Progress

Stars should not simply become a very large number.

Stars should unlock:

```text
⭐ Stars
   │
   ├── Levels
   ├── Badges
   ├── Avatar Frames
   ├── Adventure Map Areas
   ├── Collections
   └── Visual Themes
```

Example:

```text
⭐ 500
Unlock:
🌈 Rainbow Avatar Frame
```

```text
⭐ 1,000
Unlock:
🧭 Adventurer Level
```

```text
⭐ 2,000
Unlock:
🚀 Space Theme
```

Stars are never spent on normal rewards, but their accumulation must visibly change the child experience.

---

# 85. Reward Redemption Lifecycle

A reward request should not immediately be considered completed.

Recommended lifecycle:

```text
AVAILABLE
   ↓
REQUESTED
   ↓
APPROVED
   ↓
COINS RESERVED
   ↓
FULFILLED
```

Optional terminal states:

```text
REJECTED
CANCELLED
EXPIRED
```

Example:

```text
🎁 Ice Cream

Status:
✅ Approved

Planned:
Saturday
```

This is especially important for:

```text
iPad
Singapore Trip
LEGO
Restaurant
Theme Park
Special Experience
```

---

# 86. Quest Coin Reservation

When a reward is approved, Quest Coins should optionally move into a reserved balance rather than being permanently spent immediately.

Example:

```text
July

Available:
🪙 1,000

Reserved:
🪙 8,000

Total:
🪙 9,000
```

If the reward is fulfilled:

```text
Reserved → Spent
```

If the reward is cancelled:

```text
Reserved → Available
```

Recommended balance model:

```text
total_earned
total_spent
total_reserved

available_balance =
total_earned
- total_spent
- total_reserved
```

The transaction ledger remains the source of truth.

---

# 87. Task Proof

Photo proof should be optional and configurable per quest.

Settings:

```text
Proof Requirement

○ None
○ Optional photo
○ Required photo
```

Possible use cases:

```text
🧹 Clean Room
📚 Finished Book
🎨 Art Project
🌱 Plant Care
```

Do not require proof for all tasks.

The goal is to support selected activities, not create a surveillance experience.

---

# 88. Child Image Privacy

Avatar and task-proof images require stronger privacy controls.

Recommended Supabase Storage model:

```text
Private Bucket
     │
     ▼
Authenticated access
or
Short-lived signed URL
```

Do not expose child images through permanently public URLs.

Recommended rules:

- Parent controls avatar upload.
- Child profiles are private to the family.
- Profiles are not publicly discoverable.
- Parent can replace or delete avatars.
- Task-proof photos can have a retention policy.
- Real photographs are optional.
- Illustrated avatars remain available.

Possible task-proof retention:

```text
30 days
90 days
Keep permanently
```

Parent chooses the policy.

---

# 89. Supabase Row Level Security

Row Level Security should be treated as mandatory.

Tables requiring RLS include:

```text
families
users
children
tasks
task_assignments
task_completions
coin_transactions
star_transactions
rewards
reward_redemptions
badges
child_badges
family_quests
photos
user_preferences
```

Core rule:

```text
Parent A
→ Family A only

Parent B
→ Family B only
```

Even if the first deployment contains only one family, the schema should be family-scoped from the beginning.

Recommended pattern:

```text
family_id
```

on all family-owned records where appropriate.

---

# 90. Child Clients Must Not Modify Currency Directly

The frontend must never directly perform logic such as:

```text
coins = coins + 15
```

or:

```text
stars = stars + 10
```

Correct flow:

```text
Child submits quest
        ↓
Server validates assignment
        ↓
Server validates reward limits
        ↓
Parent approves if required
        ↓
Server transaction
        ↓
+ Quest Coins
+ Stars
```

Currency and achievement transactions must be created by trusted server-side logic.

---

# 91. Idempotent Reward Transactions

The system must prevent duplicate rewards caused by:

- Double click.
- Retry.
- Network reconnect.
- Duplicate API request.
- Background resubmission.

Example failure to prevent:

```text
Parent clicks Approve twice

+15 Coins
+15 Coins
```

Each quest completion should generate its reward only once.

Recommended database uniqueness concept:

```text
UNIQUE (
  reference_type,
  reference_id,
  transaction_type
)
```

Example:

```text
reference_type = TASK_COMPLETION
reference_id   = completion_123
transaction_type = TASK_REWARD
```

The same rule applies to Star transactions.

---

# 92. Corrections and Undo

Parents will sometimes approve the wrong task or enter the wrong amount.

Supported actions:

```text
Undo Approval
Correct Coins
Correct Stars
Cancel Redemption
Reverse Reservation
```

Do not delete the original transaction.

Example ledger:

```text
+15 TASK_REWARD
-15 CORRECTION
```

This preserves auditability.

---

# 93. Immutable Financial-Like History

Completed Quest Coin and Star transactions should not be hard-deleted.

Allowed operations:

```text
Correct
Reverse
Archive related object
Add explanation
```

Avoid:

```text
Delete transaction history
```

This prevents inconsistencies between:

```text
Balance
History
Reward redemption
Achievements
```

---

# 94. Grade Progression

July and Berry will move to higher grades over time.

Do not hard-code children permanently as Grade 3 or Grade 6.

Child model:

```text
grade_level
school_year
```

Optional:

```text
birth_year
```

Task recommendation fields:

```text
recommended_grade_min
recommended_grade_max
```

Example annual update:

```text
Berry:
Grade 3 → Grade 4
```

Task recommendations then automatically adjust.

The parent can still assign any task manually.

---

# 95. School, Vacation and Travel Modes

The app should support family context modes.

Example:

```text
🎒 School
🏖 Vacation
✈️ Travel
🤒 Pause
```

## School Mode

Prioritize:

```text
Homework
Reading
Preparation
Self-management
```

## Vacation Mode

Prioritize:

```text
Reading
Outdoor activity
Creativity
Family activity
Life skills
```

## Travel Mode

Can provide destination-specific quests.

Example Singapore pack:

```text
🇸🇬 Singapore Adventure Quests

📷 Find the Merlion
🗣 Order food in English
🧭 Help navigate using a map
📖 Learn 3 facts about Singapore
🌏 Identify a new culture or food
```

## Pause Mode

Useful for:

```text
Illness
Busy family period
Exam week
Unexpected schedule
```

Pause Mode should not punish streaks.

---

# 96. Parent Quest Creation UX

Creating a quest should not require filling a long technical form every time.

Recommended flow:

```text
+ Add Quest
```

Then:

```text
📚 Learning
🧹 Chores
❤️ Kindness
🏃 Health
👭 Family
✨ Custom
```

Then template choices:

```text
📚 Reading

20 minutes
30 minutes
Finish a chapter
Finish a book
```

Parent can customize:

```text
Name
Description
Coins
Stars
Repeat
Approval
Proof
Child Assignment
Completion Limit
```

Templates should make frequent actions fast.

---

# 97. Child UI Should Avoid Search Complexity

Child Mode should generally not require:

```text
Search
Advanced Filter
Sort
Complex Settings
```

Preferred organization:

```text
Today
This Week
Waiting
Completed
Optional
```

Search and advanced filters belong primarily in Parent Mode.

---

# 98. Offline Behavior

PWA offline behavior can be introduced after the MVP.

Recommended read-only offline support:

```text
✅ View previously loaded quests
✅ View last known balance
✅ View rewards
✅ View badges
```

Actions that modify important state should require server synchronization.

Example:

```text
Child presses I'M DONE while offline
        ↓
Local queued submission
        ↓
Connection restored
        ↓
Server validates
        ↓
Submission synchronized
```

Do not modify currency locally while offline.

Offline reward redemption and parent approval should remain disabled until server validation is available.

---

# 99. Data Export and Backup

Parent Settings should include:

```text
Settings
→ Export Family Data
```

Recommended formats:

```text
CSV
JSON
```

Exportable data:

```text
Children
Tasks
Assignments
Completions
Quest Coin Transactions
Star Transactions
Rewards
Redemptions
Badges
Achievements
Family Quests
```

Export should not expose private security credentials or secrets.

---

# 100. Memory Timeline

BloomQuest can evolve from a reward tracker into a long-term family memory system.

Example:

```text
2026
│
├── 📚 July finished 12 books
├── 🏆 Berry unlocked Math Hero
├── ❤️ 38 Family Quests completed
├── 🇸🇬 Singapore Dream achieved
└── 🎉 1,250 total quests completed
```

Possible Year in Review:

```text
🌟 JULY'S 2026 JOURNEY

Books Finished:
12

English Quests:
86

Family Help:
42

Stars Earned:
3,850

Favorite Quest:
Mini Research

Biggest Achievement:
🇸🇬 Singapore Adventure
```

This feature should be generated from existing activity data rather than requiring extra manual entry.

---

# 101. Recommended Implementation Priority

Before development begins, prioritize these seven items.

## Priority 1 — Transaction Idempotency

Prevent duplicate Quest Coin and Star awards.

## Priority 2 — Quest Completion Limits

Prevent reward farming and accidental repeated completion.

## Priority 3 — Reward Lifecycle

Implement:

```text
REQUESTED
→ APPROVED
→ RESERVED
→ FULFILLED
```

## Priority 4 — Supabase Security

Implement:

```text
RLS
Private Storage
Family-scoped access
Server-side currency operations
```

## Priority 5 — Parent Bulk Approval

Keep parent administration quick enough for everyday use.

## Priority 6 — Quest Coin Economy Health

Track earning rates and estimated reward timelines.

## Priority 7 — Age and Family Context Progression

Support:

```text
Grade changes
School Mode
Vacation Mode
Travel Mode
Pause Mode
```

These priorities should be considered part of the implementation foundation rather than optional gamification.

---

# 102. Internal Naming vs UI Naming

Use stable, neutral implementation names in code and database.

Recommended internal names:

```text
coin_transactions
star_transactions
coin_reward
star_reward
coin_cost
available_coin_balance
reserved_coin_balance
```

Recommended English UI:

```text
🪙 Quest Coins
⭐ Stars
```

Recommended Vietnamese UI:

```text
🪙 Xu
⭐ Sao
```

Keep:

```text
BloomQuest
```

as the product name.

This separation allows future branding changes without rewriting business logic.
