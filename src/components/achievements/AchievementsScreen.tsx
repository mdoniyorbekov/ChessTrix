import { Award, BadgeCheck, Bot, CalendarDays, Check, Crown, Filter, Medal, Search, Shield, Sparkles, Star, Target, Timer, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { achievements, clearRecentUnlocks, getAchievementStates, getRecentUnlocks, recomputeAchievements } from "../../game/platform/achievements";
import { getGames } from "../../game/platform/archive";
import { getProfile, updateProfile } from "../../game/platform/profile";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import "./achievements.css";

export function AchievementsScreen() {
  const [states, setStates] = useState(getAchievementStates);
  const [profile, setProfile] = useState(getProfile);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [show, setShow] = useState("all");
  const [unlockQueue, setUnlockQueue] = useState<string[]>([]);

  useEffect(() => {
    recomputeAchievements(getGames());
    const pullRecent = () => {
      const recent = getRecentUnlocks();
      if (!recent.length) return;
      setUnlockQueue((current) => [...current, ...recent]);
      clearRecentUnlocks();
    };
    pullRecent();
    const update = () => {
      setStates(getAchievementStates());
      setProfile(getProfile());
      pullRecent();
    };
    window.addEventListener("chesstrix:achievements", update);
    window.addEventListener("chesstrix:archive", update);
    window.addEventListener("chesstrix:profile", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("chesstrix:achievements", update);
      window.removeEventListener("chesstrix:archive", update);
      window.removeEventListener("chesstrix:profile", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  useEffect(() => {
    if (!unlockQueue.length) return;
    const timer = window.setTimeout(() => setUnlockQueue((current) => current.slice(1)), 3200);
    return () => window.clearTimeout(timer);
  }, [unlockQueue]);

  const categories = ["All", ...Array.from(new Set(achievements.map((achievement) => achievement.category)))];
  const filtered = useMemo(() => achievements.filter((achievement) => {
    const state = states[achievement.id];
    if (category !== "All" && achievement.category !== category) return false;
    if (show === "earned" && !state.completed) return false;
    if (show === "locked" && state.completed) return false;
    const q = query.trim().toLowerCase();
    return !q || `${achievement.name} ${achievement.description} ${achievement.category}`.toLowerCase().includes(q);
  }), [category, query, show, states]);
  const earned = achievements.filter((achievement) => states[achievement.id]?.completed).length;
  const activeUnlock = achievements.find((achievement) => achievement.id === unlockQueue[0]);

  const toggleFeatured = (id: string) => {
    const next = profile.featuredBadges.includes(id)
      ? profile.featuredBadges.filter((badgeId) => badgeId !== id)
      : [...profile.featuredBadges, id].slice(-3);
    setProfile(updateProfile({ featuredBadges: next }));
  };

  return (
    <div className="achievements-screen">
      <Card className="achievement-hero">
        <div>
          <h2><Award /> Achievements</h2>
          <p>{earned} / {achievements.length} unlocked</p>
        </div>
        <div className="achievement-progress"><span style={{ width: `${(earned / achievements.length) * 100}%` }} /></div>
      </Card>

      <Card className="achievement-toolbar">
        <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search badges..." /></label>
        <label><Filter />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <select value={show} onChange={(event) => setShow(event.target.value)}>
          <option value="all">All</option>
          <option value="earned">Earned</option>
          <option value="locked">Locked</option>
        </select>
      </Card>

      <section className="achievement-grid">
        {filtered.map((achievement) => {
          const state = states[achievement.id];
          const percent = Math.min(100, (state.progress / achievement.target) * 100);
          const Icon = iconFor(achievement.icon);
          const featured = profile.featuredBadges.includes(achievement.id);
          return (
            <Card key={achievement.id} className={`achievement-card achievement-card--${achievement.rarity.toLowerCase()} ${state.completed ? "earned" : "locked"}`}>
              <div className="achievement-icon"><Icon /></div>
              <div>
                <div className="achievement-card__head">
                  <h3>{state.completed ? achievement.name : "Locked Badge"}</h3>
                  <Badge tone={state.completed ? "success" : "muted"}>{achievement.rarity}</Badge>
                </div>
                <p>{achievement.description}</p>
                <div className="achievement-mini-progress"><span style={{ width: `${percent}%` }} /></div>
                <small>{state.progress} / {achievement.target} · Reward +{achievement.xpReward} XP{state.unlockedAt ? ` · ${new Date(state.unlockedAt).toLocaleDateString()}` : ""}</small>
                {state.completed && (
                  <Button variant={featured ? "secondary" : "ghost"} icon={featured ? <Check /> : <Star />} onClick={() => toggleFeatured(achievement.id)}>
                    {featured ? "Featured" : "Feature"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </section>

      {activeUnlock && (
        <Card className="achievement-toast">
          <Award />
          <div>
            <strong>Badge unlocked</strong>
            <span>{activeUnlock.name} · +{activeUnlock.xpReward} XP</span>
          </div>
        </Card>
      )}
    </div>
  );
}

function iconFor(name: string) {
  const map: Record<string, typeof Award> = {
    flag: Star,
    crown: Crown,
    target: Target,
    equal: BadgeCheck,
    gauge: Timer,
    crosshair: Target,
    sparkles: Sparkles,
    bot: Bot,
    shield: Shield,
    swords: Award,
    zap: Zap,
    timer: Timer,
    brain: Sparkles,
    book: Award,
    "book-open": Award,
    search: Search,
    trophy: Trophy,
    medal: Medal,
    calendar: CalendarDays,
    "calendar-days": CalendarDays,
    layers: BadgeCheck,
    award: Award
  };
  return map[name] ?? Award;
}
