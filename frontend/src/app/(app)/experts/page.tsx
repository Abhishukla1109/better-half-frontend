import { Star, Clock, CalendarDays, FileText } from "lucide-react";

const forYouDoctors = [
  {
    name: "Dr. Priya Sharma",
    initials: "PS",
    specialty: "Dermatologist \u00b7 Hair specialist",
    rating: 4.8,
    consults: "2,400+",
    nextSlot: "Today, 4:30 PM",
    price: 499,
  },
  {
    name: "Dr. Arun Mehta",
    initials: "AM",
    specialty: "Nutritionist",
    rating: 4.9,
    consults: "1,800+",
    nextSlot: "Tomorrow, 10 AM",
    price: 399,
  },
  {
    name: "Dr. Kavya Iyer",
    initials: "KI",
    specialty: "Gynaecologist \u00b7 Hormones",
    rating: 4.7,
    consults: "3,100+",
    nextSlot: "Today, 6:00 PM",
    price: 599,
  },
];

const specialties = [
  "Hair", "Skin", "Gut", "Hormones", "Nutrition", "Mind", "Sleep", "Fitness",
];

const questions = [
  { q: "Is my hair loss reversible?", doctor: "Dr. Sharma", duration: "2 min read" },
  { q: "Best diet for PCOS?", doctor: "Dr. Mehta", duration: "3 min read" },
  { q: "Why am I always tired after lunch?", doctor: "Dr. Mehta", duration: "2 min read" },
];

export default function ExpertsPage() {
  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-xl font-extrabold text-primary font-[family-name:var(--font-manrope)] tracking-tight">
        Your experts
      </h1>
      <p className="text-sm text-on-surface-variant mt-1">
        Matched to your profile and concern.
      </p>

      {/* For You — AI-matched */}
      <section className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-3">
          For you &middot; based on your concern
        </p>
        <div className="space-y-3">
          {forYouDoctors.map((doc) => (
            <div key={doc.name} className="feed-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-fixed/20 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-primary-container">{doc.initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface">{doc.name}</p>
                  <p className="text-xs text-on-surface-variant">{doc.specialty}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                      <Star className="w-3 h-3 text-tertiary-container fill-tertiary-container" />
                      {doc.rating}
                    </span>
                    <span className="text-xs text-on-surface-variant/50">{doc.consults} consults</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-on-surface-variant/50" strokeWidth={1.5} />
                    <span className="text-xs text-on-surface-variant">Next: {doc.nextSlot}</span>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-xl bg-primary-container text-xs font-semibold text-white cursor-pointer hover:bg-primary transition-colors duration-200 shrink-0">
                  &#8377;{doc.price}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Browse by Speciality */}
      <section className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-3">
          Browse by speciality
        </p>
        <div className="grid grid-cols-4 gap-2">
          {specialties.map((s) => (
            <button
              key={s}
              className="py-3 rounded-xl bg-surface-container-low border border-outline-variant/10 text-xs font-semibold text-on-surface hover:bg-primary-fixed/15 hover:border-primary-container/20 cursor-pointer transition-colors duration-200"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* What People Asked */}
      <section className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-3">
          What people asked
        </p>
        <div className="space-y-2">
          {questions.map(({ q, doctor, duration }) => (
            <button
              key={q}
              className="w-full text-left feed-card p-4 cursor-pointer hover:bg-surface-container-low transition-colors duration-200"
            >
              <p className="text-sm font-medium text-on-surface">&ldquo;{q}&rdquo;</p>
              <p className="text-xs text-on-surface-variant/50 mt-1">
                Answered by {doctor} &middot; {duration}
              </p>
            </button>
          ))}
        </div>
      </section>
      {/* Your Consults */}
      <section className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 mb-3">
          Your consults
        </p>
        <div className="space-y-2">
          {/* Upcoming */}
          <div className="feed-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/20 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-primary-container" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-container">Upcoming</p>
                <p className="text-sm font-medium text-on-surface mt-0.5">Dr. Priya Sharma</p>
                <p className="text-xs text-on-surface-variant">Apr 16, 4:00 PM &middot; 15 min</p>
              </div>
              <button className="px-3 py-2 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors">
                Reschedule
              </button>
            </div>
          </div>

          {/* Past */}
          <div className="feed-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-on-surface-variant/50" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-on-surface-variant/50">Mar 28, 2026</p>
                <p className="text-sm font-medium text-on-surface mt-0.5">Dr. Arun Mehta</p>
                <p className="text-xs text-on-surface-variant">Nutrition review &middot; Summary available</p>
              </div>
              <button className="px-3 py-2 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors">
                View
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
