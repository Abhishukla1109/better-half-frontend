# BetterHalf — Information Architecture
**Version:** 0.1 · Project Setup  
**Platform:** Website · Mobile-first responsive  
**Scope:** New user only (no Mosaic data import)  
**Principles:** Brand-agnostic · Nutrition-first · One user, family graph deferred

---

## 1. Product Definition

### What BetterHalf is
An AI-native health and wellness OS, built on top of Mosaic Wellness's 6-brand portfolio. The platform is the intelligence layer — brands are the fulfilment layer. The user never chooses a brand; the AI assigns one based on profile fit.

### What it is not
- Not a marketplace where users browse brand stores
- Not a symptom checker
- Not a branded product site for any individual Mosaic brand

### Core thesis
> "The AI that truly knows your body — powered by 6.5M real Indian health journeys."

Brand surfaces as attribution on products, never as navigation or identity.

---

## 2. Technical Platform

| Attribute | Decision |
|---|---|
| Platform type | Website (PWA-ready) |
| Design system | Mobile-first · max content width 430px · responsive up to desktop |
| Viewport | Primary: 390px (iPhone 14) · Secondary: 360px (Android mid-range) |
| Framework | To be decided — IA is framework-agnostic |
| Auth | Phone OTP primary · Google SSO secondary · No passwords |
| Language | English primary · Hindi/Hinglish NLP support in AI inputs |

---

## 3. Brand System

Six Mosaic brands are present in the product catalogue. None are exposed as primary navigation or user choices during onboarding.

| Brand | Code | Domain | Primary user |
|---|---|---|---|
| Man Matters | MM | Men's health | Men 20–50 |
| Be Bodywise | BB | Women's health | Women 18–45 |
| Little Joys | LJ | Children's wellness | Parents (children 0–12) |
| Root Labs | RL | Ayurvedic / unisex | Health-conscious adults 30–65 |
| OWN | OWN | Clean protein | Fitness-aware 18–40 |
| *(6th brand)* | — | — | — |

**Brand visibility rules:**
- Onboarding screens (OB1–OB3): no brand names, no brand colors
- AI Match screen (OB4): brands shown as AI output ("96% fit") — not as user choice
- Health Card (OB5): brands shown as small attribution badge on product pills
- Home screen: brands shown on protocol pills and explore strip only
- Catalog: brands as filters, not primary navigation
- Product pages: brand is the product owner — full brand identity applies here

---

## 4. User Types

For this phase, only one user type is in scope.

| Type | Status | Notes |
|---|---|---|
| New user (no prior Mosaic account) | **In scope** | Full onboarding, fresh profile |
| Returning Mosaic user (MM/BB/LJ) | Deferred | Separate onboarding flow, not v1 |
| Returning BetterHalf user | Deferred | Login → home directly |
| Family account (multiple profiles) | Deferred | Family graph added post-profile establishment |

---

## 5. Complete Screen Inventory

### 5.1 New User Flow

```
Landing (00)
    ├── Auth / Sign-up (01)                         [primary CTA]
    │       └── OB1: Identity (02)          ← back ↔ forward →
    │               └── OB2: Concern (03)   ← back ↔ forward →   [skip available]
    │                       └── OB3: Lifestyle (04)  ← back ↔ forward →   [skip available]
    │                               └── OB4: AI Match (05)
    │                                       └── OB5: Health Card (06)
    │                                               ├── → Home (07)       [primary CTA]
    │                                               └── → Catalog (08)    [secondary CTA]
    │
    └── Catalog / Explore (08-unauth)               [secondary CTA — no sign-up required]
            └── Product Detail Page (10-unauth)
                    └── Add to cart → triggers Auth (01) → resumes cart
```

**Flow notes:**
- Back navigation available on every onboarding step (OB1–OB3). All inputs preserved on back.
- "Skip for now" available on OB1, OB2, OB3 — uses safe defaults. OB4/OB5 are not skippable.
- App close mid-onboarding → resume at last incomplete step on next launch.
- Unauthenticated catalog browse is a full path — auth triggers only at cart/consult actions.

### 5.2 Core App Screens (post-onboarding)

```
Home (07)
    ├── Check-in input (inline)
    ├── Protocol detail (modal/sheet)
    ├── Nutrition insight detail (modal/sheet)
    └── Dimension detail (09)

Explore / Catalog (08)
    ├── Browse all (brand-agnostic)
    ├── Filter: brand / goal / category
    └── Product Detail Page (10)
            ├── Add to protocol
            └── Book consult

AI Companion (11)
    └── Chat (persistent context)

Insights (12)
    ├── Dimension dials (6 parameters)
    ├── Check-in history
    └── Progress timeline

Profile (13)
    ├── Health profile (editable)
    ├── Progressive inputs (prompted)
    ├── Order history
    └── Settings
            └── [Future: Add family member]
```

---

## 6. Onboarding — Screen-by-Screen Spec

### Screen 00 — Landing / Splash

**Purpose:** First impression. Build conviction before asking for signup.

**Layout:** Full-screen hero gradient (BetterHalf teal) → trust block → social proof

**Content:**
- Logo: BetterHalf
- Tagline: "The AI that truly knows your body."
- Sub-copy: "Personalised health protocols — powered by 6.5M real Indian health journeys."
- Trust block: 6.5M users · 150+ doctors · 5 yrs real data
- Testimonial: 1 real outcome quote

**CTAs:**
- Primary: "Start my health journey →" → Auth (01)
- Secondary: "Explore products first" → Catalog (08)

**Footnote:** "Powered by Mosaic Wellness" — single line, no brand logos

**Remove from current demo:**
- 5-brand logo grid — contradicts brand-agnostic positioning

---

### Screen 01 — Auth

**Purpose:** Account creation. Fast, low-friction, phone-first.

**Layout:** Single input per step. No form walls.

**Step A — Phone input:**
- Input: Indian mobile number (+91 prefix default)
- CTA: "Send OTP"
- Alternative: "Continue with Google"

**Step B — OTP verification:**
- 6-digit OTP entry
- Resend: "Resend in 30s"

**Step C — Name:**
- Input: First name only
- Used for personalised greeting from OB1 onwards

**Data collected:**

| Field | Type | Used for |
|---|---|---|
| `phone` | string | Identity, auth |
| `first_name` | string | Greeting, personalisation |
| `user_id` | generated | Session, profile |

**No password. No email required.**

---

### Screen OB1 — Identity

**Purpose:** Route the AI. Collect the minimum demographic signal needed for cold-start personalisation.

**Headline:** "Who are we building this for, {first_name}?"

**Sub-copy:** "Your answer shapes your AI and your experience."

**AI signal bar:** "✦ AI pre-seeding from 6.5M profiles — we already have a head start"

**Input block 1 — Biological sex** *(3 cards, full-width stacked)*

| Option | Routing signal |
|---|---|
| Male | Routes toward MM / OWN / RL defaults |
| Female | Routes toward BB / RL defaults · unlocks cycle tracking |
| Prefer not to say | Neutral routing · AI relies more on concern + lifestyle |

**Input block 2 — Life stage** *(4 chips, single select)*

| Option | Routing signal |
|---|---|
| Student | Stress, focus, budget-sensitive protocol |
| Working professional | Energy, gut, stress, sleep-focused |
| Parent | Unlocks family context hint · LJ relevance |
| Senior (60+) | Joint health, immunity, Root Labs defaults |

**Input block 3 — Age range** *(chip row, single select)*

`18–24` · `25–34` · `35–44` · `45–59` · `60+`

**Progress indicator:** Step 1 of 4

**Data collected:**

| Field | Type |
|---|---|
| `sex` | enum: male / female / undisclosed |
| `life_stage` | enum: student / working / parent / senior |
| `age_range` | enum: 18-24 / 25-34 / 35-44 / 45-59 / 60+ |

**Critical constraint:** No brand names. No brand colors. This screen is entirely brand-free.

---

### Screen OB2 — Concern

**Purpose:** Capture the primary health problem in the user's own words. NLP-parsed, not categorised.

**Headline:** "What brings you here?"

**Sub-copy:** "Your words, not our categories. Hindi, Hinglish, English — all fine."

**Input:** Free-text, multi-line. Placeholder: *"e.g. Always tired, no energy, gut issues, not sure what to eat…"*

**Live signal:** "✦ AI is listening…" — visible while user types

**Suggestion tags — 2 rows:**

Row 1 (Nutrition — prominent, top):
`Not eating right` · `Protein intake` · `Gut / digestion` · `Weight management`

Row 2 (Symptom):
`Low energy` · `Hormones / PCOS` · `Hair & skin` · `Sleep problems` · `Stress / anxiety`

**Tag behaviour:** Tapping a tag appends it to the free-text field as a phrase. Maximum 3 tags selectable. Tags are shortcuts into the same NLP pipeline — not separate categories.

**Why nutrition tags are in row 1:** Nutrition-first positioning requires nutrition concerns to be as immediately accessible as symptom concerns. Users who don't know they have a nutritional gap must be able to surface it without clinical vocabulary.

**Progress indicator:** Step 2 of 4

**Data collected:**

| Field | Type |
|---|---|
| `concern_text` | string (free text) |
| `concern_tags[]` | array of selected tags |
| `primary_domain` | AI-inferred: nutrition / hormonal / energy / hair / gut / mind |

---

### Screen OB3 — Lifestyle

**Purpose:** Collect the 3 inputs that most directly determine nutritional recommendations. Fast — 3 taps, not a form.

**Headline:** "Tell us about your day-to-day"

**Sub-copy:** "3 quick answers — no forms."

**Input 1 — Diet type** *(required, single select)*

| Option | Downstream effect |
|---|---|
| Vegetarian | Iron absorption model · B12 risk · protein gap logic |
| Non-vegetarian | Different protein stack · heme iron baseline |
| Vegan | B12 mandatory · omega-3 gap · calcium check |
| Eggetarian | B12 partial risk · moderate protein baseline |

**Input 2 — Sleep quality** *(single tap)*

`Rarely get good sleep` · `Hit or miss` · `Mostly fine`

→ Feeds: magnesium · ashwagandha · cortisol · melatonin recommendations

**Input 3 — Activity level** *(single tap)*

`Mostly desk-bound` · `Light activity (walks/yoga)` · `Regularly active` · `Athlete / gym-goer`

→ Feeds: protein targets · electrolyte needs · recovery protocols

**UX pattern:** 3 stacked single-question blocks. Each visually collapses with a checkmark after selection. Screen feels like 3 taps, not a form.

**Progress indicator:** Step 3 of 4

**Data collected:**

| Field | Type |
|---|---|
| `diet_type` | enum: vegetarian / non-veg / vegan / eggetarian |
| `sleep_quality` | enum: poor / variable / good |
| `activity_level` | enum: sedentary / light / active / athlete |

---

### Screen OB4 — AI Match

**Purpose:** Trust-building processing moment. Show the user their data is being matched against a real corpus, not just stored.

**Layout:** Full-screen animation while AI computes.

**Animation sequence:**
1. "Matching your profile against 6.5M journeys…"
2. Progress through: Nutrition gaps · Hormonal patterns · Lifestyle fit · Protocol match
3. Reveal: detected outputs

**Output display — order matters:**

1. **Nutrition gaps headline** (AI finding, not brand): e.g. "Iron gap detected — vegetarian diet"
2. **Health parameter flags**: e.g. "Protein target: 48g/day" · "B12: borderline risk"
3. **Brand fit** (secondary, AI-assigned): "Be Bodywise: 96% fit for your profile"

**Framing note:** Brand appears as an AI output, not a user choice. Copy: "Based on your profile, AI recommends products from these brands." User never selected the brand — the AI assigned it.

**Progress indicator:** Step 4 of 4

**Data generated:**

| Field | Type |
|---|---|
| `nutrition_gaps[]` | array: iron / protein / B12 / calcium / omega3 |
| `brand_affinity[]` | array with fit % per brand |
| `health_score_initial` | integer 0–100 |
| `primary_protocol[]` | array of recommended products |

---

### Screen OB5 — Health Card

**Purpose:** Deliver the Day 1 identity. The culmination of onboarding. First commerce touchpoint.

**Header:** BetterHalf teal gradient — not brand color. This belongs to the platform.

**Header content:**
- Label: "YOUR HEALTH CARD · DAY 1"
- Name: {first_name}
- Context line: inferred role + city if available

**Score block:**
- Health score displayed as number (e.g. 62) + named band label
- Band labels: 0–39 "Getting Started" · 40–59 "Building" · 60–79 "Growing" · 80–100 "Thriving"
- Context: "You're in the **Growing** zone — most users reach Thriving in 90 days"
- Below score: 3-bar mini breakdown showing which dimensions contribute most (e.g., Nutrition: low · Sleep: moderate · Activity: good) — so users understand the score is a lifestyle composite, not a medical grade
- **Score framing rule:** Never show a raw number without the band label. The band reframes a "low" number as a starting position, not a judgement.

**Nutrition gaps section (new):**
- "Detected gaps" label
- 2–3 specific findings with Lucide icons: e.g. `droplet` Iron gap (vegetarian diet) · `dumbbell` Protein: 18g below daily target · `zap` B12: borderline risk
- **Icon rule:** All inline icons use Lucide SVG set — never emojis. Emojis render inconsistently across Android/iOS and undermine clinical trust.

**Protocol block:**
- 2–3 product pills
- Each pill: product name · brand badge (small) · timing · price
- Brand color appears here but subordinate to product name

**Cohort evidence:**
- "74% of users with your profile improved in 21 days — {N} BetterHalf users"
- Most powerful conversion element. Keep prominent.

**CTAs:**
- Primary: "Start my protocol · ₹{total}" → Home (07)
- Secondary: "Explore first, buy later" → Catalog (08)

---

## 7. Home Screen — Information Architecture

**Design principle:** Scroll position = priority. Brand appears as attribution only, never as navigation.

### Above-fold (always visible without scroll)

| # | Component | Content | Purpose |
|---|---|---|---|
| 1 | AI greeting + context | "Good morning {name}" + phase / day context + 1 AI insight line | Proof the AI knows you. Changes every session. |
| 2 | Health score delta | Score + change from yesterday | Progress signal |
| 3 | Daily check-in | 4 one-tap dimensions: Energy · Gut · Sleep · Mood. Day 1–3: Energy is required, others shown as "Tap to add" (optional). Day 4+: all 4 prompted equally. | Builds nutrition intelligence. Feeds protocol AI. Graduated engagement prevents Day 1 fatigue. |

### Below fold

| # | Component | Content | Purpose |
|---|---|---|---|
| 4 | Today's protocol | Protocol pills (taken / pending / missed) + smart reorder | Adherence + commerce |
| 5 | Nutrition insight card | Rotating AI card: gap → cause → action | Nutrition-first surface. Links to product or AI chat. |
| 6 | Health dimensions | 6 dials: Energy / Gut / Hormones or Performance / Immunity / Mind / Sleep. 7-day trend. | Longitudinal health picture |
| 7 | Community / cohort signal | Evidence-based social proof. No moderated feed. | Trust + outcome evidence |
| 8 | Explore strip | 2 AI-suggested products based on dimension gaps | Catalog entry point |

### Daily check-in — 4 dimensions

Why 4 (not just mood):

| Dimension | What it feeds |
|---|---|
| Energy | Iron / B12 / protein gap detection |
| Gut | Probiotic / digestive enzyme recommendations |
| Sleep | Magnesium / ashwagandha / melatonin stack |
| Mood | Cortisol / stress / adaptogen routing |

Check-in is the primary nutrition data collection surface post-onboarding. 7 consecutive fatigue logs trigger an AI nutrition review card.

### Nutrition insight card — rotation logic

| Trigger condition | Card content |
|---|---|
| 3+ fatigue check-ins in 7 days | "Low energy pattern detected — iron intake may be the cause" |
| Vegetarian + active + protein gap | "Vegetarian protein gap: ~18g today. Protein target not met." |
| Protocol Day 21 milestone | "74% of users at Day 21 report energy improvement — you're on track" |
| Sleep poor 3+ days | "Poor sleep pattern this week — magnesium B6 tonight can help" |
| Reorder due | "Be Bodywise Iron + Vit C running out in 8 days" |

---

## 8. Progressive Profile Build

Profile is not a form. It fills in across sessions through check-ins, AI prompts, and usage signals.

### What is collected when

| Stage | Inputs collected | How |
|---|---|---|
| Auth | Phone · first name | Screen |
| OB1 | Sex · life stage · age range | Onboarding |
| OB2 | Primary concern · concern tags | Onboarding |
| OB3 | Diet type · sleep quality · activity level | Onboarding |
| OB4–OB5 | AI-inferred: nutrition gaps · brand affinity · health score · protocol | AI |
| Week 1 — prompted | Meal timing · water intake · existing supplements · stress level | Home card prompts |
| Female users — Day 3 | Cycle length · last period date | AI prompt |
| Month 1 — earned | Health goals · wearable connection · doctor preference | Profile section |
| Ongoing — AI-gathered | Check-in history · adherence · outcome signals · seasonal patterns | Passive |
| Deferred | Family member profiles | Profile → "Add family member" |

---

## 9. Bottom Navigation

5 persistent tabs. Tab 4 is Insights (not Family — family is deferred to Profile).

| Tab | Icon | Label | Primary content |
|---|---|---|---|
| 1 | Home | Home | Dashboard · check-in · protocol |
| 2 | Grid | Explore | Catalog · brand-agnostic browse |
| 3 | ✦ | AI | Companion chat · persistent context |
| 4 | Chart | Insights | Dimension dials · trends · history |
| 5 | Person | Profile | Health profile · settings · future: family |

---

## 10. Catalog — Information Architecture

### Entry points
- From Home → Explore strip (product card tap)
- From Health Card OB5 → "Explore first, buy later"
- From AI chat → product recommendation tap
- From Dimension detail → "Products for this dimension"
- From nav → Explore tab
- **From Landing (unauthenticated)** → "Explore products first" (Screen 00 secondary CTA)

### Unauthenticated Catalog Experience

Users who tap "Explore products first" on the Landing page can browse the full catalog without signing up. The experience differs from the authenticated catalog:

| Feature | Authenticated | Unauthenticated |
|---|---|---|
| AI "For you" shelf | Personalised to profile | Hidden — replaced with "Trending" shelf |
| AI context card on PDP | "Why AI recommends this for you" — personalised | "Why people choose this" — generic cohort evidence |
| Profile fit % | Shown per product | Hidden |
| Cohort evidence | "X% of users with your profile…" | "X% of users report improvement in Y days" (generic) |
| Add to cart | Direct | Triggers auth flow → returns to cart after signup |
| Filter by goal | Available | Available |
| Consult CTA | Available | Shows "Sign up to book a free consult" |

**Conversion hook:** Every PDP for unauthenticated users includes a banner: "Sign up to see your personalised AI match for this product — it takes 3 minutes."

### Browse structure

**Default view (authenticated):** AI-curated "For you" shelf at top → then all products
**Default view (unauthenticated):** "Trending" shelf → "Most effective" shelf (cohort data) → all products

**Filters (not primary nav):**
- By health goal: Energy · Gut · Hormones · Immunity · Mind · Sleep · Performance · Nutrition
- By brand: MM · BB · LJ · RL · OWN (filter chip, not tab)
- By format: Capsule · Powder · Tea · Oil · Tablet
- By diet: Vegetarian · Vegan compatible

**Sort:** AI fit % (default) · Price · Newest

### Product Detail Page (PDP)

| Section | Content |
|---|---|
| Hero | Product image · brand badge · name · price |
| AI context card | "Why AI recommends this for you" — personalised to profile. Nutrition gap → product fit explanation. |
| Cohort evidence | "X% of users with your profile improved in Y days — Z users" |
| Profile fit indicator | **Above 70% fit:** "Great match for your profile" (green). **40–70% fit:** no indicator shown — neutral. **Below 40% fit:** "A better fit exists for your profile" + AI-recommended alternative product card. User can still add to cart — the flag is advisory, not blocking. Threshold is configurable server-side. |
| Ingredients + nutrition | Full label · lab cert link (NABL/Eurofins where available) |
| Protocol fit | "Add to Morning protocol" / "Add to Evening protocol" |
| Consult CTA | Doctor attribution · free consult prompt |
| Cross-sell | "Complete your protocol" — 1–2 complementary products |
| Add to cart / Subscribe | Subscribe at moment of outcome, not at checkout |

---

## 11. AI Companion — Architecture

**Entry:** ✦ tab in bottom nav · inline "Ask AI" prompts on home and PDP

**Context always available to AI:**
- Full health profile (sex · age · diet · concern · lifestyle)
- Current protocol and adherence
- Check-in history (last 30 days)
- Current phase (cycle day for female users)
- Nutrition gap status
- Order history

**Conversation types:**
- Daily check-in conversation ("How did you sleep?")
- Protocol question ("Should I take this before or after food?")
- Symptom query ("I've been feeling bloated all week")
- Product query ("Is Spearmint Tea right for me?")
- Nutrition query ("Am I getting enough protein?")

**AI response anatomy:**
1. Acknowledgement of context (shows AI has memory)
2. Data-backed insight (from cohort / personal history)
3. Recommendation (product or behaviour)
4. Optional: product CTA or consult CTA

---

## 12. Insights Tab — Architecture

**Purpose:** Longitudinal health picture. Where users see their progress, not just today's state.

### Sections

**Health dimensions — 6 dials**

| Dimension | Primary inputs | Products linked |
|---|---|---|
| Energy | Check-in: energy · HRV if wearable | Iron · B12 · protein · CoQ10 |
| Gut | Check-in: gut · bloating logs | Probiotics · digestive enzymes |
| Hormones / Performance | Cycle phase (F) · energy + HRV (M) | BB cycle stack (F) · MM testosterone (M) |
| Immunity | Season · illness logs · LJ if parent | Vitamin C · D3 · zinc |
| Mind | Check-in: mood · stress logs | Ashwagandha · magnesium · brahmi |
| Sleep | Check-in: sleep · bedtime patterns | Magnesium B6 · melatonin · ashwagandha |

**Check-in history**
- 30-day heatmap per dimension
- Trend line per parameter

**Protocol timeline**
- Day count per product
- Milestone cards: Day 7 / Day 21 / Day 90

**Progress summary**
- Score trajectory from Day 1
- Cohort comparison: "You're ahead of 68% of users who started with the same profile"

---

## 13. Design System — Key Decisions

### Color

| Token | Value | Usage |
|---|---|---|
| `--bh-teal` | #15594A | Primary brand · headers · CTAs · AI elements (WCAG AA 4.58:1 on cream) |
| `--bh-teal-light` | #EBF5F2 | AI card backgrounds · teal tints |
| `--bh-orange` | #E07040 | Secondary accent · reorder alerts · warm highlights |
| `--cream` | #FAF8F4 | App background |
| `--text-primary` | #111827 | Body text |
| `--text-muted` | #6B7280 | Labels · secondary text |
| `--border` | #E5E7EB | Card borders |
| Brand colors | Per brand | Product pills and PDP only — not in nav, not in onboarding |

### Brand color reference (PDP / product attribution only)

| Brand | Color |
|---|---|
| Man Matters | #1E3A5F |
| Be Bodywise | #9B2C5E |
| Little Joys | #2E7D52 |
| Root Labs | #7B5028 |
| OWN | #222222 |

### Typography scale

| Element | Size | Weight | Line-height |
|---|---|---|---|
| Screen headline (h1) | 26px | 800 | 1.3 (34px) |
| Section heading (h2) | 20px | 800 | 1.3 (26px) |
| Card title (h3) | 16px | 700 | 1.4 (22px) |
| Body | 16px | 400 | 1.5 (24px) |
| Secondary text | 14px | 400 | 1.5 (21px) |
| Label / badge | 12px | 600–700 | 1.4 (17px) |
| Caption / small | 12px | 400 | 1.4 (17px) |

**Typography rules:**
- **Minimum body text: 16px.** 14px is permitted only for secondary/supplementary text that is not critical for comprehension.
- **No text below 12px.** The previous 11px label size is removed — 12px is the floor.
- **Line-length:** At 430px max-width with 16px padding each side, the readable area is 398px. At 16px body, this yields ~50–55 characters per line — within the 45–75 character optimal range.
- **All text must remain readable at 200% browser zoom.**

### Spacing

| Token | Value |
|---|---|
| Screen padding horizontal | 16px |
| Card padding | 16px |
| Card border-radius | 16px |
| Section gap | 12px |
| Bottom nav height | 68px (includes safe area) |

### Component hierarchy

1. **AI card** — teal tint background · teal border · ✦ prefix · highest visual priority
2. **Protocol pill** — white background · border · icon · brand attribution small
3. **Product card** — white · subtle shadow · brand badge
4. **Insight card** — cream background · no shadow
5. **Action card** — orange accent for time-sensitive (reorder, alerts)

### Animation & Motion

| Context | Duration | Easing | Property |
|---|---|---|---|
| Button / tap feedback | 100–150ms | ease-out | opacity, background-color |
| Card expand / collapse | 200–250ms | ease-in-out | transform (scale), opacity |
| Bottom sheet open/close | 250–300ms | cubic-bezier(0.32, 0.72, 0, 1) | transform (translateY) |
| Page transition | 200ms | ease-in-out | opacity, transform (translateX) |
| Check-in tap response | 100ms | ease-out | transform (scale 0.95→1), background-color |
| OB4 AI Match sequence | 800ms per stage, 400ms between stages | ease-in-out | opacity, transform |
| Health score counter | 1200ms total | ease-out (decelerate) | number count-up |
| Skeleton shimmer | 1500ms loop | linear | background-position |

**Animation rules:**
- **Only animate `transform` and `opacity`.** Never animate `width`, `height`, `top`, `left`, or `margin` — these trigger layout reflow.
- **`prefers-reduced-motion: reduce`**: all animations replaced with instant state changes (0ms duration). OB4 sequence becomes a static checklist with checkmarks.
- **No animation on first paint.** Elements above the fold render in final state — no fade-in on page load.
- **No looping animations** except skeleton shimmer for loading states.

### Icon System

| Attribute | Decision |
|---|---|
| Icon set | Lucide (primary) · Heroicons (fallback) |
| Default size | 24×24px (`viewBox="0 0 24 24"`) rendered at `w-5 h-5` (20px) or `w-6 h-6` (24px) |
| Stroke width | 1.5px (matches Lucide default) |
| Color | Inherits from parent `currentColor` |
| Touch icon size | Icon 24px centered in 44×44px touch target |

**Icon rule:** No emojis anywhere in the UI. All icons are SVG from the Lucide set. Emojis render inconsistently across Android/iOS and undermine the clinical trust positioning.

---

## 14. Key Constraints and Rules

### Brand rules
- Onboarding (OB1–OB3): **zero brand exposure**
- AI Match (OB4): brand as AI output — framed as recommendation, not choice
- Health Card (OB5): brand badge on product pills — small, subordinate
- Home: brand on protocol pills and explore strip — never in headers or navigation
- Catalog: brand as filter — not primary navigation
- PDP: full brand identity — this is the only screen where brand is dominant

### Nutrition-first rules
- Diet type must be collected in onboarding (OB3) — not deferred
- Nutrition tags must appear in row 1 of concern screen (OB2)
- Nutrition insight card must appear in home feed, above health dimensions
- Daily check-in must include Gut and Energy as separate dimensions
- AI nutrition gap findings must appear before brand fit on AI Match screen

### Commerce rules
1. AI context before any product surface (authenticated) or generic cohort evidence (unauthenticated)
2. Cohort evidence on every PDP — personalised for authenticated, generic for unauthenticated
3. Consult CTA on every PDP — below outcome card, never upsold
4. Cross-sell framed as "complete your protocol" — not "you may also like"
5. Profile fit indicator: ≥70% = "Great match" (green), 40–70% = neutral (no label), <40% = "A better fit exists" + alternative. Advisory only — never blocks purchase.
6. Smart reorder surfaced in home feed — not push notification
7. Subscription triggered at moment of outcome — not at checkout
8. Unauthenticated users can browse full catalog and view PDPs. Add-to-cart triggers auth flow, then returns to cart.

### Progressive profile rules
- Day 1 onboarding: maximum 4 screens, 3 minutes
- No field is mandatory beyond: sex · concern · diet type
- All additional inputs prompted contextually by AI — never as a profile form
- Family graph deferred until user's own profile is established

---

## 15. Open Decisions (to resolve before screen design)

| # | Decision | Options | Recommended |
|---|---|---|---|
| 1 | OB3 as separate screen or merged with OB2 | Separate (4 onboarding screens) vs merged (3 screens, longer OB2) | **Separate** — diet type needs full attention |
| 2 | Check-in: 4 dimensions from Day 1 or 2 and grow | 4 from Day 1 vs start with Energy + Mood, add Gut + Sleep at Day 7 | **4 available from Day 1, Energy required, others optional until Day 4** — balances nutrition-first need with engagement ramp |
| 3 | Insights tab content priority | Dimension dials first vs check-in history first | **Dials first** — forward-looking, not historical log |
| 4 | 6th brand | Identity TBD | Confirm before catalog build |
| 5 | Cycle tracking prompt timing (female users) | OB1 vs Day 3 AI prompt | **Day 3 AI prompt** — reduces onboarding friction |
| 6 | Wearable integration (HRV/sleep data) | Day 1 prompt vs Month 1 earned | **Month 1** — don't gate onboarding on device pairing |

---

## 16. Out of Scope (v1)

- Family graph and multi-member profiles
- Returning Mosaic user onboarding flow
- Doctor consultation booking (CTA present, flow deferred)
- Wearable / device integration
- Community / social features
- B2B / corporate wellness
- International / diaspora features (Root Labs US)
- Subscription management screens
- Order tracking and logistics

---

## 17. Accessibility Requirements

Accessibility is a first-class requirement across all screens. BetterHalf targets users aged 18–65+, including users with low vision, motor impairments, and cognitive differences.

### Color Contrast

| Context | Requirement | Spec |
|---|---|---|
| Body text on cream (`#FAF8F4`) | WCAG AA minimum | 4.5:1 ratio — verified with `--bh-teal` #15594A (4.58:1) |
| Body text on white cards | WCAG AA minimum | `--text-primary` #111827 on white = 15.4:1 — passes |
| Muted text on cream | WCAG AA for large text | `--text-muted` #6B7280 on cream = 4.6:1 — passes AA, but use only for labels ≥ 16px |
| Brand badge text | WCAG AA | Each brand color must be tested against its badge background before shipping |
| Health score number | WCAG AAA (critical info) | 7:1 minimum — use `--text-primary` for score display |

**Rule:** Color must never be the only indicator. All status states (taken/pending/missed in protocols, good/poor in check-ins) must combine color with icon or text label.

### Touch Targets

| Element | Minimum size | Notes |
|---|---|---|
| Chip selectors (OB1, OB3) | 44×44px | Chips must have 44px minimum height with 8px gap between |
| Suggestion tags (OB2) | 44×44px | Tag pills must meet minimum even if text is short |
| Check-in dimension taps | 48×48px | Larger target — primary daily interaction |
| Bottom nav icons | 48×48px | Per iOS/Android HIG |
| Protocol pill actions | 44×44px | "Taken" / "Skip" tap targets |
| Card CTAs | 44×44px height | Full-width preferred |

### Screen Reader Support

| Screen | Requirement |
|---|---|
| Health score (OB5, Home) | `aria-label="Health score 62 out of 100. This is your starting point."` |
| Health dimension dials (Insights) | `aria-label="Energy: 7 out of 10. Trending up over 7 days."` — dials must not be image-only |
| Check-in (Home) | Each dimension button: `aria-label="Log energy level"` with `role="slider"` or equivalent |
| Progress indicator (OB1–OB4) | `aria-label="Step 2 of 4: Health concerns"` using `aria-current="step"` |
| AI Match animation (OB4) | `aria-live="polite"` for each progress stage announcement |
| Protocol pills (Home) | `aria-label="Iron + Vitamin C by Be Bodywise. Morning. Pending."` |

### Heading Hierarchy

Every screen must use sequential heading levels (h1 → h2 → h3). No skipping levels.

| Screen | h1 | h2 examples |
|---|---|---|
| Landing | "The AI that truly knows your body" | Trust block, Testimonial |
| OB1 | "Who are we building this for, {name}?" | Biological sex, Life stage, Age |
| Home | "Good morning {name}" (visually hidden if needed) | Today's protocol, Nutrition insight, Health dimensions |
| Insights | "Your health insights" | Dimension dials, Check-in history, Progress |

### Keyboard Navigation

- All onboarding chip/card selectors must be keyboard-navigable with arrow keys
- Tab order must match visual order on every screen
- Focus rings: 2px solid `--bh-teal` with 2px offset — visible on all interactive elements
- Skip-to-content link on every screen with bottom nav

### Motion & Reduced Motion

- All animations must check `prefers-reduced-motion: reduce`
- OB4 with reduced motion: show static step list with checkmarks instead of animation sequence
- Micro-interactions (card expand, check-in tap feedback): replaced with instant state change
- Page transitions: replaced with instant cut

### Text Sizing

- All text must remain readable at 200% zoom
- No text is set with fixed viewport units (no `vw`/`vh` for font sizes)
- Minimum interactive label: 14px (non-critical supplementary only)
- Minimum body text: 16px (see Typography scale in Section 13)

---

## 18. Error States & Edge Cases

Every screen must define behaviour for failure scenarios. Users should never see a blank screen or dead end.

### Auth (Screen 01)

| Scenario | Behaviour |
|---|---|
| OTP delivery failure | Show: "OTP not received? Try again or use Google sign-in." Retry after 30s. |
| 3 consecutive OTP failures | Lock OTP for 5 minutes. Show countdown. Offer Google SSO as alternative. |
| Invalid phone number | Inline validation on blur: "Please enter a valid 10-digit mobile number." |
| Google SSO failure | Toast: "Google sign-in failed. Please try again or use phone OTP." |
| Network timeout | Show: "Connection issue. Check your network and tap Retry." + Retry button. |

### OB2 — Concern (Free-text NLP)

| Scenario | Behaviour |
|---|---|
| NLP parse failure | Fallback to tag-only mode: "We couldn't parse your text — please select from the tags below." Tags become the primary input. |
| Empty submission | CTA disabled until ≥1 tag selected or ≥10 characters typed. Micro-copy: "Select at least one concern or describe in your own words." |
| Offensive/irrelevant input | AI returns generic concern set. No error shown — graceful degradation. |
| Hindi/Hinglish input not parsed | Fallback: show English tags with note "We're improving Hindi support — please select from these options for now." |

### OB4 — AI Match

| Scenario | Behaviour |
|---|---|
| AI computation timeout (>15s) | Show: "Taking longer than usual…" at 8s. At 15s: "We're preparing your results. Tap to continue with preliminary insights." → Skip to OB5 with partial data. |
| AI service unavailable | Skip OB4 animation entirely. Proceed to OB5 with rule-based defaults (brand affinity from sex/age/concern mapping). Show: "Your personalised insights are being refined — check back in 24 hours for your full AI match." |
| No brand scores above 60% | Show top brand with actual score. Reframe copy: "We're still learning about you — your match will improve as you check in." Never show a fit below 40%. |
| All brands score similarly | Show top 2 brands as "equally good fit" instead of a single winner. |

### Insights (Screen 12) — Empty/Early States

| Scenario | Behaviour |
|---|---|
| Day 1 (no check-in data) | Heatmap: show empty grid with ghost cells. Message: "Start checking in to see your trends here." |
| Day 1 (no protocol data) | Timeline: show Day 1 marker only. Message: "Your protocol timeline begins when you start your first product." |
| Score trajectory (< 7 days) | Hide trend line. Show single score point. Message: "Trend available after 7 days of check-ins." |
| Cohort comparison (< 14 days) | Hide cohort comparison card entirely. Replace with: "Keep going — cohort insights unlock at Day 14." |

### Home Screen — Check-in

| Scenario | Behaviour |
|---|---|
| Network offline during check-in | Save locally. Show: `cloud-off` icon + "Saved offline — will sync when connected." |
| Check-in already completed today | Show completed state with values. Allow edit: "Tap to update today's check-in." |
| Missed check-in (yesterday) | Gentle prompt at top of home: "You missed yesterday's check-in. Want to log it now?" — dismissable. Never guilt-trip. |

### Global

| Scenario | Behaviour |
|---|---|
| Network offline (any screen) | Persistent top banner: "You're offline. Some features may be unavailable." Cached screens remain usable. |
| Session expired | Redirect to Auth with message: "Session expired — please verify your number again." Pre-fill phone number. |
| App closed mid-onboarding | Resume at last completed step on next launch. All prior inputs preserved in local storage. Progress indicator shows completed steps as filled. |
| Deep link to screen requiring auth | Redirect to Auth → on success, continue to deep link target. |

---

## 19. Navigation Rules

### Onboarding Navigation

| Rule | Spec |
|---|---|
| **Back navigation** | Every onboarding screen (OB1–OB5) has a back arrow in the top-left. Tapping back preserves all input on the current screen. |
| **Skip option** | A persistent "Skip for now →" text link appears below the primary CTA on OB1, OB2, and OB3. Skipping uses defaults: undisclosed sex, no concern tags, average lifestyle. OB4 and OB5 cannot be skipped (they are AI output, not input). |
| **Session resume** | If the user closes the app mid-onboarding, they resume at the last incomplete step on next launch. All prior inputs are preserved in local storage. The progress bar shows completed steps as filled. |
| **Hardware back (Android)** | Matches in-app back button behaviour. From OB1, hardware back returns to Auth. From Auth, exits to Landing. |
| **Swipe back (iOS)** | Edge swipe enabled on all onboarding screens. Matches back arrow behaviour. |

### Modal / Sheet / Full-Screen Rules

| Container | When to use | Max height | Examples |
|---|---|---|---|
| **Bottom sheet** | Quick-glance content. < 2 scroll heights. No text input. | 70% of viewport | Protocol detail, Nutrition insight detail, Product quick-view |
| **Full sheet** | Content requiring scroll or simple input. | 92% of viewport (peek at parent) | Dimension detail, Check-in history, Filter panel |
| **Full screen** | Extended reading, text input, or deep interaction. | 100% | AI chat, Product detail page, Health profile edit |
| **Inline modal** | Confirmations and alerts only. | Auto-height, centered | "Remove from protocol?", "Log out?" |

**Conflict rule:** Bottom sheets must not overlap with bottom navigation. When a bottom sheet is open, the nav bar hides or the sheet opens above it with sufficient clearance (68px + 8px padding).

### Deep Linking & URL Architecture

| Screen | URL pattern | Auth required |
|---|---|---|
| Landing | `/` | No |
| Catalog browse | `/explore` | No |
| Product detail | `/product/{product_slug}` | No |
| AI chat | `/ai` | Yes |
| Home | `/home` | Yes |
| Health card | `/health-card` | Yes |
| Insights | `/insights` | Yes |
| Insights dimension | `/insights/{dimension}` | Yes |
| Profile | `/profile` | Yes |
| Onboarding step | `/onboarding/{step}` | Yes |

**Deep link rules:**
- Unauthenticated deep links to auth-required screens → redirect to Auth → on success, continue to target.
- Product links and catalog are publicly accessible for shareability and SEO.
- Push notification taps route to specific deep link. Notification payload includes `target_url`.
- Share mechanics: Health Card (as image), milestone cards (as image + link), product recommendations (as link).

### AI Companion Placement Rationale

The AI tab occupies the center (Tab 3) position because:
1. **It is the platform's core differentiator** — the "AI-native OS" thesis requires AI to be architecturally central, not buried.
2. **It serves as a universal router** — product queries, symptom questions, protocol adjustments, and nutrition questions all flow through AI chat. It is not just chat — it is the primary decision-support layer.
3. **Contextual "Ask AI" prompts on Home and PDP reduce but don't replace the tab** — those are shortcut entry points into the same persistent chat. The tab provides the full conversation history and proactive AI nudges.
4. **Validation plan:** Track Tab 3 tap frequency in first 30 days. If < 10% of daily active sessions use the tab directly (vs. contextual prompts), consider replacing with a floating action button in v2.

---

*Document owner: Product · Last updated: April 2026*  
*Next step: Screen-by-screen wireframe starting OB1 → OB2 → OB3*