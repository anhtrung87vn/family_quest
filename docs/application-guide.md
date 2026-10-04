# BloomQuest Family - Application Goal & Usage Guide

## 1. Application Goal

### Vision

BloomQuest Family la mot ung dung web (PWA) danh cho gia dinh, giup tre em:

- Hoan thanh cac nhiem vu tich cuc hang ngay
- Kiem **Quest Coins** (xu) va **Stars** (sao) tu cac nhiem vu
- Tiet kiem Quest Coins de doi thuong co y nghia
- Xay dung thoi quen tot va tinh tu lap
- Theo doi thanh tich ca nhan
- Huong toi uoc mo lon (Dream Reward) nhu iPad, chuyen di Singapore

### Core Philosophy

> **Lam viec tot -> Kiem Quest Coins -> Tich luy Stars -> Mo khoa Uoc mo**

Nguyen tac thiet ke:
- Quest Coins tao dong luc ngan han (chi tieu duoc)
- Stars the hien su truong thanh dai han (khong giam khi doi thuong)
- Trach nhiem co ban (danh rang, di hoc) KHONG nhan Quest Coins - vi do la nghia vu
- Chi thuong cho **no luc them**, **tinh tu giac**, **su kien nhan** va **hanh vi tot**
- Khong xep hang anh chi em de tranh canh tranh truc tiep

### Dual Currency System

| Currency | Muc dich | Giam khi doi thuong? |
|----------|----------|---------------------|
| Quest Coins | Tien te chi tieu, doi thuong | Co |
| Stars | Thanh tich dai han, mo level | Khong |

---

## 2. User Roles

### 2.1 Parent (Phu huynh)

Dang nhap bang Google OAuth hoac email/password thong qua Supabase Auth.

**Quyen han:**
- Quan ly ho so con (ten, avatar, PIN)
- Tao va gan nhiem vu (task)
- Cau hinh Quest Coins/Stars cho moi nhiem vu
- Duyet nhiem vu da hoan thanh
- Tao phan thuong (reward)
- Duyet yeu cau doi thuong
- Dieu chinh Quest Coins thu cong
- Xem lich su giao dich
- Xem tien do cua con
- Cau hinh nhiem vu lap lai (recurring)
- Quan ly Quest Pool (bo nhiem vu tu chon)
- Gui tin nhan cho con
- Viet nhat ky hang tuan (reflections)
- Xem thong ke & bao cao

### 2.2 Child (Tre em)

Dang nhap bang PIN 6 so (khong can email). Session bao mat bang HMAC-signed HttpOnly cookie, het han sau 12 gio.

**Quyen han:**
- Chon profile (July / Berry)
- Nhap PIN de dang nhap
- Xem nhiem vu hom nay (nhom theo loai hanh vi)
- Nop nhiem vu hoan thanh (bam "I'm Done!")
- Nop bang chung (anh, am thanh, van ban)
- Xem so du Quest Coins & Stars
- Xem lich su giao dich
- Duyet phan thuong
- Yeu cau doi thuong
- Chon Quest tu pool
- Xem badges va streaks
- Xem level va hanh trinh ca nhan

---

## 3. Huong Dan Su Dung Chi Tiet

### 3.1 Dang Nhap Parent

1. Truy cap `https://<domain>/en` hoac `/vi`
2. Chon **Parent Login**
3. Dang nhap bang Google hoac email/password
4. Sau khi dang nhap, chuyen den **Dashboard**

### 3.2 Thiet Lap Ban Dau

#### Tao ho so con:
1. Vao **Kids** tu sidebar
2. Them ho so con: nhap ten, upload avatar
3. Thiet lap PIN 6 so cho moi con
4. PIN duoc hash bang argon2id, bao mat tuyet doi

#### Tao nhiem vu:
1. Vao **Tasks** tu sidebar
2. Bam **Create Task**
3. Dien thong tin:
   - **Name**: Ten nhiem vu (VD: "Doc sach 30 phut")
   - **Description**: Mo ta chi tiet
   - **Category**: learning, chores, health, creativity, social, family
   - **Behavior Type**: 
     - `responsibility` - Trach nhiem (khong thuong coins)
     - `habit_building` - Xay dung thoi quen (thuong giam dan)
     - `challenge` - Thu thach (thuong day du)
     - `character` - Tinh cach
     - `family` - Gia dinh
   - **Coin Reward / Star Reward**: So xu va sao
   - **Availability**: assigned_only, choice_pool, hoac both
   - **Evidence Type**: none, photo, audio, text, choice, parent_observation
   - **Recurrence**: Lap lai theo ngay trong tuan
4. Gan nhiem vu cho con cu the

#### Tao phan thuong:
1. Vao **Rewards** tu sidebar
2. Bam **Create Reward**
3. Dien thong tin:
   - **Name**: Ten phan thuong (VD: "Kem")
   - **Coin Cost**: Gia bang Quest Coins
   - **Category**: treat, experience, toy, dream, privilege, creative, learning, digital
   - **Stock**: So luong kha dung (hoac unlimited)

### 3.3 Hoat Dong Hang Ngay - Parent

#### Duyet nhiem vu:
1. Vao **Approvals** tu sidebar
2. Xem danh sach nhiem vu cho duyet
3. Voi moi nhiem vu:
   - Xem bang chung (neu co)
   - Bam **Approve** de duyet va thuong coins/stars
   - Hoac **Reject** de tu choi (coins duoc hoan lai)
   - Co the gui **celebration message** kem theo
4. Coins duoc ghi vao ledger tu dong

#### Duyet doi thuong:
1. Trong **Approvals**, xem yeu cau doi thuong
2. Bam **Approve** hoac **Reject**
3. Neu reject, coins duoc hoan lai cho con

#### Xem thong ke:
1. Vao **Stats** tu sidebar
2. Xem tong quan: coins kiem duoc, nhiem vu hoan thanh, streaks
3. Xem **Coverage** de biet muc do phu cua cac loai nhiem vu
4. Xem **Ladders** de theo doi tien do level

### 3.4 Hoat Dong Hang Ngay - Child

#### Dang nhap:
1. Truy cap `https://<domain>/en/child/select`
2. Chon profile (July hoac Berry)
3. Nhap PIN 6 so
4. Vao trang **Home**

#### Hoan thanh nhiem vu:
1. Trang **Home** hien thi nhiem vu hom nay, nhom theo:
   - Trach nhiem (Responsibilities) - khong hien coins
   - Xay dung thoi quen (Habits) - hien thi stage
   - Thu thach (Challenges) - hien du coins
   - Tinh cach & Gia dinh
2. Bam vao nhiem vu
3. Bam **"I'm Done!"** de nop
4. Neu can bang chung: chup anh, ghi am, hoac viet
5. Nhiem vu chuyen sang trang thai **Submitted** (cho duyet)
6. Khi parent duyet: nhan coins + stars + animation chuc mung

#### Chon Quest tu Pool:
1. Vao tab **Quests**
2. Xem cac quest kha dung trong pool
3. Chon quest muon lam
4. Co gioi han so quest chon moi ngay/tuan

#### Doi phan thuong:
1. Vao tab **Rewards**
2. Duyet cua hang phan thuong
3. Chon phan thuong muon doi
4. Bam **Redeem** (coins bi tru ngay)
5. Cho parent duyet
6. Neu parent reject, coins duoc hoan lai

#### Xem profile:
1. Vao tab **Me**
2. Xem: Level, Stars, Coins, Streaks, Badges
3. Xem lich su giao dich coins

### 3.5 Quan Ly Quest Library (Parent)

1. Vao **Library** tu sidebar
2. Duyet bo nhiem vu mau (system templates)
3. Clone templates ve gia dinh de tuy chinh
4. Chinh sua ten, mo ta, coins, stars theo nhu cau

### 3.6 Family Quests

1. Parent tao quest trong tab **Quests**
2. Quest gia dinh gan cho tat ca con
3. Moi con hoan thanh phan cua minh
4. Thuong coins/stars cho tung con rieng

### 3.7 Weekly Reflections (Parent)

1. Vao **Reflections** tu sidebar
2. Viet nhat ky hang tuan ve tien do cua con
3. Gui nhan xet va loi khen

### 3.8 Cai Dat (Settings)

1. Vao **Settings** tu sidebar
2. Doi ngon ngu: English / Tieng Viet
3. Cau hinh preference luu trong database

---

## 4. System Features

### 4.1 Habit Fading System

Thoi quen tot dan duoc "tot nghiep" khoi he thong thuong:

| Stage | Quest Coins | Stars | Y nghia |
|-------|-----------|-------|---------|
| `full_reward` | 100% | 100% | Moi bat dau |
| `reduced_reward` | 50% | 100% | Dang hinh thanh |
| `stars_only` | 0% | 100% | Gan tu giac |
| `graduated` | 0% | 0% | Da thanh thoi quen |

### 4.2 Level System

Dua tren tong Stars tich luy (khong bao gio giam):

| Stars | Level | Title |
|-------|-------|-------|
| 0-499 | 1 | Explorer |
| 500-999 | 2 | Adventurer |
| 1000-1999 | 3 | Champion |
| 2000-3499 | 4 | Superstar |
| 3500-5499 | 5 | Trailblazer |
| 5500+ | 6 | Quest Master |

### 4.3 Streak System

- Theo doi so ngay lien tiep hoan thanh nhiem vu
- Co "grace day" de tranh mat streak khi nghi
- Streak bonus coins o cac moc: 3, 7, 14, 30 ngay

### 4.4 Badge System

Huy hieu tu dong cap khi dat dieu kien:
- Book Worm, Super Reader, English Star, Math Hero...
- Badges la vinh vien, khong mat khi doi thuong

### 4.5 Evidence System

- Parent co the yeu cau bang chung khi nop nhiem vu
- Loai bang chung: anh, ghi am (5-60 giay), van ban, lua chon
- Bang chung tu dong het han (cleanup cron 03:00 UTC)
- Bang chung tot co the "promote" thanh Family Memory (luu vinh vien)

### 4.6 Recurring Tasks

- Parent cau hinh nhiem vu lap lai theo ngay trong tuan
- Cron job (22:00 UTC) tu dong tao task assignments cho ngay tiep theo

---

## 5. Technical Overview

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL) |
| Auth (Parent) | Supabase Auth (Google + email/password) |
| Auth (Child) | Custom HMAC cookie + argon2id PIN |
| i18n | next-intl v3 (en, vi) |
| Styling | Tailwind CSS v4 |
| PWA | Serwist |
| Deployment | Vercel (region: sin1) |

### Commands

```bash
pnpm dev          # Chay dev server
pnpm build        # Build production
pnpm test         # Chay unit tests (Vitest)
pnpm test:e2e     # Chay E2E tests (Playwright)
pnpm typecheck    # Kiem tra TypeScript
pnpm lint         # ESLint
```
