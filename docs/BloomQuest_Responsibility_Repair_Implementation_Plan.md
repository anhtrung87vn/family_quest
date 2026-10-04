# BloomQuest Responsibility, Repair & Logical Consequence System
## Product Goal and Implementation Plan

**Target product:** BloomQuest Family  
**Purpose:** Add a responsibility-and-repair layer so BloomQuest does not become a pure “do task → get reward” system.  
**Audience:** Coding AI / Developer / Product owner  
**Implementation style:** Incremental; preserve existing working task, reward, approval, evidence, Quest Pool, habit-building, parent-message, and System Quest Curriculum behavior.

---

# 1. Product Goal

BloomQuest already supports rewards, tasks, habits, parent approval, Quest Coins, Stars, Choice Quests, and family encouragement.

The missing capability is a structured way to handle situations such as:

- child forgets to put dirty clothes in the basket;
- child forgets to brush teeth;
- child forgets homework or school preparation;
- child repeatedly needs reminders;
- child needs help completing a responsibility;
- child intentionally refuses an agreed responsibility;
- child makes a mistake that should be repaired rather than punished.

The system must avoid teaching:

> “Every good behavior must be paid.”

It must also avoid teaching:

> “Every mistake causes loss of previously earned rewards.”

The target behavior model is:

```text
Extra effort
    ↓
Reward / Recognition

Normal responsibility
    ↓
Expected without Coins

Forgotten responsibility
    ↓
Reminder / Repair

Repeated forgetting
    ↓
Habit support

Intentional refusal of an agreed responsibility
    ↓
Parent-selected logical consequence

Serious / unsafe / dishonest behavior
    ↓
Handled directly by parent, not gamified
```

---

# 2. Core Behavioral Philosophy

BloomQuest should follow these principles:

> **Reward extra effort.  
> Expect responsibilities.  
> Support forgetting.  
> Repair mistakes.  
> Use logical consequences for deliberate choices.  
> Never erase past achievement as punishment.**

The application must distinguish between:

```text
“I forgot.”
“I still need help.”
“I did not have a reasonable opportunity.”
“I intentionally refused.”
“I completed it after a reminder.”
```

These states should not all be treated as the same behavior.

---

# 3. Important Non-Goal: No Penalty Economy

Do **not** implement:

```text
penalty_coins
penalty_stars
forgot_task_penalty
bad_behavior_penalty
```

Do not allow normal discipline logic such as:

```text
Forgot dirty clothes → -5 Coins
Forgot brushing teeth → -3 Coins
Did not finish homework → -10 Coins
```

## 3.1 Quest Coin invariant

Quest Coins represent rewards the child has already earned.

Normal valid reductions are:

```text
Reward redemption
Administrative correction
Duplicate transaction reversal
Technical/accounting correction
```

Discipline must not normally remove earned Coins.

## 3.2 Star invariant

Stars represent lifetime growth and achievement.

Stars should not be removed because of:

```text
forgetting
refusal
missed responsibility
poor school result
sibling conflict
```

Past achievement remains past achievement.

---

# 4. Responsibility vs Reward Quest

The existing `behavior_type` model should remain the foundation.

Recommended types:

```text
RESPONSIBILITY
HABIT_BUILDING
CHALLENGE
CHARACTER
FAMILY
```

## 4.1 RESPONSIBILITY

Examples:

```text
Put dirty clothes in the basket
Brush teeth
Prepare school bag
Clear own plate
Keep personal items organized
Complete required homework
```

Default reward policy:

```text
Coins = 0
Stars = 0 per normal completion
```

Responsibilities may still contribute to:

```text
consistency
independence progress
habit mastery
weekly reflection
milestone badges
parent recognition
```

## 4.2 HABIT_BUILDING

Used when a responsibility is not yet stable.

Example lifecycle:

```text
FULL_REWARD
→ REDUCED_REWARD
→ STARS_ONLY
→ GRADUATED
```

Once mastered, the task can become a normal Responsibility.

## 4.3 CHALLENGE

Extra effort such as:

```text
extra reading
research project
English speaking challenge
creative project
optional exercise
```

These may receive Coins + Stars.

## 4.4 CHARACTER

Examples:

```text
Help sister
Help grandparents
Resolve disagreement calmly
Do something kind
```

Default:

```text
Coins = 0 or very low
Stars / recognition = preferred
```

Do not monetize kindness.

---

# 5. Responsibility Response Model

Implement a five-level conceptual model.

## Level 0 — Normal mistake

Examples:

```text
One-time missed routine
Task could not reasonably be completed
Parent decides no follow-up is necessary
```

System response:

```text
No punishment
Possibly no action
```

## Level 1 — Forgotten responsibility

Example:

```text
Dirty clothes left on the floor
```

System response:

```text
Gentle reminder
→ child completes responsibility
→ resolved
```

No Coins.  
No Stars.  
No punishment.

## Level 2 — Repeated forgetting

Example:

```text
Prepare School Bag
Forgot 4 times this week
```

System response:

```text
Suggest Habit Support
Checklist
Reminder
Environmental cue
Same-time routine
Parent coaching
```

Do not escalate automatically to punishment.

## Level 3 — Intentional refusal / agreed rule broken

Example:

```text
Child knows homework must be finished
Parent reminds child
Child intentionally refuses
```

System may support:

```text
Logical consequence selected by Parent
```

Example:

```text
Homework incomplete
→ gaming privilege waits
→ responsibility completed
→ privilege returns
```

Parent remains the decision maker.

## Level 4 — Serious / unsafe / dishonest behavior

Examples:

```text
dangerous behavior
serious dishonesty
deliberate harm
significant family issue
```

Do not gamify.

System may allow:

```text
Parent note
Reflection
Repair action
```

but should not automatically calculate a punishment.

---

# 6. Responsibility Policy

Add a field conceptually equivalent to:

```text
responsibility_policy
```

Allowed values:

```text
NONE
REPAIR_REQUIRED
COMPLETE_BEFORE_PRIVILEGE
PARENT_DECIDES
```

## Examples

### Dirty clothes

```text
behavior_type = RESPONSIBILITY
responsibility_policy = REPAIR_REQUIRED
```

### Required homework

```text
behavior_type = RESPONSIBILITY
responsibility_policy = COMPLETE_BEFORE_PRIVILEGE
```

### Brush teeth

```text
behavior_type = RESPONSIBILITY
responsibility_policy = REPAIR_REQUIRED
```

### Sensitive family situation

```text
responsibility_policy = PARENT_DECIDES
```

Parent should be able to customize this per family task.

---

# 7. Responsibility Event Model

Do not overload Coin transactions or Star transactions with discipline information.

Create a separate table:

```text
responsibility_events
```

Suggested schema:

```text
id
family_id
child_id
task_id
task_assignment_id        nullable
task_completion_id        nullable

event_type
status

occurred_at
resolved_at

created_by
parent_note

reminder_count            default 0

created_at
updated_at
```

Recommended `event_type` values:

```text
FORGOTTEN
REPAIRED
REFUSED
EXCUSED
NEEDED_HELP
REMINDER
```

Recommended `status` values:

```text
OPEN
RESOLVED
CANCELLED
```

Example:

```text
Berry
Task: Put dirty clothes away

event_type = FORGOTTEN
status = OPEN
occurred_at = 20:00
```

After child completes it:

```text
event_type = REPAIRED
or
original event status = RESOLVED
resolved_at = 20:15
```

Implementation may choose either:
- separate `REPAIRED` event; or
- mark `FORGOTTEN` event resolved.

Prefer the simplest model that fits current architecture.

---

# 8. Child UX — Home Structure

Child Home should conceptually support four sections.

## Section 1 — Responsibilities

```text
🌱 VIỆC CON TỰ LÀM

🎒 Prepare school bag       ✅
🪥 Brush teeth              ○
👕 Put dirty clothes away   ○
```

Do not show Coin rewards for normal responsibilities.

Optional explanatory copy:

> Những việc con tự làm vì con đang lớn lên 🌱

## Section 2 — Today's Reward / Core Quests

Keep existing reward quest behavior.

```text
🎯 NHIỆM VỤ HÔM NAY

📚 Read 20 minutes
🪙 +5  ⭐ +1
[ ✅ Xong rồi! ]
```

## Section 3 — Choice Quest Pool

Keep existing:

```text
✨ CHỌN THỬ THÁCH
```

These are optional/self-selected challenges.

## Section 4 — Repair

Only show when unresolved repair items exist.

```text
🌱 VIỆC CẦN SỬA LẠI

👕 Con quên bỏ đồ dơ vào giỏ.

Mình hoàn thành nó nhé.

[ ✅ Con làm ngay ]
```

Important:
- no Coin reward;
- no Star reward;
- no large red punishment visual;
- no shame language.

---

# 9. Child UX Wording

Do not use:

```text
Failed
Violation
Penalty
Bad behavior
Punishment
You lost
```

Prefer:

```text
Chưa xong
Cần làm lại
Con quên việc này
Mình hoàn thành nhé
Việc cần sửa lại
```

English equivalents:

```text
Not finished yet
Let's fix this
One thing still needs doing
Repair this responsibility
```

---

# 10. Repair Flow

Example:

```text
Task:
Put Dirty Clothes Away

Parent marks:
Forgot
```

Server creates an open responsibility event.

Child Home:

```text
🌱 VIỆC CẦN SỬA LẠI

👕 Put dirty clothes in basket

[ ✅ Xong rồi ]
```

Child completes it.

Server:

```text
validate child session
validate task belongs to child/family
validate event is OPEN
mark event RESOLVED
set resolved_at
```

UI:

```text
✅ Đã sửa xong.
```

Do not:
- grant Coins;
- grant Stars;
- use confetti intended for reward quests.

A small positive acknowledgment is enough.

---

# 11. Parent UX — Missed Responsibility

Do not make parents classify every unfinished item every day.

Default state remains:

```text
Not completed
```

When Parent wants to handle it, provide:

```text
[ 🌱 Xử lý việc chưa xong ]
```

Then show optional reason:

```text
Điều gì xảy ra?

○ Quên
○ Cần hỗ trợ
○ Không có thời gian / không phù hợp hôm nay
○ Không chịu làm
○ Bỏ qua lần này
```

Map to:

```text
Forgot
→ FORGOTTEN

Needed help
→ NEEDED_HELP

Not applicable / reasonable exception
→ EXCUSED

Refused
→ REFUSED

Skip
→ no event or cancelled/excused event
```

---

# 12. Forgot Flow

For:

```text
FORGOTTEN
```

Default response:

```text
Create repair item
No penalty
```

If repeated forgetting crosses a configurable suggestion threshold:

```text
Suggest Habit Support
```

Do not automatically change the behavior type without Parent confirmation.

---

# 13. Needed Help Flow

For:

```text
NEEDED_HELP
```

Parent Dashboard may suggest:

```text
Reduce task difficulty
Change independence level
Add checklist
Change time of day
Add parent guidance
```

Do not treat it as non-compliance.

Example:

```text
Cook a basic meal
independence_level = INDEPENDENT
```

If child repeatedly needs help, Parent may adjust:

```text
INDEPENDENT
→ SUPPORTED
```

---

# 14. Excused Flow

Examples:

```text
Child was sick
Family was traveling
Task was not applicable
Unexpected schedule
```

`EXCUSED` must:

```text
not create a penalty
not create a repair requirement unless Parent explicitly asks
not break long-term progress in a punitive way
```

If streaks exist, consider grace behavior rather than resetting all progress.

---

# 15. Refused Flow

`REFUSED` means:

> The responsibility was understood and reasonably possible, but the child intentionally chose not to perform it.

Do not let the system infer Refused automatically.

Only Parent may mark it.

Parent options:

```text
Logical consequence:

○ Complete before selected privilege
○ Parent handles outside BloomQuest
○ No consequence
```

Do not provide:

```text
-5 Coins
-10 Stars
```

---

# 16. Logical Consequence Support

V1 should support the concept without building a large punishment engine.

Example:

```text
📚 Required Homework
Status: Not completed

Family rule:
Complete before gaming

🎮 Gaming
⏸ Waiting for responsibility
```

The consequence must be:

```text
related
temporary
parent-defined
reversible when responsibility is repaired/completed
```

Avoid broad unrelated consequences.

---

# 17. Privilege Rules — Phase 2/Optional

A later table may be:

```text
family_privilege_rules
```

Suggested fields:

```text
id
family_id

name
description

required_task_id
privilege_type
privilege_label

active
created_at
updated_at
```

Example:

```text
Rule:
Homework Before Gaming
```

However:

> **Do not block the initial Responsibility & Repair implementation on a full privilege engine.**

V1 may simply record:

```text
COMPLETE_BEFORE_PRIVILEGE
```

and display Parent guidance.

---

# 18. Repeated Forgetting → Habit Support

Create a rule-based suggestion.

Example:

```text
Task:
Prepare School Bag

Last 7 relevant days:
Completed independently: 2
Forgotten: 4
Needed help: 1
```

Parent card:

```text
🌿 Có vẻ Berry vẫn cần hỗ trợ
với "Prepare School Bag".

[ Bắt đầu xây thói quen ]
```

Possible support options:

```text
☑ Evening checklist
☑ Reminder at a fixed time
☑ Put school bag in a visible place
☑ Do it at the same time every day
☑ Parent demonstrates routine again
```

Do not automatically punish repeated forgetting.

---

# 19. Habit Support Integration

Integrate with the existing Habit Building architecture.

Existing stages:

```text
FULL_REWARD
→ REDUCED_REWARD
→ STARS_ONLY
→ GRADUATED
```

Full lifecycle becomes:

```text
Repeated forgetting
        ↓
Habit Support
        ↓
Practice
        ↓
Fewer reminders
        ↓
More independent completion
        ↓
Habit mastered
        ↓
🌟 Graduation
        ↓
Normal Responsibility
```

---

# 20. Reminder Tracking

Track reminders as an independence signal.

Possible implementation options:

### Option A — responsibility event

```text
event_type = REMINDER
```

### Option B — counter

```text
reminder_count
```

Choose whichever better fits existing event architecture.

Goal:

```text
Week 1: 5 reminders
Week 2: 3 reminders
Week 3: 1 reminder
Week 4: independent 5/5
```

The important metric is:

> **fewer reminders over time**

not:

> more Coins earned.

---

# 21. Parent Dashboard — Growing Independence

Add a parent-facing card/section:

```text
🌱 GROWING INDEPENDENCE

🎒 Prepare school bag
4/5 days independent

👕 Put clothes away
2 reminders this week

🪥 Evening routine
5/7 completed

💡 Evening routine may still need support.

[ Review ]
```

This should not be a performance score.

Avoid:

```text
Berry: 72%
July: 88%
```

No sibling comparison.

---

# 22. Parent Analytics

Useful metrics:

```text
independent completions
reminders
forgotten events
repairs completed
needed-help events
habits graduated
```

Possible trend:

```text
Prepare School Bag

Last 4 weeks:
Independent completion ↑
Reminder count ↓
```

This is more meaningful than a punishment count.

Do not create a “bad behavior score.”

---

# 23. Child History / Journey

Do not build a child-facing failure log.

Avoid:

```text
Forgot brushing teeth ❌
Forgot laundry ❌
Forgot homework ❌
```

Child Journey should emphasize:

```text
🌱 You remembered by yourself 4 days this week
🌟 Habit mastered
❤️ Parent encouragement
🎯 Quest completed
```

Parent may view detailed responsibility history separately.

---

# 24. Streak Policy

Do not use streaks in a way that makes one mistake erase weeks of progress.

Avoid:

```text
27-day streak
miss one day
→ 0
```

Prefer:

```text
This week:
6 / 7 successful days
```

or:

```text
Last 30 days:
26 successful days
```

If the current app already uses streaks:
- preserve backward compatibility;
- add grace/excused handling;
- do not reset achievement history for `EXCUSED`.

---

# 25. Required Homework Example

Required schoolwork should normally be:

```text
behavior_type = RESPONSIBILITY
Coins = 0
```

If unfinished:

```text
Responsibility incomplete
```

Possible family logical consequence:

```text
Finish required homework before entertainment
```

Extra study remains:

```text
🎯 Challenge
```

Example:

```text
Extra Math Practice
+ Coins
+ Stars
```

Not completing an optional challenge should simply mean:

```text
no reward
```

not punishment.

---

# 26. Brush Teeth Example

```text
Task:
Brush Teeth

behavior_type:
RESPONSIBILITY

responsibility_policy:
REPAIR_REQUIRED

Coins:
0
```

If missed:

```text
Reminder
→ finish bedtime routine
```

Repeated pattern:

```text
Habit Support suggestion
```

Do not permanently pay Coins for brushing teeth.

---

# 27. Dirty Clothes Example

```text
Task:
Put Dirty Clothes in Basket

behavior_type:
RESPONSIBILITY

responsibility_policy:
REPAIR_REQUIRED

Coins:
0
Stars:
0
```

If forgotten:

```text
FORGOTTEN
→ Repair item
→ child puts clothes away
→ RESOLVED
```

No punishment.

---

# 28. Sibling Conflict Example

Do not:

```text
Fight with sister
→ -10 Coins
```

Possible Parent-supported Repair:

```text
❤️ REPAIR

1. Calm down
2. Each child explains what happened
3. Listen to the other child
4. Decide what needs fixing
5. Apologize if appropriate
```

Do not automatically give Coins for apologizing.

Character growth should emphasize recognition and reflection.

---

# 29. School Result Example

Do not punish:

```text
Poor test result
→ lose Coins
```

Instead:

```text
What happened?

Need help?
Need more practice?
Wrong study strategy?
Need to review mistakes?
```

Potential follow-up Challenge:

```text
🧠 Review 3 mistakes
```

Reward process/effort where appropriate, not the school score itself.

---

# 30. Database Migration Strategy

Implement incrementally.

Do not rewrite already-applied production migrations.

## Phase 1 schema migration

Add to task/family-task model if not already present:

```text
responsibility_policy
```

Backward-compatible default:

```text
NONE
```

For newly seeded responsibilities:

```text
REPAIR_REQUIRED
```

where appropriate.

## Phase 2

Create:

```text
responsibility_events
```

Add indexes for:

```text
family_id
child_id
task_id
status
occurred_at
```

## Phase 3

Add any parent privilege-rule table only if needed.

---

# 31. RLS / Authorization

Responsibility events contain child/family behavioral data and must follow the same privacy model as the rest of BloomQuest.

Parent:

```text
can read/write responsibility events for own family
```

Child:

```text
can read own repair items
can resolve allowed own repair items
cannot mark self as EXCUSED/REFUSED arbitrarily
cannot edit parent notes
```

Server must derive family/child identity from authenticated session.

Never trust arbitrary:

```text
family_id
child_id
```

from client payload.

---

# 32. Server Actions / APIs

Conceptually implement:

```text
createResponsibilityEvent()
markResponsibilityForgotten()
markResponsibilityNeededHelp()
markResponsibilityExcused()
markResponsibilityRefused()

getOpenRepairItems(childId)
resolveRepairItem(eventId)

getResponsibilitySummary(childId)
getIndependenceTrend(childId)

suggestHabitSupport(childId, taskId)
startHabitSupport(childId, taskId)
```

Names may adapt to existing code conventions.

---

# 33. Server Validation

When creating a responsibility event:

```text
Validate parent session
Validate family ownership
Validate task belongs to family/child
Validate task behavior is appropriate
```

When resolving repair:

```text
Validate child session
Validate event belongs to child
Validate event is OPEN
Validate event is repairable
Set RESOLVED
```

No Coin/Star transaction should be created for repair unless the parent has explicitly configured a separate legitimate Challenge.

---

# 34. Idempotency

Repair actions must be idempotent.

Example:

```text
Child double-taps "Done"
```

must not create:

```text
two resolved events
two completion rows
two rewards
```

If event already resolved:

```text
return current resolved state
```

---

# 35. Parent Task Form

When:

```text
Behavior Type = Responsibility
```

show:

```text
When this responsibility is missed:

● Ask child to complete it
○ Complete before selected privilege
○ Parent decides
○ No follow-up
```

Map to:

```text
REPAIR_REQUIRED
COMPLETE_BEFORE_PRIVILEGE
PARENT_DECIDES
NONE
```

Do not show Coin penalty input.

---

# 36. System Quest Curriculum Integration

Update System Quest Templates so normal responsibilities have suitable default policies.

Examples:

```text
Make My Bed
RESPONSIBILITY
REPAIR_REQUIRED
```

```text
Put Dirty Clothes Away
RESPONSIBILITY
REPAIR_REQUIRED
```

```text
Required Homework
RESPONSIBILITY
COMPLETE_BEFORE_PRIVILEGE
```

```text
Read Extra 30 Minutes
CHALLENGE
responsibility_policy = NONE
```

```text
Help Sister
CHARACTER
responsibility_policy = PARENT_DECIDES or NONE
```

Do not convert all existing family tasks automatically.

System templates affect new copied tasks.

---

# 37. Recommendation / Behavior Guidance

The System Quest Curriculum may expose a parent tip.

Example:

```text
Task:
Prepare School Bag

Parent tip:
If your child repeatedly forgets, try a checklist or fixed evening routine before adding a consequence.
```

Another:

```text
Task:
Required Homework

Parent tip:
Treat schoolwork as a responsibility rather than paid work. A family rule such as "responsibilities before entertainment" may be more appropriate than Coin rewards.
```

---

# 38. Child Celebration Policy

Reward quest:

```text
🎉
+ Coins
+ Stars
Parent message
```

Repair:

```text
✅ Đã sửa xong.
```

Habit graduation:

```text
🌟 THÓI QUEN MỚI!
Con đã tự làm được việc này.
```

Do not give the same intense reward animation for repairing a forgotten responsibility.

The emotional meanings should remain distinct.

---

# 39. Parent Recognition

Parent may still leave supportive messages after repair.

Example:

```text
❤️ Bố:
"Cảm ơn con đã nhớ quay lại và hoàn thành việc của mình."
```

This should be recognition, not extra payment.

---

# 40. Implementation Phases

## Phase 1 — Responsibility Classification

Implement/confirm:

```text
RESPONSIBILITY
responsibility_policy
```

Acceptance:

- existing tasks still work;
- responsibilities can have zero Coins/Stars;
- Parent can configure missed-responsibility behavior.

## Phase 2 — Responsibility Events

Implement:

```text
responsibility_events
FORGOTTEN
NEEDED_HELP
EXCUSED
REFUSED
OPEN / RESOLVED
```

Acceptance:

- Parent can mark a missed responsibility;
- no Coin/Star penalty is generated.

## Phase 3 — Repair UX

Implement:

```text
🌱 Việc cần sửa lại
```

Acceptance:

- child sees open repair items;
- child can resolve allowed items;
- repair does not generate reward.

## Phase 4 — Habit Support

Implement rule-based repeated-forgetting detection.

Acceptance:

- Parent receives a suggestion;
- Parent can start Habit Building;
- system never auto-punishes.

## Phase 5 — Growing Independence

Implement:

```text
independent completions
reminder trends
repair trends
habit graduation
```

Acceptance:

- no sibling ranking;
- no bad-behavior score.

## Phase 6 — Logical Privilege Rules

Optional later phase.

Implement only if useful after real family usage.

---

# 41. V1 Acceptance Scenario — Forgotten Laundry

Setup:

```text
Task:
Put Dirty Clothes in Basket

behavior_type = RESPONSIBILITY
responsibility_policy = REPAIR_REQUIRED
Coins = 0
Stars = 0
```

Flow:

```text
Parent notices it was missed
        ↓
Parent chooses:
Forgot
        ↓
responsibility_event created
FORGOTTEN / OPEN
        ↓
Child Home:
🌱 Việc cần sửa lại
        ↓
Child puts clothes away
        ↓
Child taps Done
        ↓
event RESOLVED
```

Expected:

```text
No Coin deduction
No Star deduction
No Coin reward
No Star reward
Task history preserved
```

---

# 42. V1 Acceptance Scenario — Repeated School-Bag Forgetting

Over 7 relevant days:

```text
Independent: 2
Forgot: 4
Needed help: 1
```

Parent Dashboard shows:

```text
🌿 Berry may still need support with:
Prepare School Bag

[ Start Habit Support ]
```

Parent selects Habit Support.

System uses existing Habit Building flow.

After several weeks:

```text
reminders decrease
independent completions increase
```

Parent selects:

```text
🌱 Make This a Responsibility
```

Child receives Habit Mastered celebration.

---

# 43. V1 Acceptance Scenario — Homework Refusal

Setup:

```text
Task:
Required Homework

behavior_type = RESPONSIBILITY
responsibility_policy = COMPLETE_BEFORE_PRIVILEGE
Coins = 0
```

Parent marks:

```text
REFUSED
```

BloomQuest shows Parent guidance:

```text
Suggested logical consequence:
Complete homework before entertainment.
```

Do not automatically:

```text
deduct Coins
deduct Stars
```

When responsibility is completed:

```text
event resolved
```

Any privilege lock implemented by future phase may be released.

---

# 44. V1 Acceptance Scenario — Excused

Child is sick.

Responsibility is missed.

Parent marks:

```text
EXCUSED
```

Expected:

```text
No repair requirement
No penalty
No negative score
No punitive streak reset
```

---

# 45. Testing Requirements

## Unit tests

Cover:

```text
responsibility_policy validation
event_type validation
status transitions
repair idempotency
no reward transaction from repair
```

## Authorization tests

Verify:

```text
Child A cannot resolve Child B's event
Family A cannot access Family B events
Child cannot mark own event EXCUSED
Child cannot mark own event REFUSED
```

## Integration tests

Test:

```text
Forgot → Repair → Resolved
Needed Help → Parent support
Excused → no repair
Refused → Parent consequence guidance
Repeated Forgetting → Habit suggestion
```

## Regression tests

Ensure existing:

```text
Quest completion
Parent approval
Quest Coins
Stars
Reward redemption
Evidence
Parent messages
Quest Pool
System Quest Library
Habit graduation
```

still work.

---

# 46. Analytics Guardrails

Do not create:

```text
bad_behavior_score
obedience_score
discipline_score
child ranking
sibling comparison
```

Allowed:

```text
independent completion trend
reminder trend
habit mastery
repair completion
areas needing more support
```

Phrase insights as:

```text
"may need more support"
```

not:

```text
"is bad at responsibility"
```

---

# 47. Logging and Audit

For debug/admin purposes, log server-side changes such as:

```text
event created
event resolved
event excused
event cancelled
habit-support transition
```

Do not expose technical audit details to child UI.

Keep Coin/Star ledger completely separate from responsibility events.

---

# 48. Product Success Metrics

The feature is working if, over time:

```text
Parent reminders decrease
Independent completion increases
Repairs are completed
Habits graduate
Basic responsibilities require fewer external rewards
Child choice increases with maturity
```

It is **not** successful merely because:

```text
more responsibility events were created
more tasks were logged
more consequences were applied
```

---

# 49. Non-Goals

Do not implement in this feature:

```text
automatic punishment
automatic Coin deductions
automatic Star deductions
AI judgment of bad behavior
child behavior scoring
sibling comparison
public discipline history
parent-child chat
AI psychological assessment
automatic classification of "refused"
```

Parent remains responsible for interpreting context.

---

# 50. Coding AI Instructions

When implementing:

1. Inspect the current BloomQuest schema and task lifecycle first.
2. Preserve existing working behavior.
3. Add incremental migrations; do not rewrite already-applied production migrations.
4. Reuse the existing `behavior_type`, Habit Building, task assignment, approval, parent-message, and child-session architecture.
5. Keep responsibility events separate from Coin/Star ledgers.
6. Do not introduce penalty fields.
7. Make `REFUSED` a Parent-only classification.
8. Make repair completion idempotent.
9. Preserve RLS and private family boundaries.
10. Do not build the optional full privilege-rule engine until core Repair is working.
11. Update System Quest Template defaults only for future copied templates; do not silently alter existing family tasks.
12. Add regression tests for rewards, approvals, evidence and Quest Pool.
13. Maintain English/Vietnamese localization using the project’s existing i18n architecture.
14. Document any deliberate deviation from this specification.

---

# 51. Recommended Implementation Order

```text
1. Audit current task schema and behavior types
2. Add responsibility_policy
3. Create responsibility_events migration
4. Add Parent missed-responsibility action
5. Add Child Repair section
6. Add repair resolution server action
7. Add repeated-forgetting analysis
8. Connect to Habit Building
9. Add Growing Independence dashboard
10. Evaluate need for privilege rules after real usage
```

---

# 52. Definition of Done

V1 is complete when:

- normal responsibilities can exist without Coin/Star rewards;
- Parent can classify a missed responsibility as Forgot / Needed Help / Excused / Refused;
- Forgotten responsibilities can create repair items;
- child can complete Repair without earning or losing Coins/Stars;
- repeated forgetting can generate a Habit Support suggestion;
- Parent controls any intentional-refusal consequence;
- no punishment economy exists;
- earned Coins are not removed by discipline;
- Stars are never removed as punishment;
- Parent can see independence/reminder trends;
- child does not see a failure ledger;
- existing BloomQuest task/reward/evidence flows remain functional.

---

# 53. Final Product Principle

BloomQuest should teach:

```text
"If I forget, I can fix it."

"If something is hard to remember, I can build a system."

"If I have a responsibility, I do not need to be paid every time."

"If I make a deliberate choice, that choice may have a logical consequence."

"My previous achievements do not disappear because I made a mistake."
```

The intended development path is:

```text
Reminder
   ↓
Repair
   ↓
Habit Support
   ↓
Independent Responsibility
   ↓
Less Parent Control
```

> **BloomQuest is a reward system for extra effort, a growth system for habits, and a responsibility system for everyday life — not a punishment system.**
