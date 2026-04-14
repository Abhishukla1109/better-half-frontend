# BetterHalf — Home (Post-Login)
**Version:** 0.4 · Derived from `information_architecture_v1.md` (Section 7)  
**Scope:** Authenticated home screen · personalised programme interface  
**Core premise:** The home is not a dashboard and not a chat window. It is a living, AI-woven feed — part conversation, part programme, part mirror. The user interacts with their body through the AI, and the AI interacts with the user through the home. They are the same surface. Every interaction either moves the user toward a purchase or toward an expert — never through a hard sell, always through demonstrated value.

---

## 0. User Base & Business Objective

### Who this is for

The BetterHalf user base is a look-alike of ManMatters.com, BeBodwise.com, and LittleJoys.com customers:

| Trait | Profile |
|---|---|
| **Demographics** | Urban India, 20–45, smartphone-first, English/Hinglish fluent |
| **Income** | Middle to upper-middle class — willing to spend on health, but expects to see value before committing |
| **Health literacy** | Moderate. Googles symptoms. Has tried 1–2 supplements or skincare products before. Hasn't built a system. |
| **Concern-driven** | Came for a specific problem: hair loss, PCOS, weight, skin, energy, gut, beard, sleep. Not browsing — searching. |
| **Trust model** | Trusts doctors. Trusts before/after evidence. Trusts "people like me." Sceptical of generic wellness marketing. |
| **Purchase behaviour** | Needs conviction before first purchase. Once convinced, repeats. Subscription-friendly if outcome is visible. |
| **Digital behaviour** | Comfortable with WhatsApp, Instagram, short-form video. Expects apps to be intuitive without tutorials. |

### The two business outcomes

Every screen, every card, every interaction on the home should organically move the user toward one of two outcomes:

| Outcome | What it means | How the feed drives it |
|---|---|---|
| **Purchase** | User buys a product from the Mosaic portfolio | AI identifies gaps → recommends protocol → supplements prove value through adherence tracking and visual progress → reorder/subscribe is the natural next step |
| **Expert consult (paid)** | User books a paid consultation with a doctor/specialist | AI surfaces complexity it can't resolve → positions the expert as the next level of care → expert card appears at the moment the user has a question the AI shouldn't answer alone |

**Critical rule:** Neither outcome is ever pushed. Both are earned. The feed creates the conditions where buying a product or talking to a doctor is the obvious, rational next thing to do — not the thing the app is begging for.

### Revenue logic embedded in the feed

```
User concern (hair loss)
    → AI builds awareness (iron gap, protein gap, DHT)
        → Protocol recommended (supplements address gaps)
            → Adherence tracked → Visual progress shown
                → Reorder / Subscribe (purchase)
    → AI hits a boundary ("your hair pattern suggests you should get a trichoscopy")
        → Expert card surfaces with specific context
            → Book a consult (paid)
    → Expert recommends prescription / advanced treatment
        → Available through BetterHalf pharmacy/fulfilment
            → Purchase (higher AOV)
```

The AI is the top of the funnel. Experts are the mid-funnel trust amplifier. Products are the conversion layer. All three live on the home feed.

---

## 1. The Fundamental Shift: Home IS the AI

In IA v1, Home was Tab 1 and AI Companion was Tab 3. Two separate surfaces. That separation is dissolved.

**The home screen is a conversational feed.** Every element on it — a nudge, a meal photo prompt, a supplement reminder, a scalp check request — is a message from the AI to the user. The user can respond to any of these with:
- A tap (simplest — binary or scale)
- A photo (camera opens inline)
- A voice note or typed text (open-ended, anytime)
- A swipe or slide (quick input on a spectrum)
- Silence (which is itself a signal)

**There is no "open AI chat" action.** The home IS the chat. Scrolling up is scrolling through conversation history. The feed is the relationship.

### What changes in the nav

| IA v1 | v0.3 |
|---|---|
| Tab 1: Home (dashboard) | Tab 1: **Home** (AI feed — the primary surface) |
| Tab 2: Explore (catalog) | Tab 2: **Explore** (catalog — unchanged) |
| Tab 3: AI Companion (chat) | Tab 3: **Ask** — quick-access text/voice input that posts into the home feed |
| Tab 4: Insights | Tab 4: **Experts** — doctor/specialist panel, consult booking, expert content |
| Tab 5: Profile | Tab 5: **Insights** — dimension dials, trends, progress |
| Profile in bottom nav | **Profile moves to header** — avatar icon, top-right corner |

```
┌─────────────────────────────────────────────┐
│  BH logo                    [notification] [avatar] │  ← Header bar
├─────────────────────────────────────────────┤
│                                             │
│              (feed content)                 │
│                                             │
├─────────────────────────────────────────────┤
│  Home    Explore    ✦ Ask    Experts  Insights │  ← Bottom nav (5 tabs)
└─────────────────────────────────────────────┘
```

**Header bar (sticky top):**
- Left: BetterHalf logo (compact mark, not full wordmark)
- Right: notification bell (dot indicator for unread) + profile avatar (tap → profile sheet)
- Background: `--cream` with subtle bottom border, blurs to translucent on scroll (glass effect)
- Height: 48px + safe area

**Profile in header rationale:** Profile is a settings/identity destination, not a daily-use surface. It doesn't earn a bottom tab. The header avatar is familiar (Instagram, YouTube, GPay model) and frees a tab for Experts — which IS a daily-use revenue surface.

**Tab 3 ("Ask") behaviour:** Tapping the centre tab opens a text input + voice input overlay anchored to the bottom of the home feed. The user types or speaks. The AI responds inline in the feed. There is no separate chat screen. The overlay dismisses after input, and the response appears in the feed.

**Tab 4 ("Experts") behaviour:** See Section 10 — dedicated Experts surface.

---

## 2. Framework: Three Pillars of the Body

The home organises everything the user sees and does around three dimensions of how a human body actually works:

| Pillar | Plain label | What it governs | User feels it as |
|---|---|---|---|
| **Diet, Supplements & Medicine** | What goes in | Food, nutrients, supplements, medicines, hydration | "Am I feeding my body right?" |
| **Lifestyle** | How the body moves | Sleep, activity, routines, rest cycles, physical habits | "Am I using my body well?" |
| **Mindspace** | What the mind carries | Stress, mood, mental clarity, emotional load, cognitive sharpness | "Is my head in a good place?" |

These three are not categories in a menu. They are lenses the AI uses to organise the feed. A user never selects a pillar — the AI weaves all three into the day's conversation naturally.

**Why three, not six:** The existing IA uses 6 health dimensions (Energy / Gut / Hormones-Performance / Immunity / Mind / Sleep). Those 6 remain as measurement parameters under Insights. The 3 pillars here are the AI's organising logic for what to surface and when. A user acts across 3 pillars daily; they review 6 dimensions weekly.

**No Ayurvedic wrapping:** The framework draws from Ayurveda's Aahar-Vyavhar-Vichaar triad structurally, but the user never encounters Sanskrit terms, traditional medicine language, or dosha-based framing. The surface is modern, body-literate, and clinical-casual. The philosophy is invisible — only the utility is felt.

---

## 3. Profiling-First Feed — The Home Starts by Listening

The feed does not begin with actions. It begins with questions. The home's first job is to understand who it's talking to — and it never fully stops doing that.

### 3.1 The profiling problem

A user arrives at home with almost nothing:
- Auth gave us: phone number, first name
- Onboarding may have given us: sex, age, life stage, concern text, diet type, sleep, activity
- But onboarding is skippable. A user who tapped "Skip" three times has: a name and a phone number. That's it.

**The feed must work from zero.** It can't assume a protocol exists. It can't assume a concern is known. It can't show supplement cards if no supplements have been recommended. The home needs to earn the right to act by first earning the right to understand.

### 3.2 Profile completeness model

The AI tracks a **profile depth** score internally (never shown to the user). This determines what the feed can and cannot do.

| Level | What's known | Feed behaviour |
|---|---|---|
| **L0 — Stranger** | Name + phone only (all onboarding skipped) | Feed is pure conversation. AI asks open questions. No pillar cards, no protocol, no nudges. |
| **L1 — Silhouette** | Sex + age range + 1 concern keyword | AI can route to a broad category. Feed starts showing concern-relevant content and soft profiling questions. Still no protocol. |
| **L2 — Sketch** | L1 + diet type + lifestyle basics (sleep/activity) | AI can generate a preliminary protocol recommendation. First product/expert surface becomes possible. Pillar cards start appearing. |
| **L3 — Portrait** | L2 + confirmed concern detail + 3+ days of feed interaction data | Full feed activated. Protocol in place. Profiling questions shift from basics to depth (medical history, family patterns, specific habits). |
| **L4 — Living profile** | L3 + 14+ days of behavioural data + visual baselines | Feed is fully personalised. Profiling becomes ambient — occasional deepening questions woven between action cards. Never stops. |

**The user never sees these levels.** They just experience a feed that gets more specific over time. But internally, the AI gates what it surfaces based on what it actually knows.

### 3.3 The L0 feed — starting from nothing

When the AI knows almost nothing, the feed IS the onboarding. But it doesn't feel like onboarding — it feels like a first conversation.

```
┌─────────────────────────────────────────────┐
│  ○ Hey Vikas.                               │
│                                             │
│  I'm your BetterHalf — think of me as       │
│  a health companion that actually            │
│  remembers what you tell it.                 │
│                                             │
│  Before I can be useful, I need to           │
│  understand you a little. Nothing            │
│  clinical — just who you are.                │
│                                             │
│  What brings you here?                       │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ type anything...                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  or pick one:                               │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ Hair issues  │ │ Low energy   │          │
│  └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ Skin/acne    │ │ Weight       │          │
│  └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ Gut issues   │ │ Just curious │          │
│  └──────────────┘ └──────────────┘          │
│                                             │
│  [ type something... ]              [mic]   │
└─────────────────────────────────────────────┘
```

**If user types freely** ("my hair's been falling out a lot recently, I'm 28"):
The AI extracts: concern = hair loss, age ≈ 28, urgency = moderate. Responds conversationally:

```
┌─────────────────────────────────────────────┐
│  ✦ Hair loss at 28 — that's something       │
│  I can actually help with. About 40% of     │
│  men under 30 deal with this.               │
│                                             │
│  A couple of quick things that'll help      │
│  me understand your situation:              │
│                                             │
│  How long has it been noticeable?            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Weeks    │ │ Months   │ │ Years    │    │
│  └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘
```

**If user taps a chip** (e.g. "Hair issues"):
AI follows up specifically:

```
┌─────────────────────────────────────────────┐
│  ✦ Got it — hair. Can you tell me a         │
│  bit more? Anything helps.                  │
│                                             │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ Thinning     │ │ Bald patches │          │
│  └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ Dandruff     │ │ Beard growth │          │
│  └──────────────┘ └──────────────┘          │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ Postpartum   │ │ Not sure     │          │
│  └──────────────┘ └──────────────┘          │
│                                             │
│  or describe it: ___________________        │
└─────────────────────────────────────────────┘
```

### 3.4 Profiling card types — conversational questions

Every profiling question is a feed card. They look and feel like the AI talking, not a form.

| Profile data needed | Card format | Tone |
|---|---|---|
| **Sex** | "Quick one — are you male, female, or prefer not to say? This helps me calibrate recommendations." | Direct but soft. Explains why. |
| **Age range** | "And roughly how old are you?" + chips: 18–24 / 25–34 / 35–44 / 45–59 / 60+ | Fast tap. No typing. |
| **Concern detail** | Free text + chips specific to the concern category | Open-ended encouraged. Chips as fallback. |
| **Diet type** | "What does your diet look like mostly?" + Veg / Non-veg / Vegan / Eggetarian | Single tap. No judgement on any choice. |
| **Sleep** | "How's your sleep been generally?" + Slider or 3 chips | Soft. Not clinical. |
| **Activity** | "Would you say you're mostly sitting through the day, or do you move around a lot?" | Conversational phrasing, not a form label. |
| **Existing supplements** | "Are you taking anything right now? Supplements, vitamins, any prescribed meds?" + text / "Nothing" / "Not sure" | Important for protocol safety. Open text welcomed. |
| **Medical history** (deeper) | "Any health conditions a doctor has told you about? Totally fine to say none." + text / "None" / "Rather not say" | Sensitive. Always has an opt-out. |
| **Family history** (deeper) | "Has anyone in your family dealt with {user's concern}? Genetics play a role here." | Only asked after Day 7+. Concern-specific. |

### 3.5 Profiling cadence rules

| Rule | Spec |
|---|---|
| **L0 → L1:** Maximum 3 profiling cards in the first session | Don't interrogate. Get concern + sex + age. That's enough to start. |
| **L1 → L2:** 1–2 profiling questions per day, woven between content | Mix profiling with value: show a relevant insight, THEN ask a question. |
| **L2 → L3:** Profiling becomes response-triggered | AI asks follow-ups based on what the user does, not on a fixed checklist. User logs a bad sleep night → "Has sleep always been an issue, or is this recent?" |
| **L3 → L4:** Profiling is ambient and concern-reactive | "You mentioned your mom has thyroid issues — that's useful context for your hormone patterns." |
| **Never more than 2 unanswered profiling cards visible at once** | If the user skips a profiling question, it dims and doesn't return for 48 hours. AI tries a different question or phrasing. |
| **Every profiling question explains WHY** | "This helps me..." / "The reason I ask..." / "Knowing this lets me..." — the user must see the value of answering. |
| **User can always say "skip" or "rather not say"** | No question is mandatory. The AI works with what it has and flags internally what it's missing. |

### 3.6 Profiling never stops

Even at L4 (fully profiled), the AI continues to ask deepening questions — but less frequently and more contextually.

| Timing | Question type | Example |
|---|---|---|
| **Week 2** | Concern history | "How long have you been noticing {concern}? Has it been getting worse, stable, or better before you started here?" |
| **Week 3** | Family health context | "Does hair thinning run in your family? Your dad's side matters most for male pattern." |
| **Week 4** | Stress/emotional context | "You've had a few stressful weeks. Is that normal for you, or is something specific going on?" (only if Mindspace data supports it) |
| **Month 2** | Goal refinement | "When you first came here, your main concern was hair. Is that still the top priority, or has something else come up?" |
| **Month 3** | Life change detection | "Anything big changed recently? New job, moved cities, diet shift? These things affect your body more than people expect." |
| **Seasonal** | Environmental context | "It's getting hotter. Your scalp/skin/gut may respond differently. Noticing anything?" |
| **Post-consult** | Expert follow-through | "Dr. Sharma mentioned you should watch your vitamin D. Want me to add a D3 check to your routine?" |

### 3.7 How profiling feeds into the business outcomes

Profiling is not just about personalisation — it's the fastest path to purchase and expert consult.

| Profile data collected | Business action unlocked |
|---|---|
| Concern identified | AI can recommend a protocol → **purchase path opens** |
| Concern + diet + lifestyle known | Protocol becomes specific and defensible → user trusts the recommendation → **conversion rate increases** |
| Concern is complex / multi-layered | AI surfaces expert card: "This is layered — a specialist would be faster than me figuring it out alone." → **expert consult path opens** |
| Family history collected | Deeper personalisation + AI can reference hereditary patterns → **retention increases** (user feels understood) |
| Goal refined at Month 2 | AI can suggest protocol expansion or new products → **AOV increases** |

**The profiling feed IS the top of the conversion funnel.** The more the AI knows, the more precisely it can recommend, and the more the user trusts the recommendation. Every profiling question is an investment in conversion quality.

---

## 4. The Feed: How the Home Works

> **Context:** This section describes the feed at L3+ (portrait stage — protocol active, all three pillars running). For how the feed works before this point — when the user is a stranger, a silhouette, or a sketch — see **Section 3** (Profiling-First Feed) and **Section 10** (Feed State Transitions). The feed shown below is what the user graduates into. It is not the starting state.

### 4.1 Feed anatomy

The home is a vertical, time-ordered feed. New items appear at the top. Each item is a **card** — a conversational unit from the AI or the user. At L0–L2, cards are profiling questions and concern-relevant content. At L3+, they are the full action-data-insight programme described below.

```
┌─────────────────────────────────────────────┐
│  ○ Good morning, Vikas.                     │  ← AI greeting (always top, sticky)
│  Your iron is working — energy's been       │
│  up 3 days straight.                        │
│  ·                                          │
│  Quick one: would you be stepping out       │  ← Soft nudge (conversational)
│  today?                                     │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐    │
│  │ Yes     │ │ Not sure │ │ Nah, home │    │  ← Tap response options
│  └─────────┘ └──────────┘ └───────────┘    │
│                                             │
│  [ type something... ]              [mic]   │  ← Always-available open input
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  DIET · morning                             │  ← Pillar tag + time context
│                                             │
│  Time for your iron + Vit C.                │  ← Supplement reminder
│  How's the supply looking?                  │
│                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ Taken  │ │ Missed │ │ Ran out│          │
│  └────────┘ └────────┘ └────────┘          │
│                                             │
│  Supply: ████████░░ ~8 days left            │  ← Days-of-supply gauge
│  [Reorder now]                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  DIET · lunch                               │
│                                             │
│  What did lunch look like today?            │  ← Meal photo prompt
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │     [ camera icon ]                 │    │  ← Tap to open camera
│  │     Snap a photo                    │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  or just tell me _______________            │  ← Text fallback
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  LIFESTYLE · evening                        │
│                                             │
│  You've been sitting for ~4 hours.          │  ← Context-aware nudge
│  Even a 5-minute walk changes your          │
│  blood sugar curve tonight.                 │
│                                             │
│  ┌─────────────┐  ┌────────────────┐       │
│  │ I walked    │  │ Tell me more → │       │
│  └─────────────┘  └────────────────┘       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  MINDSPACE · anytime                        │
│                                             │
│  On a scale of 1 to 5, how loud is          │  ← Emotional temperature
│  your head right now?                       │
│                                             │
│  1       2       3       4       5          │
│  quiet           busy          racing       │  ← Slider or tap
│  ○───────○───────●───────○───────○          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ✦ EXPERT INSIGHT                           │  ← Expert card (AI-triggered)
│                                             │
│  Your hair pattern over 4 weeks suggests    │
│  this could benefit from a trichoscopy.     │
│  That's beyond what I can assess from       │
│  photos alone.                              │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Dr. Priya Sharma                   │    │
│  │  Dermatologist · Hair specialist     │    │
│  │  ★ 4.8 · 2,400+ consults            │    │
│  │  ┌────────────────────────────┐     │    │
│  │  │  Book · ₹499 · 15 min     │     │    │
│  │  └────────────────────────────┘     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [ Maybe later ]                            │
└─────────────────────────────────────────────┘
```

### 3.2 Feed composition rules

The feed is not random. The AI composes it based on:

| Signal | How it shapes the feed |
|---|---|
| **Time of day** | Morning: supplement + meal prompt. Afternoon: movement nudge. Evening: wind-down + reflection. |
| **Day in protocol** | Day 1–3: fewer cards, gentler tone. Day 7+: more specific, references user history. Day 21+: milestone cards, pattern insights. |
| **User's concern** | Hair concern → scalp photo card weekly. Skin concern → skin photo card. Gut concern → food photo more prominent. |
| **Yesterday's data** | Slept poorly? Morning card shifts from diet to rest-focused. Energy was high? AI acknowledges and reinforces. |
| **Skip/silence patterns** | User ignores Mindspace cards? AI reduces frequency, tries different format. Never stops entirely — just gets quieter. |
| **Open-ended inputs** | User typed "feeling off today" → AI immediately responds in feed, adjusts today's card tone and content. |

### 3.3 The always-on input

At the bottom of the feed (above the nav bar), a persistent input bar:

```
┌─────────────────────────────────────────────┐
│  [ What's on your mind? ]     [cam] [mic]   │
└─────────────────────────────────────────────┘
```

This is not a "chat box." It is the user's voice into the feed. They can:
- Type anything: "I ate too much at lunch", "my scalp feels dry", "I'm anxious about tomorrow"
- Tap the camera: snap a photo of anything — meal, scalp, skin, supplement bottle, a label they're confused about
- Tap the mic: voice input, transcribed and processed by AI

The AI processes the input and responds with a new card in the feed — an insight, a follow-up question, a protocol adjustment, or simple acknowledgement.

**This replaces the separate AI Companion tab entirely.** The home IS the companion.

---

## 4. Rich Input Modalities

Logging is not a button click. It is an experience — sometimes visual, sometimes tactile, sometimes conversational. Each input type is designed to feel like a natural part of the conversation, not a data entry chore.

### 4.1 Meal photo capture

**When it appears:** AI prompts after typical meal times (contextualised to user's pattern — not fixed at 1 PM).

**Card format:**

```
┌─────────────────────────────────────────────┐
│  What did lunch look like?                  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │        [ camera-icon ]              │    │
│  │        Snap a quick photo           │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  or describe it: ___________________        │
│  ┌──────────┐                               │
│  │ Skip     │                               │
│  └──────────┘                               │
└─────────────────────────────────────────────┘
```

**After photo is taken:**
The photo appears in the feed as a message from the user. The AI responds below it:

```
┌─────────────────────────────────────────────┐
│  [user's photo of dal + rice + salad]       │
│                                  12:48 PM   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ✦ Looks like dal, rice, and a side salad.  │
│  Good protein hit — roughly 14g from the    │
│  dal. You're at ~60% of today's target.     │
│                                             │
│  The salad's great for iron absorption      │
│  if there's any lemon on it.                │
│                                             │
│  [ That's about right ]  [ Not quite → ]    │
└─────────────────────────────────────────────┘
```

**What the AI extracts from a meal photo:**
- Approximate food groups (AI vision model)
- Estimated macros (protein, carbs, fat — ballpark, not precision)
- Nutrient gap relevance (does this meal address the user's detected gaps?)
- Portion size signal (over time, not from a single photo)
- Meal timing (timestamp)

**What it does NOT do:**
- Calorie count (this is not a calorie tracker — calorie counting is antithetical to the clinical-casual tone)
- Exact gram measurement
- Judgement ("that's unhealthy") — only observation and pattern

**Correction flow:** If the AI misreads the photo, "Not quite →" opens a quick correction: text input or tag-select for what was actually eaten. This correction trains the model for this user.

### 4.2 Supplement & medicine tracking

**When it appears:** Based on protocol timing (morning / evening), adjusted to user's actual pattern over time.

**Card format — with supply tracking:**

```
┌─────────────────────────────────────────────┐
│  DIET · morning protocol                    │
│                                             │
│  Iron + Vit C · Be Bodywise                 │
│  ┌────────────────────────────────────┐     │
│  │ ✓ Taken │  Missed  │  Ran out     │     │
│  └────────────────────────────────────┘     │
│                                             │
│  How's the supply?                          │
│  Plenty ○────────●────────○ Almost out      │  ← Slider
│                                             │
│  ~12 days left (based on your estimate)     │
│  [ Set a reminder when it's low ]           │
└─────────────────────────────────────────────┘
```

**Supply intelligence:**
- First time: user slides to estimate supply level. AI calculates approximate days remaining based on dosage.
- Subsequent days: AI auto-decrements the estimate. Asks for re-calibration every 7 days: "Still looking accurate?" with a simple Yes/Adjust.
- When supply hits ~5 days: reorder card surfaces in the feed — not a push notification, not a banner. A conversational card: "Your iron supply is running low. Want me to reorder?"
- "Ran out" response: immediate reorder prompt + AI adjusts protocol expectations ("No iron today — that's fine. Focus on iron-rich foods if you can.").

**Multi-supplement morning:**
If the protocol has 2–3 items, they stack in a single card with individual toggles, not separate cards:

```
┌─────────────────────────────────────────────┐
│  Morning protocol                           │
│                                             │
│  Iron + Vit C        [ ✓ Taken ] [ Missed ] │
│  B12                 [ ✓ Taken ] [ Missed ] │
│  Ashwagandha         [ ✓ Taken ] [ Missed ] │
│                                             │
│  All 3? That's a streak — 6 days running.   │
│                                             │
│  Supply check: anything running low?        │
│  [ All good ] [ Iron is low ] [ Check all ] │
└─────────────────────────────────────────────┘
```

### 4.3 Visual progress — weekly photo tracking

For concern-specific visual tracking (hair, skin, beard, dandruff, pigmentation), the AI prompts a **weekly visual check-in** — not daily (too burdensome) and not monthly (too sparse to show progress).

**When it appears:** Once per week, on a consistent day (user's choice or AI-selected based on engagement patterns). Surfaces as a feed card.

**Hair / scalp concern example:**

```
┌─────────────────────────────────────────────┐
│  WEEKLY CHECK · Hair                        │
│                                             │
│  It's been a week. Let's see how your       │
│  scalp is doing.                            │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │  [ camera-icon ]                      │  │
│  │  Take a scalp photo                   │  │
│  │                                       │  │
│  │  Same angle as last time helps        │  │
│  │  the AI compare accurately.           │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌──────────┐                               │
│  │ Not now  │  (will ask again tomorrow)    │
│  └──────────┘                               │
└─────────────────────────────────────────────┘
```

**After photo is taken — comparison view:**

```
┌─────────────────────────────────────────────┐
│  SCALP PROGRESS · Week 3 → Week 4          │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │  [Week 3     │  │  [Week 4     │        │
│  │   photo]     │  │   photo]     │        │
│  │              │  │              │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  ✦ Slight improvement in coverage near     │
│  the crown area. The new growth is          │
│  consistent with what we'd expect at        │
│  Day 28 of your protocol.                   │
│                                             │
│  72% of users on this protocol see          │
│  visible change between Week 4–6.           │
│  You're on track.                           │
│                                             │
│  [ Save to progress gallery ]               │
└─────────────────────────────────────────────┘
```

**Visual concern types and their prompts:**

| Concern | Photo prompt | Frequency | AI analysis |
|---|---|---|---|
| Hair loss / thinning | Scalp photo (top-down, parting) | Weekly | Coverage density comparison, new growth detection |
| Beard growth | Chin/jawline photo (consistent angle) | Weekly | Density mapping, patchiness reduction |
| Dandruff | Scalp close-up | Weekly | Flake density, redness, dryness assessment |
| Skin pigmentation | Affected area photo | Weekly | Spot size/darkness comparison, evening-out detection |
| Acne | Face photo (consistent lighting) | Weekly | Active lesion count, scarring assessment, inflammation |
| Weight (optional) | Mirror photo or scale photo | Bi-weekly | Subjective: user describes change. AI doesn't comment on appearance. |

**Photo guidance (in-card, not a tutorial):**
- "Same angle as last time" — AI stores the previous photo's metadata and can show a ghost overlay guide
- "Natural light works best" — surfaces only if previous photo was poorly lit
- "Just the area, not your whole face" — for scalp/skin, respects privacy

**What AI does NOT do with visual data:**
- Never comments on attractiveness
- Never says "you look better/worse" — only describes observable, measurable change
- Never shares or stores photos outside the user's profile
- If no visible change, says so honestly: "No visible change this week. That's normal at this stage — most visible change happens between Week 4–6."

### 4.4 Soft conversational nudges

Not every card in the feed is an ask. Some are soft nudges — the AI checking in, making conversation, gathering signal without demanding action.

**Examples:**

```
┌─────────────────────────────────────────────┐
│  Would you be stepping out today?           │
│                                             │
│  ┌────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Yeah   │ │ Maybe    │ │ Nope     │      │
│  └────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────┘
```

If "Yeah": AI might later surface "Since you're out — try walking for 10 minutes after lunch. Sunlight + movement is a two-for-one."

If "Nope": AI notes a sedentary day. No judgement. Might adjust the Lifestyle card: "Indoor stretch for 3 minutes? No equipment, no shoes."

```
┌─────────────────────────────────────────────┐
│  How did you sleep last night?              │
│                                             │
│  Terribly  ○───○───○───○───●  Like a baby  │
│                                             │
└─────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────┐
│  It's 3 PM. Energy check:                   │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Crashing │ │ Meh      │ │ Good     │    │
│  └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────┐
│  Anything on your mind you want to          │
│  get off your chest?                        │
│                                             │
│  [ type here... ]                    [mic]  │
│                                             │
│  ┌──────────┐                               │
│  │ I'm good │                               │
│  └──────────┘                               │
└─────────────────────────────────────────────┘
```

**Nudge rules:**
- Maximum 2 pure nudges per day. The rest of the feed is actionable or insightful.
- Nudges never repeat the same question within 48 hours.
- If a nudge is ignored (no tap, scroll past), AI counts it as "not now" — same as skip. No repeat, no guilt.
- Nudges are the lightest-weight data collection — they feel like conversation, not surveys.
- The AI adapts tone: if the user responds with short taps, nudges stay short. If the user has typed long open-ended responses before, nudges can be slightly more conversational.

### 4.5 Open-ended input (user-initiated)

The user can inject their own message into the feed at any time via the persistent input bar.

**Types of open-ended input and how the AI handles them:**

| User types | AI response in feed |
|---|---|
| "I ate too much at lunch" | Acknowledgement + gentle reframe: "Heavy meals happen. A 10-minute walk in the next hour helps your body process it. Want a reminder?" |
| "My scalp feels dry today" | Tags as hair-concern signal. "Noted. Is it itchy too, or just tight? If it persists this week, we'll adjust your protocol." |
| "Feeling anxious about tomorrow" | Mindspace card surfaces immediately: "That's real. Want to try a 2-minute breathing exercise right now, or just wanted to say it out loud?" |
| "What's ashwagandha actually doing for me?" | Educational card: 3-line science explanation + "Based on your check-ins, your stress reports have dropped 20% since you started. That's the ashwagandha working." |
| "I forgot to take my supplements yesterday" | No judgement. "One missed day doesn't break the curve. Take today's as usual. Your 7-day adherence is still 85%." |
| [photo of a food label] | AI reads the label: "This has 12g protein per serving and 340mg sodium. It fits your diet. The sodium is a bit high if you're having it daily — worth mixing up." |
| [photo of a rash/skin issue] | "I can see some redness. I'm not a doctor and can't diagnose — but I'd recommend showing this to a dermatologist. Want me to book a consult?" + Expert card: Dr. {name}, Dermatologist, ₹499 |
| "Should I try minoxidil?" | "That's a prescription decision — not something I should advise on. Dr. {name} can evaluate your scalp photos and history and tell you if it's right for you." + Expert card |
| "I've been feeling a lump near my throat" | Priority escalation: "Please see a doctor about this. I can help you book one right now." + Expert card with earliest available slot |

**Critical constraint:** Open-ended input is processed by the AI but never diagnosed. Any input that resembles a medical symptom gets an expert CTA alongside the AI's contextual response. The Expert card is the AI's natural escalation path — it's not a dead-end, it's a handoff to someone who can go further.

---

## 5. The Core Loop: Engage → Harvest → Return

Every interaction on the home — whether a tap, a photo, a text, or a slider — runs through the same engine:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   AI surfaces a card (nudge, prompt, reminder, insight)     │
│              ↓                                              │
│   User responds (tap / photo / text / voice / silence)      │
│              ↓                                              │
│   Response IS the data point                                │
│   (no separate logging step)                                │
│              ↓                                              │
│   AI returns value immediately:                             │
│     - Insight ("your protein gap is 40% smaller")           │
│     - Gratification ("6-day streak on morning protocol")    │
│     - Knowledge ("Vit C increases iron absorption by 67%")  │
│     - Connection ("72% of users like you see change now")   │
│     - Acknowledgement ("noted, adjusting tomorrow")         │
│              ↓                                              │
│   User walks away knowing something new about their body    │
│              ↓                                              │
│   AI profile enriches → next card is smarter                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The user never "logs" anything. They never open a tracker. They have a conversation with an AI that happens to be very good at remembering everything and connecting the dots.

---

## 6. Feed Composition — A Day in the Life

### 6.1 Morning feed (6 AM – 10 AM)

| Order | Card | Pillar | Input type |
|---|---|---|---|
| 1 | AI greeting + body-context + soft nudge | Cross-pillar | Tap or text |
| 2 | Morning protocol (supplements) | Diet | Tap (taken/missed/ran out) + supply slider |
| 3 | Breakfast prompt (optional) | Diet | Photo or text |

### 6.2 Midday feed (11 AM – 2 PM)

| Order | Card | Pillar | Input type |
|---|---|---|---|
| 4 | Lunch photo prompt | Diet | Photo or text or skip |
| 5 | Movement nudge (if sedentary day) | Lifestyle | Tap |

### 6.3 Afternoon feed (2 PM – 5 PM)

| Order | Card | Pillar | Input type |
|---|---|---|---|
| 6 | Energy check-in | Cross-pillar | 3-option tap |
| 7 | Mindspace nudge (if stress signals) | Mindspace | Slider or text |

### 6.4 Evening feed (6 PM – 10 PM)

| Order | Card | Pillar | Input type |
|---|---|---|---|
| 8 | Evening protocol (if applicable) | Diet | Tap |
| 9 | Day close: "How did today land?" | Cross-pillar | Slider (1–5) or text |
| 10 | Wind-down insight or body read | Cross-pillar | Read-only or "tell me more" |

### 6.5 Expert cards in the feed

Expert cards are not ads. They surface when the AI reaches the boundary of what it should handle alone. They feel like a natural escalation in the conversation.

| Trigger | Expert card content | Timing |
|---|---|---|
| Visual progress shows no improvement after 4 weeks | "Your photos show the protocol hasn't moved the needle yet. Dr. {name} specialises in exactly this — a 15-min consult could refine your approach." | After Week 4 photo comparison |
| User describes a symptom the AI can't classify | "I want to be careful here. This sounds like something a {specialist} should look at. Here's who I'd recommend:" | Immediately in response |
| User asks about prescription medication | "That's a prescription-level question. Dr. {name} can evaluate and prescribe if appropriate." | Immediately in response |
| Protocol Day 21 with mixed results | "You've been consistent. Some things are improving, some aren't. A doctor can read your full picture and adjust." | Day 21 milestone card |
| Female user + cycle irregularity signals | "Your cycle data over 3 months suggests it's worth a gynaecologist's review." | After 3rd cycle log |
| User reports persistent pain / new symptom | Safety escalation: "Please see a doctor about this. I can help you book one right now." | Immediately, high priority |

**Expert card format:**
- Always includes: doctor name, photo, speciality, rating, consult count, price, duration
- Always includes: "Maybe later" — never blocks the feed
- "Maybe later" is not punitive — card doesn't return for 7 days
- If tapped, expert card expands to show: available slots, what to expect, "the AI will share your context with the doctor (with your permission)"

### 6.6 Weekly specials

| Card | Pillar | Frequency | Input type |
|---|---|---|---|
| Visual progress photo (scalp/skin/beard) | Diet (concern-linked) | Weekly | Photo |
| Supply calibration ("still accurate?") | Diet | Every 7 days per product | Tap or adjust |
| Weekly body read (3-pillar trend) | Cross-pillar | Weekly | Read-only with "ask me about this" |
| Protocol review ("anything not working?") | Diet | Bi-weekly | Text or tap |
| Expert spotlight (if no consult yet) | Cross-pillar | Bi-weekly | Read-only with "Book" CTA |

### 6.7 Card limits

| Rule | Spec |
|---|---|
| Maximum cards per day | 6–8 (fewer on Day 1–3) |
| Maximum photo prompts per day | 2 (1 meal + 1 optional) |
| Maximum nudges per day | 2 |
| Minimum time between cards | 2 hours (unless user-initiated) |
| Cards after 10 PM | Zero. The AI goes quiet. Only user-initiated input accepted. |

---

## 7. Pillar Detail: Diet, Supplements & Medicine

### What this pillar covers
Everything that enters the body: meals, water, supplements, prescribed medicines, micronutrient intake, food timing, food combinations.

### Card types unique to this pillar

| Card type | Input modality | Data harvested |
|---|---|---|
| **Meal photo** | Camera capture + optional text | Food groups, estimated macros, meal timing, portion patterns |
| **Supplement adherence** | Tap (taken/missed/ran out) | Protocol compliance, supply status |
| **Supply tracker** | Slider (plenty → almost out) | Reorder timing, consumption rate |
| **Food label scan** | Camera (via open input) | Nutritional awareness, product choices |
| **Water nudge** | Tap ("drank some" / "nah") | Hydration patterns |
| **Meal timing** | Implicit from photo/text timestamps | Eating rhythm, gap between meals |

### AI response examples

| User action | AI returns |
|---|---|
| Photo of dal + rice | "Roughly 14g protein from that dal. You're at 60% of today's target. A handful of peanuts with evening tea would close the gap." |
| Took iron supplement | "Day 12 of iron. It takes 3–4 weeks for your body to build stores. You're in the accumulation phase — keep going." |
| "Ran out" of B12 | "Reordering now takes 2 days to deliver. Meanwhile, if you eat eggs or dairy today, that covers partial B12. Want me to place the order?" |
| Photo of a packaged snack label | "18g sugar per serving — that's about 4.5 teaspoons. Not terrible occasionally, but your gut does better with lower sugar loads. Your call." |
| Skipped lunch photo 3 days running | AI stops asking for lunch photos. Switches to: "Roughly what did you eat for lunch?" (text-only, lower friction). |

### Supply tracking intelligence

```
Day 1:  User gets supplement. AI asks: "How many capsules in this bottle?"
        User: "60" (or slides to estimate)
        AI calculates: 60 capsules ÷ 2/day = 30 days

Day 7:  "Supply check — still on track?"
        [ Looks right ] [ I've missed a few ] [ Running low ]

Day 22: "About 8 days of iron left. Want to reorder?"
        [ Reorder ] [ Remind me in 3 days ] [ I'll handle it ]

Day 28: "2 days left. Placing reorder so there's no gap."
        (if user opted into auto-reorder)
```

---

## 8. Pillar Detail: Lifestyle

### What this pillar covers
How the body moves and rests through the day: sleep, physical activity, daily routines, rest patterns, movement quality, recovery.

### Card types unique to this pillar

| Card type | Input modality | Data harvested |
|---|---|---|
| **Sleep quality** | 5-point slider | Sleep patterns, trend over time |
| **Movement nudge** | Tap (did it / skipped) or text ("went for a run") | Activity type, frequency, willingness |
| **Stepping out?** | 3-option tap | Daily activity baseline, outdoor exposure |
| **Activity description** | Open text or voice | Exercise type, intensity, user language about movement |
| **Routine check** | Tap or text ("same time today?" / "all over the place") | Routine consistency |

### AI response examples

| User action | AI returns |
|---|---|
| "Yeah, stepping out" | Later: "Since you're out — 10 minutes of walking after lunch is a blood sugar win. Sunlight's a bonus." |
| Sleep slider: 2/5 | "Rough night. Today's programme is lighter. Your magnesium is scheduled for tonight — it helps if you take it 30 min before bed." |
| "I went for a run" (text) | "Nice. How long, roughly? Even a rough guess helps me calibrate your protein needs for the day." |
| Skip movement nudge 5 days straight | AI drops from "walk 10 min" to "stand up and stretch once today." Finds the floor. |
| "Slept like a baby" (text, unprompted) | "Love to hear it. That's 3 good nights this week. Whatever you're doing is working — I'd keep the routine." |

---

## 9. Pillar Detail: Mindspace

### What this pillar covers
The mental and emotional state: stress, mood, cognitive clarity, emotional load, mental habits, inner stillness, self-awareness.

### Card types unique to this pillar

| Card type | Input modality | Data harvested |
|---|---|---|
| **Head loudness** | 5-point slider (quiet → racing) | Stress baseline, daily fluctuation |
| **Mood colour** | 3-option tap (heavy / neutral / light) | Emotional trend |
| **Open vent** | Text or voice ("anything on your mind?") | Stress content, emotional vocabulary |
| **Micro-exercise** | Tap (did it / not now) + optional "how did that feel?" | Engagement with mental exercises, effectiveness |
| **Gratitude / noticing** | Text prompt ("one thing going well?") | Positive pattern recognition |

### Tone rules (critical)

- **Never prescriptive about feelings.** Don't say "You should feel calmer." Say "Users who do this report feeling calmer."
- **Never spiritual.** No "inner peace", no "mindfulness journey", no "be present." Use neuroscience and cohort data.
- **Never guilt-inducing.** Skipping a mindspace card is the most normal thing. The AI notices, adjusts, says nothing.
- **Always body-anchored.** Stress is cortisol. Mood is serotonin and dopamine. Anxiety is amygdala activation. The mind is part of the body.
- **Short actions only.** No action should exceed 5 minutes. Most are 60–120 seconds. The bar to entry must be almost zero.
- **Open-ended is always welcome.** If the user wants to type three paragraphs about their day, the AI reads all of it and responds thoughtfully.

### AI response examples

| User action | AI returns |
|---|---|
| Head loudness: 4/5 | "Loud day. Here's something that takes 90 seconds: close your eyes, breathe in for 4, out for 6. Repeat 5 times. Activates your vagus nerve, which downshifts cortisol." |
| "I'm anxious about tomorrow" (text) | "That's your brain running simulations. Write down the 3 things you're worried about — getting them out of your head and onto a screen reduces the amygdala's grip. Want to try it here?" [text input opens] |
| Mood: "light" for 5 days running | "5 days of light mood. That tracks with your improved sleep this week. Not a coincidence — sleep and serotonin are tightly linked." |
| Skips Mindspace cards for 2 weeks | AI reduces to 1 per week. Format changes from slider to a simpler "Hey. How are you, genuinely?" with text input. Keeps the channel open without being annoying. |

---

## 10. How the Feed Evolves — From Stranger to Living Profile

The feed has no fixed "Day 1" experience. It has a **profile level** experience. Two users on the same calendar day can see completely different feeds — one still in pure profiling mode (L0), another deep in their protocol (L3). The clock doesn't determine the feed. The depth of understanding does.

### The five feed states

```
L0 Stranger ──→ L1 Silhouette ──→ L2 Sketch ──→ L3 Portrait ──→ L4 Living Profile
  (name only)   (concern known)   (basics known)  (full profile)  (behavioural data)
  
  Feed is pure   Feed is part-     First protocol   Three pillars    Deep, predictive,
  conversation.  profile,          possible.        fully active.    ambient profiling
  Listening.     part-content.     One pillar.      All features.    woven in.
```

---

### L0 — Stranger (name + phone only)

**When:** User signed up and skipped all onboarding. Or authenticated via a share link. Zero profile data.

**What the feed shows:**

```
┌─────────────────────────────────────────────┐
│  ○ Hey Vikas. Good to have you here.        │
│                                             │
│  I work best the more I know about you.     │
│  No forms — just a conversation.            │
│                                             │
│  What's the one thing you'd most like       │
│  to fix or improve about your health?       │
│                                             │
│  [ type freely... ]                 [mic]   │
│                                             │
│  or pick the closest:                       │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Hair / beard │  │ Skin / acne  │         │
│  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Energy / gut │  │ Weight       │         │
│  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Hormones     │  │ Sleep / mind │         │
│  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
```

| Rule | Spec |
|---|---|
| Max cards per session | 2 (greeting + one question) |
| Pillar cards | None — no protocol, no recommendations possible yet |
| Product/expert surfaces | None — nothing to anchor a recommendation to |
| Progress indicator | None shown to user. Internal L0 flag. |
| If user doesn't respond to first card | After 24 hours, a second, different framing: "It doesn't have to be a big thing — even 'I'm always tired' is somewhere to start." |
| If user types freely | AI extracts concern, acknowledges it, asks one follow-up. Moves to L1. |
| If user taps a chip | AI follows up with concern-specific sub-question. Moves to L1. |

**What L0 → L1 requires:** Concern category identified (even rough — "hair issues" is enough).

---

### L1 — Silhouette (concern known, sex/age unknown or known)

**When:** User has described a concern. May or may not have sex/age from onboarding.

**What the feed looks like:**

The feed is now 40% profiling questions, 60% concern-relevant content — educational cards, cohort evidence, expert Q&As that are relevant to the identified concern. The user gets value before being asked another question.

```
┌─────────────────────────────────────────────┐
│  ✦ Hair loss at your age is more common     │  ← Value card first (no ask)
│  than people realise. 3 in 10 men under     │
│  35 notice it, and most are dealing with    │
│  the same two root causes: nutrient gaps    │
│  and hormonal shifts.                       │
│                                             │
│  Your situation might be both, one, or      │
│  neither — I need a few more details        │
│  to tell you which.                         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Quick one — how old are you roughly?       │  ← Profiling question
│                                             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐   │
│  │ 18–24 │ │ 25–34 │ │ 35–44 │ │ 45+   │   │
│  └───────┘ └───────┘ └───────┘ └───────┘   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ✦ Here's something useful while I learn   │  ← Another value card
│  more about you:                            │
│                                             │
│  Most hair loss supplements fail because    │
│  they address the symptom (the hair) not    │
│  the cause (usually iron, protein, or DHT). │
│                                             │
│  What's your diet like — do you eat         │  ← Profiling woven into content
│  animal protein, or mostly veg?             │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Veg      │ │ Non-veg  │ │ Vegan    │    │
│  └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘
```

| Rule | Spec |
|---|---|
| Max cards per session | 4 (alternating value + question) |
| Pillar cards | None yet — no protocol |
| Product/expert surfaces | **Explore strip only**: "People with your concern often start with these. Take a look." Browsing, not buying. |
| Profiling questions | Age, sex (if not known), duration of concern, any existing supplements |
| Expert card | Not yet — but "What People Asked" content from Experts tab relevant to concern can appear as read-only cards |

**What L1 → L2 requires:** Sex/age known + diet type + at least one lifestyle signal (sleep or activity).

---

### L2 — Sketch (basics known, protocol can begin)

**When:** AI has enough to generate a preliminary protocol recommendation. The feed shifts from "I'm learning about you" to "here's what I think you should do — let's test it."

**The pivot moment:** This is the first time the feed shows something to act on, not just something to answer.

```
┌─────────────────────────────────────────────┐
│  ✦ Based on what you've told me, here's     │  ← First protocol card
│  where I'd start:                           │
│                                             │
│  You're a 28-year-old male, vegetarian,     │
│  noticing hair thinning for about 6 months. │
│  Protein and iron gaps are the most         │
│  likely culprits — not DHT at your age.     │
│                                             │
│  → Iron + Vitamin C (morning)               │
│  → Biotin + Zinc (evening)                  │
│  → Protein: ~65g/day target                 │
│                                             │
│  Want me to set this up as your protocol?   │
│                                             │
│  ┌─────────────────────┐  ┌──────────────┐  │
│  │ Yes, start here     │  │ Tell me more │  │
│  └─────────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────┘
```

**If "Yes, start here":** Moves to L3. Protocol is set. Feed activates Diet pillar with supplement cards. Product purchase path opens.

**If "Tell me more":** AI explains the reasoning in a follow-up card. Offers to show specific products. Expert card also offered: "If you'd rather talk this through with a doctor first, I can connect you."

| Rule | Spec |
|---|---|
| Max cards per session | 5–6 |
| Pillar cards | Diet only — supplement adherence, one meal question |
| Product/expert surfaces | **First product recommendation + first expert card** (both optional, no pressure) |
| Profiling questions | 1 per session — concern history, existing medications, family history |
| Purchase path | Opens when user accepts protocol |

**What L2 → L3 requires:** Protocol accepted OR at least 3 days of feed interaction.

---

### L3 — Portrait (full feed activated)

**When:** Protocol is in place, or the user has been engaging with the feed for 3+ days regardless of protocol. The AI now has enough to run all three pillars.

This is the state documented in Sections 4–9 of this document — the full feed with supplement tracking, meal photos, lifestyle nudges, Mindspace cards, and the complete action-data-insight loop.

**Additional profiling questions still flow** — but they're now response-triggered, not scheduled:

```
┌─────────────────────────────────────────────┐
│  DIET · morning                             │
│                                             │
│  Iron + Vit C taken? Day 8.                 │
│                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │ Taken  │  │ Missed │  │ Ran out│        │
│  └────────┘  └────────┘  └────────┘        │
└─────────────────────────────────────────────┘

  [user taps "Taken"]

┌─────────────────────────────────────────────┐
│  ✦ Day 8. Consistency is building.          │
│                                             │
│  Side note: has anyone in your family       │  ← Profiling embedded in response
│  dealt with hair loss too?                  │
│                                             │
│  ┌──────────────┐  ┌──────────┐  ┌───────┐ │
│  │ Dad / his    │  │ Mom's    │  │ Not   │ │
│  │ side         │  │ side     │  │ sure  │ │
│  └──────────────┘  └──────────┘  └───────┘ │
└─────────────────────────────────────────────┘
```

| Rule | Spec |
|---|---|
| Daily cards | 6–8 across pillars (see Section 5 for day composition) |
| Pillar cards | All three active |
| Profiling questions | 1 per day max, always attached to a response or insight (never standalone) |
| Product/expert surfaces | Protocol-linked products + contextual expert cards (see Section 5.5) |
| Visual tracking | Starts at Week 2 — photo baseline established, then weekly comparisons |

---

### L4 — Living Profile (14+ days, behavioural data active)

**When:** 14+ days of feed interaction. The AI has behavioural patterns, not just stated facts. It knows what the user does, not just what they said.

The feed is now predictive, not reactive. And profiling becomes ambient — the AI is continuously refining its model from interaction patterns, even when no explicit question is asked.

**What changes at L4:**

| Feature | L3 behaviour | L4 behaviour |
|---|---|---|
| Greeting | References recent data | References predicted state: "You usually feel flat on Mondays. Here's something to counter that." |
| Card timing | Based on stated patterns | Based on observed patterns — AI knows you take supplements at 8:12 AM, sends card at 8:05 |
| Profiling questions | Response-triggered | Ambient — woven into milestone cards, weekly reads, seasonal nudges |
| Protocol suggestions | Based on stated concern | Based on observed response: "Your energy improves 30% more on days you eat before 8 AM. Worth making that consistent?" |
| Expert triggers | Pattern stalls | Predictive: "Based on 6 weeks of data, your scalp photos suggest this is progressing faster than the protocol can address. Dr. Sharma has 15 min at 4 PM." |
| Cross-pillar insights | 2-pillar links | 3-pillar system view: "Your worst weeks correlate to bad sleep + skipped meals + high stress. That's a system problem, not a supplement problem." |

**Profiling never stops at L4 — it deepens:**

```
Week 3:  "Your stress scores spiked this week. Work thing, or just life?"
Week 5:  "You've not mentioned your family history of {concern}. I asked a while back
          but it's still useful — any update?"
Month 2: "When you first came here, {concern} was the priority. Has anything shifted?"
Month 3: "Anything major changed recently? New city, new schedule, new stress?"
Seasonal:"Summers hit differently for scalp health. Noticing more dryness or itch?"
```

These feel like a health companion checking in — because they are. Not a form. Not a reminder. A conversation that remembers where it left off.

---

### Feed state transition summary

```
First session
    ↓
L0: What's your concern? (2 cards, pure conversation)
    ↓ [concern identified]
L1: Concern-relevant content + basic profiling (4 cards/session, alternating value + question)
    ↓ [sex + diet + lifestyle known]
L2: Protocol recommendation card + optional purchase/expert (5–6 cards, one pillar)
    ↓ [protocol accepted OR 3 days of engagement]
L3: Full feed — all 3 pillars, all input modalities, weekly visual tracking (6–8 cards/day)
    ↓ [14+ days of behavioural data]
L4: Predictive feed — ambient profiling, system-level insights, pre-emptive expert triggers
    ↓ [ongoing]
Profile deepens forever. Questions never stop. They just get smarter.
```

**Key principle:** A user who never completes onboarding is not a broken user. They are an L0 user. The feed is their onboarding. It will get them to L3 through conversation — at the user's own pace, with value at every step.

---

## 11. Cross-Pillar Intelligence

The three pillars are not silos. The AI watches for connections and surfaces them.

### Cross-pillar patterns the AI detects

| Pattern observed | Insight surfaced | Feed adjustment |
|---|---|---|
| Post-meal walk done → next-day energy check-in improves | "Your energy is 30% better on days after you walk post-dinner." | Lifestyle card frequency increases |
| Poor sleep → next-day mood drops | "Sleep and mood are linked in your data. Tonight's focus: sleep prep." | Evening feed shifts to sleep-focused |
| Supplement adherence high + diet photos show low protein | "Supplements are on point. But your meals could use more protein — the supplements can't do it alone." | Diet meal prompts become more protein-aware |
| All 3 pillars engaged for 7 straight days | "Full week, all three pillars. Top 12% of users at your stage." | No new ask. Let the user feel it. |
| Mindspace skipped consistently | No judgement. AI makes Mindspace cards shorter and less frequent. Tries different format after 2 weeks. | Silent adaptation |

---

## 12. Gratification Design

Gratification is not gamification. No points, no badges, no leaderboards, no streaks with penalties. Gratification here means: the user feels smarter about their own body after every interaction.

### Gratification types

| Level | Trigger | Example | Feeling |
|---|---|---|---|
| **Micro** | Any single interaction | "Vitamin C increases iron absorption by 67%." | "I didn't know that." |
| **Visual** | Photo comparison (weekly) | Side-by-side scalp photos with AI annotation | "I can actually see the difference." |
| **Pattern** | AI detects a trend | "Your gut check-ins improved the week you started eating earlier." | "My body is making sense to me." |
| **Milestone** | Day 7 / 21 / 90 | "Day 21. 74% of users report visible change here. Your data:" | "I'm on track and I can prove it." |
| **Breakthrough** | Genuine state change | "Your energy baseline has shifted up. 3 weeks ago your average was 2.1/5. Now it's 3.4." | "This is actually working." |

### What gratification is NOT

- Not badges or achievements
- Not streaks with break penalties (streaks are mentioned only as positive observations, never as things that can "break")
- Not comparative rankings
- Not confetti or celebration animations
- Not "great job!" empty praise

It IS: a moment where the user learns something true about their own body that they didn't know before.

---

## 13. Data Architecture — What the Feed Collects

### Explicit data (user-initiated)

| User action | Data captured | Storage key |
|---|---|---|
| Tap response (done/skipped/option) | Action type, pillar, timestamp, response | `action_log` |
| Photo (meal) | Image, timestamp, AI-extracted food groups + macros | `meal_log` |
| Photo (visual progress) | Image, timestamp, concern type, AI comparison | `visual_progress` |
| Supplement tap (taken/missed/ran out) | Product ID, timing, adherence | `protocol_adherence` |
| Supply slider | Product ID, estimated days remaining | `supply_tracker` |
| Slider (sleep/mood/energy/head) | Dimension, value, timestamp | `checkin_log` |
| Open text or voice | Raw text, timestamp, AI-classified intent | `conversation_log` |

### Implicit data (system-observed)

| Signal | How captured | What it feeds |
|---|---|---|
| Card response time | Timestamp delta: card shown → user response | Engagement momentum, card relevance |
| Cards scrolled past without interaction | Viewport intersection + no tap | Skip signal (same weight as explicit skip) |
| Time between home opens | Session log | Re-engagement timing |
| Photo quality / consistency | AI assessment of angle, lighting, framing | Guide prompt calibration ("same angle helps") |
| Input modality preference | Ratio of taps vs text vs photos vs voice | Card format personalisation (more visual vs more text) |
| Time-of-day response patterns | Timestamp clustering on action_log | Optimal card timing per user |
| Correction frequency ("Not quite →" on meal AI) | Correction log | AI accuracy improvement per user |

---

## 14. Experts — Tab 4

### Purpose

Experts is a revenue surface disguised as a care surface. It makes specialist doctors accessible at the moment the user needs them — not through a separate "book a consult" flow buried in settings, but as a first-class tab and as contextual cards in the feed.

### Why Experts earns a tab

| Reason | Detail |
|---|---|
| **Revenue** | Paid consults are the second business outcome (after product purchase). It needs top-level visibility. |
| **Trust** | The ManMatters/Bodywise user already trusts online consults. Making experts visible from Day 1 signals "this isn't just a supplement store." |
| **AI boundary** | The AI needs somewhere to send the user when it hits its limit. Without a visible Experts surface, the AI's "see a doctor" CTA lands nowhere. |
| **Retention** | Users who consult an expert have 3x higher 90-day retention (Mosaic internal data). Experts convert browsers into believers. |

### Experts tab — screen structure

```
┌─────────────────────────────────────────────┐
│  BH logo                   [notif] [avatar] │
├─────────────────────────────────────────────┤
│                                             │
│  Your experts                               │
│  ─────────────────────────────────          │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ FOR YOU · based on your concern     │    │  ← AI-matched specialists
│  │                                     │    │
│  │ ┌─────┐  Dr. Priya Sharma          │    │
│  │ │photo│  Dermatologist · Hair       │    │
│  │ └─────┘  ★ 4.8 · 2,400+ consults   │    │
│  │          Next: Today, 4:30 PM       │    │
│  │          ┌──────────────────┐       │    │
│  │          │ Book · ₹499      │       │    │
│  │          └──────────────────┘       │    │
│  │                                     │    │
│  │ ┌─────┐  Dr. Arun Mehta            │    │
│  │ │photo│  Nutritionist               │    │
│  │ └─────┘  ★ 4.9 · 1,800+ consults   │    │
│  │          Next: Tomorrow, 10 AM      │    │
│  │          ┌──────────────────┐       │    │
│  │          │ Book · ₹399      │       │    │
│  │          └──────────────────┘       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ BROWSE BY SPECIALITY                │    │
│  │                                     │    │
│  │ ┌────────┐ ┌────────┐ ┌────────┐   │    │
│  │ │ Hair   │ │ Skin   │ │ Gut    │   │    │
│  │ └────────┘ └────────┘ └────────┘   │    │
│  │ ┌────────┐ ┌────────┐ ┌────────┐   │    │
│  │ │Hormones│ │Nutrition│ │ Mind   │   │    │
│  │ └────────┘ └────────┘ └────────┘   │    │
│  │ ┌────────┐ ┌────────┐              │    │
│  │ │ Sleep  │ │Fitness │              │    │
│  │ └────────┘ └────────┘              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ WHAT PEOPLE ASKED                   │    │  ← Social proof / content
│  │                                     │    │
│  │ "Is my hair loss reversible?"       │    │
│  │  Answered by Dr. Sharma · 2 min     │    │
│  │                                     │    │
│  │ "Best diet for PCOS?"              │    │
│  │  Answered by Dr. Mehta · 3 min      │    │
│  │                                     │    │
│  │ [ See more questions → ]            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ YOUR CONSULTS                       │    │  ← Past / upcoming
│  │                                     │    │
│  │ Upcoming: Dr. Sharma · Apr 16, 4 PM │    │
│  │ Past: Dr. Mehta · Mar 28 · Summary  │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│  Home    Explore    ✦ Ask    Experts  Insights │
└─────────────────────────────────────────────┘
```

### Expert sections breakdown

| Section | Content | Purpose |
|---|---|---|
| **For You** | AI-matched specialists based on user's concern, protocol, and data | Personalised top-of-page. The user sees doctors who are relevant to THEIR problem. |
| **Browse by Speciality** | Chip grid: Hair, Skin, Gut, Hormones, Nutrition, Mind, Sleep, Fitness | For users who want to explore beyond their primary concern. |
| **What People Asked** | Anonymised Q&A snippets from real consults (curated, not raw) | Social proof. Reduces "what would I even ask?" friction. Demonstrates expert value. |
| **Your Consults** | Upcoming bookings + past consult summaries | Continuity. Past summaries include doctor's notes, prescriptions, and follow-up actions. |

### Expert card on the home feed — trigger rules

Expert cards appear in the home feed at specific moments. They are NOT random promotions.

| Trigger | Expert type surfaced | Card copy |
|---|---|---|
| AI detects symptom beyond its scope | Relevant specialist | "This is worth a doctor's input. Dr. {name} handles exactly this." |
| Visual progress stalls after 4 weeks | Concern-specific specialist | "The protocol is in place but progress has plateaued. A specialist can look deeper." |
| User asks about prescription drugs | Relevant prescriber | "I can't prescribe — but Dr. {name} can evaluate if this is right for you." |
| Day 21 milestone with partial improvement | General practitioner or specialist | "Good progress on energy, but sleep is still rough. Dr. {name} can look at the full picture." |
| User has never booked a consult (Day 14+) | Most relevant to primary concern | Soft: "Have you considered a quick consult? 15 minutes with Dr. {name} could save you weeks of guessing." |
| Post-consult follow-up (Day 7 after consult) | Same doctor | "How are things since your consult with Dr. {name}? Anything to flag for a follow-up?" |

### Expert ← → AI handoff

The AI and Experts are not separate systems. They form a care continuum:

```
User concern
    → AI handles: daily programme, tracking, supplements, nudges, education
    → AI escalates to Expert when:
        • Symptom is medical (diagnosis needed)
        • Progress has stalled (clinical evaluation needed)
        • User asks for prescription
        • User explicitly asks to speak to someone
    → Expert consults:
        • Doctor sees AI-collected context (with user consent)
        • Doctor's notes feed back into AI
        • AI adjusts programme based on doctor's recommendations
    → Post-consult:
        • AI follows up on doctor's advice
        • Prescription products surface in protocol
        • Next consult cadence is AI-managed
```

**The doctor sees what the AI knows.** When a user books a consult, the AI prepares a brief: concern, protocol, adherence, check-in trends, visual progress photos. The doctor doesn't start from zero. This is the key value proposition — and the reason the consult is worth paying for.

### Expert pricing display rules

| Rule | Spec |
|---|---|
| Always show price upfront | "₹499 · 15 min" — never hidden behind a tap |
| Show "Free first consult" if applicable | Highlighted badge on eligible doctors |
| Subscription users get discounts | "₹499 ~~₹699~~ · Protocol member" |
| No "starting from" language | Show the actual price for the specific consult type |
| Post-consult: show follow-up pricing | "Follow-up with Dr. Sharma · ₹299 · 10 min" |

---

## 15. UI Language — Intuitive & Futuristic

The UI must feel like it's from 2028, built today. Not futuristic as in sci-fi — futuristic as in "why don't all apps work like this?" Dead simple on the surface, intelligence underneath.

### 15.1 Design principles

| Principle | What it means in practice |
|---|---|
| **Ambient intelligence** | The app knows things without being told. It notices the time, the weather, the user's patterns, and adjusts. "You usually walk at 6 PM. Heading out?" — this feels futuristic because the app anticipated, not reacted. |
| **Zero-chrome interaction** | Minimize visible UI machinery. No toolbars, no settings icons, no hamburger menus on the feed. The content IS the interface. Cards are the only UI element — they contain their own controls. |
| **Conversational > transactional** | Every interaction reads like a sentence, not a form submission. "Taken" is a word, not a checkbox. "Ran out" is a phrase, not an error state. The UI speaks. |
| **Progressive disclosure by trust** | Day 1 shows 3 cards. Day 30 shows a rich, personalised feed. The user never sees a feature before they're ready for it. The app reveals itself gradually. |
| **The feed breathes** | Cards have generous whitespace. Background peeks through between cards. Nothing is crammed. The scroll feels calm, not busy. |

### 15.2 Micro-interactions that feel alive

| Interaction | Behaviour | Why it feels futuristic |
|---|---|---|
| **Supplement "Taken" tap** | Card compresses smoothly (200ms ease-out), a subtle radial fill sweeps from the tap point in `--bh-teal-light`, and the insight text fades in underneath | The card transforms — it doesn't navigate away. The result lives where the action was. |
| **Meal photo capture** | Camera opens as a smooth sheet from the card itself (not a system camera app). Photo appears in the card boundary with a subtle scale-in (150ms). AI response types in below. | The camera feels like part of the conversation, not a system interrupt. |
| **Slider input (mood/sleep)** | The track has a soft glow at the thumb position. As the user drags, the card's background subtly shifts tone (warmer toward "racing", cooler toward "quiet"). Haptic tick at each stop. | The card reacts to the user's input in real-time. It's alive. |
| **AI response appearing** | Text appears word-by-word (40ms per word, max 800ms total) with a soft opacity fade. Not typewriter — more like ink appearing. | The AI feels like it's thinking and responding, not dumping text. |
| **Expert card arrival** | Card slides in from below the current card stack with a subtle elevation shadow. Slightly different background tint (`--bh-teal-light` 40% opacity). | Expert cards feel distinct from regular AI cards — important but not alarming. |
| **Photo comparison (weekly)** | Two photos slide in side-by-side with a subtle parallax (left photo 50ms before right). AI annotation points fade in after photos settle. | The comparison moment is cinematic. It's the highlight of the week. |
| **Open text input focus** | Input bar lifts above keyboard with a smooth 250ms rise. Feed cards above blur softly (backdrop-filter: blur(4px)). The input feels like it takes centre stage. | When you speak, the app listens — everything else recedes. |
| **Card skip (scroll past)** | Card gently fades to 60% opacity after being visible for 5+ seconds without interaction. Never fully disappears — just quiets down. | The app notices you're not interested. It doesn't nag. |

### 15.3 Visual language

| Element | Spec | Rationale |
|---|---|---|
| **Card backgrounds** | AI cards: `white`, Expert cards: `--bh-teal-light` at 40%, User responses: `--cream` with left-side teal accent bar (3px) | Distinct voices in the conversation — AI, Expert, User — without color overload |
| **Card corners** | 20px border-radius (slightly rounder than IA v1's 16px) | Softer. Friendlier. Modern without being bubbly. |
| **Card shadows** | `0 1px 3px rgba(0,0,0,0.04)` — barely-there | Cards float above background but don't compete with content. Shadows are felt, not seen. |
| **Pillar tags** | Uppercase, 11px, `--text-muted`, letter-spacing 0.5px | Visible but subordinate. The tag is metadata, not the headline. |
| **AI marker** | ✦ glyph in `--bh-teal` preceding AI-generated content | Consistent marker across the app. The user learns to associate ✦ with "AI is speaking." |
| **Feed gaps** | 12px between cards, 24px between time sections | The feed breathes. Cards are distinct units in a conversation. |
| **Glass header** | `backdrop-filter: blur(12px) saturate(150%)`, `background: rgba(250,248,244,0.85)` | Header stays present but doesn't occlude. Content scrolls behind it. |
| **Bottom nav** | Solid `white` background, top border `--border`, active tab: `--bh-teal` fill + label, inactive: `--text-muted` | Grounded. The nav is the floor — stable, clear, unremarkable. |

### 15.4 Transitions between surfaces

| From → To | Transition | Duration |
|---|---|---|
| Feed → Experts tab | Crossfade with shared header (header stays, content morphs) | 200ms ease-in-out |
| Feed → Explore tab | Slide-left (feed exits left, catalog enters right) | 200ms ease-in-out |
| Feed → Profile (header avatar tap) | Bottom sheet rises to 92% of viewport. Feed dims to 40% opacity behind. | 250ms cubic-bezier |
| Card → Expert booking sheet | Bottom sheet rises from the card itself (origin: card position). Card stays visible at top, booking content below. | 250ms cubic-bezier |
| Card → Camera (meal/visual photo) | Camera sheet rises to fullscreen with a 200ms scale-up from the camera icon's position. | 200ms ease-out |
| Any → Ask input (Tab 3 tap) | Input bar slides up from bottom nav position. Feed content shifts up slightly. No full-screen transition. | 150ms ease-out |

### 15.5 Accessibility for futuristic patterns

Every micro-interaction above has a `prefers-reduced-motion` fallback:

| Full motion | Reduced motion |
|---|---|
| Word-by-word AI text reveal | Instant text appearance |
| Card compress + radial fill on "Taken" | Instant state change with teal background |
| Slider glow + background tone shift | Standard slider, no background change |
| Photo parallax comparison | Side-by-side static layout |
| Camera sheet scale-from-icon | Standard bottom sheet rise |
| Card fade on skip | No opacity change |

**Touch targets remain 44x44px minimum.** Futuristic UI does not mean smaller controls.

---

## 16. Relationship to Existing IA Components

### What changes from IA v1

| IA v1 component | v0.3 equivalent | Change |
|---|---|---|
| Home (Tab 1) — static dashboard | Home (Tab 1) — AI conversational feed | Complete redesign. Feed replaces dashboard. |
| AI Companion (Tab 3) — separate chat | Ask (Tab 3) — input shortcut into home feed | No separate chat screen. Home IS the conversation. |
| Insights (Tab 4) | Insights (Tab 5) — shifted right one position | Moved to accommodate Experts tab. Content unchanged. |
| Profile (Tab 5) | Profile — moved to header avatar (top-right) | Frees a tab for Experts. Profile accessed via avatar tap → sheet. |
| No expert surface | Experts (Tab 4) — new tab | Doctor panel, consult booking, Q&A content, consult history. |
| Daily check-in (4 taps, above fold) | Distributed as soft nudges across the day | No single check-in moment. Signal gathered through conversation. |
| Health score delta (above fold) | Absorbed into weekly body read (feed card) | Daily score is noise. Weekly trend is signal. |
| Nutrition insight card (single) | Multiple AI response cards throughout feed | Every interaction generates an insight, not just one card. |
| Health dimensions (6 dials, home) | Moved to Insights tab exclusively | Home is for action. Insights is for measurement. |
| Protocol pills (static list) | Supplement cards with adherence + supply tracking | Interactive, conversational, commerce-aware. |
| Explore strip | Contextual product cards in feed when relevant | Only surfaces when a gap/need is detected, not always. |
| Consult CTA (text link on PDP) | Expert cards in feed + dedicated Experts tab | Consults elevated from footnote to first-class revenue surface. |

### What remains unchanged from IA v1
- Bottom navigation concept (5 tabs, Tab 3 centre position retained)
- Insights content (6 health dimension dials) — now at Tab 5, receives richer data
- Progressive profile build
- Catalog and PDP experience
- All design system tokens, typography, spacing (with minor updates in Section 15.3)
- Accessibility requirements (touch targets, contrast, screen reader, reduced motion)
- Commerce model (protocol, reorder, subscribe at outcome) — now augmented by expert-driven prescriptions

---

## 17. Open Decisions

| # | Decision | Options | Leaning |
|---|---|---|---|
| 1 | Should the feed be truly time-ordered or algorithmically reordered? | Pure chronological (like chat) vs smart-ordered (like social feed) | **Chronological** — it's a conversation, not a feed. Reordering breaks trust. |
| 2 | How does the AI handle photo privacy? | On-device processing only vs cloud (better accuracy) | **Cloud with explicit consent** — on-device can't match accuracy needed. Consent at first photo prompt. |
| 3 | Should meal photo analysis show calorie estimates? | Show calories vs macros only vs food groups only | **Food groups + protein estimate only** — calorie counting is anti-pattern for this product. |
| 4 | Should visual progress photos auto-compare or require user to request? | Auto-compare inline vs "View progress" tap | **Auto-compare inline** — the comparison IS the gratification moment. |
| 5 | Maximum feed history visible on scroll-up? | 7 days / 30 days / unlimited | **7 days on feed, full history in Journal under Profile** — keeps feed fast. |
| 6 | Voice input: transcribe only or also support voice-response from AI? | Text-only responses vs AI voice | **Text-only responses for now** — voice output adds complexity without clear v1 value. |
| 7 | Should Tab 3 ("Ask") be a floating button instead of a nav tab? | Centre nav tab vs floating action button | **Start as tab. If < 10% use, migrate to FAB in v2.** |
| 8 | Expert consult pricing model? | Fixed per consult vs subscription-included vs first-free-then-paid | **First consult free (included in protocol purchase), subsequent paid.** Reduces friction on first booking. |
| 9 | Should experts see AI-collected user data by default or opt-in? | Auto-share with consent banner vs explicit opt-in per consult | **Auto-share with clear consent.** The data handoff IS the value prop — without it, the consult is generic. |
| 10 | Should the "What People Asked" section be real Q&As or editorially curated? | Real anonymised transcripts vs written content | **Editorially curated from real themes.** Raw transcripts are messy; curated content is trustworthy and on-brand. |

---

*Document owner: Product · Derived from: information_architecture_v1.md Section 7*  
*Next step: Wireframe all five feed states — L0 (first conversation), L1 (concern + value), L2 (first protocol card), L3 (full feed, Day 7), L4 (predictive, Day 30)*
