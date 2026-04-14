"use client";

import { useState, useCallback, useRef } from "react";
import GreetingCard from "@/components/feed/cards/GreetingCard";
import ConcernCard from "@/components/feed/cards/ConcernCard";
import InsightCard from "@/components/feed/cards/InsightCard";
import ProfilingCard from "@/components/feed/cards/ProfilingCard";
import NudgeCard from "@/components/feed/cards/NudgeCard";
import SupplementCard from "@/components/feed/cards/SupplementCard";
import ExpertCard from "@/components/feed/cards/ExpertCard";
import MealPhotoCard from "@/components/feed/cards/MealPhotoCard";
import SliderCard from "@/components/feed/cards/SliderCard";
import UserMessageCard from "@/components/feed/cards/UserMessageCard";
import FeedInput from "@/components/feed/FeedInput";

/*
 * Profile levels from home_post_login_v1.md Section 3.2:
 *   L0 Stranger  → name + phone only
 *   L1 Silhouette → concern known
 *   L2 Sketch    → basics known, protocol can begin
 *   L3 Portrait  → full feed activated
 */

type ProfileLevel = "L0" | "L1" | "L2" | "L3";

interface UserProfile {
  concern: string;
  sex: string;
  age: string;
  diet: string;
  sleep: string;
}

// Concern-specific insight content
const concernInsights: Record<string, { content: string; followUp: string }> = {
  "Hair / beard": {
    content: "Hair concerns at your age are more common than people realise. About 40% of men under 35 notice thinning — and most are dealing with the same two root causes: nutrient gaps and hormonal shifts.",
    followUp: "Your situation might be both, one, or neither — I need a few more details to tell you which.",
  },
  "Skin / acne": {
    content: "Skin issues are rarely just skin-deep. They\u2019re usually connected to gut health, hormones, or nutrient gaps. 60% of acne cases in adults are linked to at least one internal factor.",
    followUp: "A few quick questions will help me understand what\u2019s driving yours.",
  },
  "Energy / gut": {
    content: "Low energy and gut issues often travel together. When your gut isn\u2019t absorbing nutrients well, your energy tanks — it\u2019s one of the first signals.",
    followUp: "Let me understand your baseline so I can pinpoint what\u2019s off.",
  },
  "Weight": {
    content: "Weight management is less about willpower and more about what your body is actually doing with the food you eat. Metabolism, sleep, stress — they all play a role.",
    followUp: "I\u2019ll need to understand your daily patterns to suggest something that actually sticks.",
  },
  "Hormones": {
    content: "Hormonal balance affects everything — energy, mood, weight, skin, sleep. It\u2019s the control system your body runs on, and small shifts make big differences.",
    followUp: "A few basics about you will help me figure out where the imbalance might be.",
  },
  "Sleep / mind": {
    content: "Sleep and mental clarity are deeply linked. Poor sleep raises cortisol, which clouds thinking, which raises stress, which disrupts sleep. Breaking the cycle starts with understanding which link is weakest.",
    followUp: "Let me ask a few things to find your entry point.",
  },
};

// Protocol suggestions per concern
const protocolSuggestions: Record<string, { supplements: { name: string; brand: string; timing: string }[]; reasoning: string }> = {
  "Hair / beard": {
    supplements: [
      { name: "Iron + Vitamin C", brand: "Be Bodywise", timing: "Morning" },
      { name: "Biotin + Zinc", brand: "Man Matters", timing: "Evening" },
    ],
    reasoning: "Based on what you\u2019ve told me, iron and biotin gaps are the most likely culprits. This protocol addresses both — iron for follicle strength, biotin for growth cycle support.",
  },
  "Skin / acne": {
    supplements: [
      { name: "Zinc + Vitamin A", brand: "Be Bodywise", timing: "Morning" },
      { name: "Probiotics", brand: "Root Labs", timing: "Before lunch" },
    ],
    reasoning: "Zinc reduces inflammation, vitamin A regulates oil production, and probiotics address the gut-skin axis. This covers the three most common internal drivers of adult acne.",
  },
  "Energy / gut": {
    supplements: [
      { name: "B12 + Iron", brand: "Be Bodywise", timing: "Morning" },
      { name: "Digestive Enzymes", brand: "Root Labs", timing: "With meals" },
    ],
    reasoning: "B12 and iron are your energy foundations — especially if you\u2019re vegetarian. Digestive enzymes help your gut actually absorb what you eat.",
  },
  "Weight": {
    supplements: [
      { name: "Protein Powder", brand: "OWN", timing: "Post-workout / morning" },
      { name: "Green Tea Extract", brand: "Root Labs", timing: "Before lunch" },
    ],
    reasoning: "Protein keeps you full and preserves muscle while losing fat. Green tea extract supports metabolism without jitters.",
  },
  "Hormones": {
    supplements: [
      { name: "Ashwagandha", brand: "Root Labs", timing: "Morning" },
      { name: "Omega-3 + D3", brand: "Be Bodywise", timing: "With lunch" },
    ],
    reasoning: "Ashwagandha helps regulate cortisol, which is the master switch for hormonal balance. Omega-3 and D3 support the pathways that produce and regulate hormones.",
  },
  "Sleep / mind": {
    supplements: [
      { name: "Magnesium B6", brand: "Root Labs", timing: "30 min before bed" },
      { name: "Ashwagandha", brand: "Root Labs", timing: "Evening" },
    ],
    reasoning: "Magnesium relaxes muscles and activates the parasympathetic nervous system. Ashwagandha reduces cortisol so your brain can actually wind down.",
  },
};

export default function HomePage() {
  const [level, setLevel] = useState<ProfileLevel>("L0");
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [userMessages, setUserMessages] = useState<string[]>([]);
  const [protocolAccepted, setProtocolAccepted] = useState(false);

  const name = "Vikas"; // From auth — would come from user context in production
  const feedRef = useRef<HTMLDivElement>(null);

  /** Scroll to the next feed card after single-select */
  const scrollToCard = useCallback((cardId: string) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(cardId);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
    });
  }, []);

  const handleConcernSelect = useCallback((concern: string) => {
    setProfile((p) => ({ ...p, concern }));
    setLevel("L1");
    scrollToCard("card-insight");
  }, [scrollToCard]);

  const handleConcernText = useCallback((text: string) => {
    setUserMessages((m) => [...m, text]);
    const lower = text.toLowerCase();
    let matched = "Energy / gut";
    if (lower.includes("hair") || lower.includes("bald") || lower.includes("beard")) matched = "Hair / beard";
    else if (lower.includes("skin") || lower.includes("acne") || lower.includes("pimple")) matched = "Skin / acne";
    else if (lower.includes("weight") || lower.includes("fat") || lower.includes("thin")) matched = "Weight";
    else if (lower.includes("hormone") || lower.includes("pcos") || lower.includes("period")) matched = "Hormones";
    else if (lower.includes("sleep") || lower.includes("stress") || lower.includes("anxiety") || lower.includes("mind")) matched = "Sleep / mind";
    setProfile((p) => ({ ...p, concern: matched }));
    setLevel("L1");
    scrollToCard("card-insight");
  }, [scrollToCard]);

  const handleSexSelect = useCallback((sex: string) => {
    setProfile((p) => ({ ...p, sex }));
    scrollToCard("card-age");
  }, [scrollToCard]);

  const handleAgeSelect = useCallback((age: string) => {
    setProfile((p) => ({ ...p, age }));
    scrollToCard("card-diet");
  }, [scrollToCard]);

  const handleDietSelect = useCallback((diet: string) => {
    setProfile((p) => ({ ...p, diet }));
    setLevel("L2");
    scrollToCard("card-protocol");
  }, [scrollToCard]);

  const handleAcceptProtocol = useCallback(() => {
    setProtocolAccepted(true);
    setLevel("L3");
  }, []);

  const handleFeedInput = useCallback((message: string) => {
    setUserMessages((m) => [...m, message]);
  }, []);

  const concern = profile.concern || "";
  const insight = concernInsights[concern];
  const protocol = protocolSuggestions[concern];

  return (
    <div className="px-4 py-4">
      {/* Feed — cards stacked vertically */}
      <div className="flex flex-col gap-3">

        {/* ============================================ */}
        {/* L0: Stranger — greeting + concern question   */}
        {/* ============================================ */}
        <GreetingCard
          name={name}
          contextLine="I work best the more I know about you. No forms — just a conversation."
        />
        <ConcernCard onSelect={handleConcernSelect} onTextSubmit={handleConcernText} />

        {/* Show user's typed message if they used free text */}
        {userMessages.length > 0 && level !== "L0" && (
          <UserMessageCard message={userMessages[0]} />
        )}

        {/* ============================================ */}
        {/* L1: Silhouette — insight + profiling          */}
        {/* ============================================ */}
        {level !== "L0" && insight && (
          <>
            <div id="card-insight">
              <InsightCard
                content={insight.content}
                followUp={insight.followUp}
                delay={150}
              />
            </div>

            {!profile.sex && (
              <ProfilingCard
                question="Quick one — are you male, female, or prefer not to say?"
                reason="This helps me calibrate recommendations accurately."
                options={[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                  { label: "Prefer not to say", value: "undisclosed" },
                ]}
                onSelect={handleSexSelect}
                onSkip={() => handleSexSelect("undisclosed")}
                delay={300}
              />
            )}

            {profile.sex && !profile.age && (
              <div id="card-age"><ProfilingCard
                question="And roughly how old are you?"
                reason="This helps me calibrate recommendations for your life stage."
                options={[
                  { label: "18\u201324", value: "18-24" },
                  { label: "25\u201334", value: "25-34" },
                  { label: "35\u201344", value: "35-44" },
                  { label: "45+", value: "45+" },
                ]}
                onSelect={handleAgeSelect}
                onSkip={() => handleAgeSelect("unknown")}
                delay={200}
              /></div>
            )}

            {profile.sex && profile.age && !profile.diet && (
              <div id="card-diet"><ProfilingCard
                question="What does your diet look like mostly?"
                reason="Diet type directly affects which nutrients you might be missing."
                options={[
                  { label: "Vegetarian", value: "veg" },
                  { label: "Non-veg", value: "non-veg" },
                  { label: "Vegan", value: "vegan" },
                  { label: "Eggetarian", value: "egg" },
                ]}
                onSelect={handleDietSelect}
                onSkip={() => handleDietSelect("unknown")}
                layout="grid"
                delay={200}
              /></div>
            )}
          </>
        )}

        {/* ============================================ */}
        {/* L2: Sketch — protocol recommendation          */}
        {/* ============================================ */}
        {level === "L2" && protocol && (
          <>
            <div id="card-protocol"><InsightCard
              content={protocol.reasoning}
              pillarTag="Your protocol"
              delay={200}
            >
              <div className="space-y-2 mt-2">
                {protocol.supplements.map((s) => (
                  <div key={s.name} className="flex items-center justify-between py-2 px-3 bg-surface-container-low rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-on-surface">{s.name}</p>
                      <p className="text-xs text-on-surface-variant/50">{s.brand} &middot; {s.timing}</p>
                    </div>
                  </div>
                ))}
              </div>
            </InsightCard></div>

            <div className="flex gap-2 px-1">
              <button
                onClick={handleAcceptProtocol}
                className="flex-1 py-3 rounded-xl bg-primary-container text-sm font-semibold text-on-primary-container cursor-pointer hover:bg-primary transition-colors duration-200"
              >
                Yes, start here
              </button>
              <button className="px-5 py-3 rounded-xl bg-surface-container-low text-sm font-medium text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors duration-200">
                Tell me more
              </button>
            </div>
          </>
        )}

        {/* ============================================ */}
        {/* L3: Portrait — full feed activated             */}
        {/* ============================================ */}
        {level === "L3" && protocolAccepted && protocol && (
          <>
            <InsightCard
              content="Protocol set. I\u2019ll remind you each morning and evening. Let\u2019s start building data on how your body responds."
              delay={100}
            />

            <SupplementCard
              supplements={protocol.supplements}
              dayCount={1}
              onAction={() => {}}
              delay={200}
            />

            <NudgeCard
              question="Would you be stepping out today?"
              pillarTag="Lifestyle"
              options={[
                { label: "Yeah", value: "yes" },
                { label: "Maybe", value: "maybe" },
                { label: "Nah, home", value: "no" },
              ]}
              onSelect={() => {}}
              delay={300}
            />

            <SliderCard
              question="How did you sleep last night?"
              pillarTag="Lifestyle"
              leftLabel="Terribly"
              rightLabel="Like a baby"
              onSelect={() => {}}
              delay={400}
            />

            <MealPhotoCard
              mealType="Lunch"
              onPhotoTap={() => {}}
              onTextSubmit={() => {}}
              delay={500}
            />

            <SliderCard
              question="On a scale of 1 to 5, how loud is your head right now?"
              pillarTag="Mindspace"
              leftLabel="Quiet"
              rightLabel="Racing"
              onSelect={() => {}}
              delay={600}
            />

            <ExpertCard
              reason="Since you\u2019re just getting started, a quick 15-min consult with a specialist can help validate your protocol and catch anything the AI might miss."
              doctorName="Dr. Priya Sharma"
              specialty="Dermatologist \u00b7 Hair specialist"
              rating={4.8}
              consultCount="2,400+"
              price={499}
              duration="15 min"
              nextSlot="Today, 4:30 PM"
              delay={700}
            />
          </>
        )}
      </div>

      {/* Persistent input bar */}
      <FeedInput onSend={handleFeedInput} />
    </div>
  );
}
