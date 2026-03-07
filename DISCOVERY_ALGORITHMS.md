# Fictionry — Discovery, Ranking & Engagement Reference

> A dictionary of every algorithm, metric, formula, and scoring system.
> Terms are defined once and cross-referenced. Field names are shown in `[brackets]`.
> Last updated: 2026-03-08

---

## Table of Contents

1. [Term Definitions](#1-term-definitions)
2. [Rating System](#2-rating-system)
3. [Engagement Metrics](#3-engagement-metrics)
4. [Discovery Surface Scores](#4-discovery-surface-scores)
5. [Personalization](#5-personalization)
6. [Community Picks](#6-community-picks)
7. [XP & Tiers](#7-xp--tiers)
8. [Achievements](#8-achievements)
9. [Key Thresholds & Config](#9-key-thresholds--config)
10. [File & Function Map](#10-file--function-map)

---

## 1. Term Definitions

These terms are used across multiple formulas. Defined here once.

---

### Velocity
**What it measures:** How fast a story is accelerating in engagement — not just raw activity, but whether this week is better than last week.

**How it's computed:**
```
recent_activity  = 0.40 × [starts_7d] + 0.35 × [library_adds_7d] + 0.25 × [chapter_reads_7d]
previous_activity = 0.40 × [starts_prev_7d] + 0.35 × [library_adds_prev_7d] + 0.25 × [chapter_reads_prev_7d]

Velocity = (recent_activity / max(previous_activity, 10)) × log(1 + recent_activity)
```
- `[starts_7d]` = unique readers who started the story (opened chapter 1) in the last 7 days
- `[starts_prev_7d]` = same for the prior 7-day window (days 8–14)
- `[library_adds_7d]` = follows/library adds in the last 7 days
- `[chapter_reads_7d]` = chapter reads in the last 7 days
- The floor of 10 on the denominator prevents division-by-zero for cold-start stories
- The log term ensures raw volume still matters (a story accelerating from 10→20 scores differently than 1,000→2,000)
- Stored in `[story_engagement_stats.velocity]`

**Used in:** Rising Stars (50% weight), Trending (45% weight)

---

### ER_1_3 (Early Retention)
**What it measures:** The percentage of readers who reach chapter 3 out of those who started chapter 1. This is the primary hook signal — does the story retain readers past the opening?

```
ER_1_3 = [readers_reaching_chapter_3] / [readers_starting_chapter_1]
```
- Stored in `[story_engagement_stats.er_1_3]`
- Reliability-weighted before use: `R(ER) = min(1, log(1 + n) / log(1 + N₀))` where n = qualified starts and N₀ = MIN_STARTS_RISING (see §9)

**Used in:** Rising Stars (10% weight), Trending (15% weight), Satisfaction Score (25% weight)

---

### LAR (Library Add Rate)
**What it measures:** The fraction of readers who add a story to their library after encountering it. A strong signal of intentional, sustained interest rather than passive browsing.

```
LAR = [library_adds] / [impressions]
```
- `[impressions]` = number of times a story card was shown to a unique user
- Tracked via the impression logging system (`/api/impressions`)
- Stored in `[story_engagement_stats.lar_total]` (raw count form; rate computed on query)
- Reliability-weighted before use: `R(LAR) = min(1, log(1 + n) / log(1 + N₀))`

**Used in:** Rising Stars (30% weight), Satisfaction Score (10% weight)

---

### Hide Rate
**What it measures:** The fraction of impressions that resulted in a reader explicitly hiding the story. A quality/relevance signal — isolated hides don't matter, but patterns indicate misleading content or poor fit.

```
hide_rate = [hides_30d] / [impressions_30d]   (rolling 30-day window, min 200 impressions)

If hide_rate > 0.05 (5% threshold):
  hide_penalty = clamp((hide_rate - 0.05) × 10, 0, 0.5)
```
- Only applies when `[impressions_30d]` ≥ 200 (avoids penalising stories with too little data)
- Maximum penalty is 0.5 (halves the effective score)
- Stored in `[story_engagement_stats.hide_rate]`

**Used in:** All discovery surfaces as a subtracted penalty

---

### Rating Signal (Bayesian Rating)
**What it measures:** A credibility-adjusted quality score that shrinks uncertain ratings toward a genre prior, preventing small samples from dominating rankings.

```
Bayesian rating = ([BAYESIAN_M] × C + n × weighted_avg) / ([BAYESIAN_M] + n)

where:
  C = genre prior (default 4.15 if no genre-specific prior)  [BAYESIAN_C]
  n = total credibility-weighted rating count  [stories.rating_count]
  weighted_avg = sum of (rating × credibility_weight) / sum of credibility_weights
  [BAYESIAN_M] = 20  (prior strength — equivalent to 20 "baseline" ratings)
```
- Conservative lower bound: `[bayesian_rating_lower] = bayesian_rating − 1.65 × stddev / √n`  (used for tie-breaking in Top lists)
- Stored in `[stories.bayesian_rating]` and `[stories.bayesian_rating_lower]`

**Each individual rating's credibility weight** is assigned at submission time based on how much of the story the rater has read (see §2).

**Used in:** Rising Stars (10% weight), Trending (10% weight), Best Match For You (20% weight), Top surfaces (45% weight)

---

### Rating Momentum
**What it measures:** Whether recent ratings are trending higher or lower than the story's lifetime average. Rewards stories that are improving; penalises those declining.

```
recent_avg = credibility-weighted mean of ratings from [last 30 days] OR [last 20 ratings], whichever is more recent
rating_momentum = recent_avg − [lifetime_weighted_avg]

MomentumBoost = clamp(rating_momentum × 0.5, −0.2, +0.2)
```
- Influence is capped at ±0.2 to prevent a short burst of reviews from dominating

**Used in:** Trending (10% weight, applied as MomentumBoost)

---

### Freshness
**What it measures:** How recently a story was updated (new chapter published). Decays over two weeks.

```
Freshness = 1 / (1 + [days_since_last_chapter] / 14)
```
- A story updated today scores 1.0; one updated 14 days ago scores ~0.5; one updated 28 days ago scores ~0.33

**Used in:** Trending (20% weight)

---

### Completion Rate (CR)
**What it measures:** For complete works — the fraction of qualified starts that reach the final chapter. For serials — the fraction that have caught up to the latest chapter.

```
CR (complete works) = [readers_completing_final_chapter] / [qualified_starts]
CR (serial)         = [readers_at_latest_chapter] / [qualified_starts]
```
- `[qualified_starts]` = readers who read at least chapter 1

**Used in:** Top surfaces (20% weight), Complete works surface (30% weight)

---

### Exposure Debt
**What it measures:** How under-exposed a story is relative to its age. Ensures new and underserved stories get a minimum visibility floor before being judged purely on engagement metrics.

```
expected_impressions = [age_days] × 50   ([DAILY_EXPECTED_IMPRESSIONS])
exposure_debt = max(0, expected_impressions − [actual_impressions])
```
- A story with high exposure debt gets priority in exploration slots (a reserved portion of each surface, separate from the main ranking)
- Tracked in `[story_engagement_stats.exposure_debt]`

---

### Satisfaction Score (SS)
**What it measures:** A composite reader satisfaction signal combining five quality indicators. Used as an input to Top surfaces and as a cross-check on Rising/Trending.

```
SS = 0.30 × normalise([RatingSignal])
   + 0.25 × normalise([ER_1_3])
   + 0.20 × normalise([return_rate_7d])   (readers returning to read a subsequent chapter)
   + 0.15 × normalise([CR])
   + 0.10 × normalise([LAR])
```
- Each component normalised to 0–1 across the eligible story pool
- Requires minimum [MIN_STARTS_SS] = 50 qualified starts

---

## 2. Rating System

### Rating Eligibility
A user must meet **at least one** of the following to rate a story:
```
chapters_read ≥ 3
OR words_read_unique ≥ 6,000
OR words_read_unique ≥ clamp(0.35 × [stories.word_count], 1,500, 12,000)
```
- `[words_read_unique]` = total unique words read across distinct chapters of the story
- File: `src/app/api/ratings/route.ts`

To leave a **written review** (stricter):
```
chapters_read ≥ 5
OR words_read_unique ≥ 20,000
OR words_read_unique ≥ clamp(0.50 × [stories.word_count], 5,000, 25,000)
```

### Credibility Weight
Applied at submission time. Multiplies the impact of the rating in all weighted averages.

```
pct = [chapters_read] / [stories.chapter_count]

credibility_weight =
  1.3   if pct ≥ 0.90
  1.2   if pct ≥ 0.60 OR chapters_read ≥ 25
  1.1   if pct ≥ 0.25 OR chapters_read ≥ 10
  1.0   otherwise
```
- Stored in `[story_ratings.credibility_weight]`

### Sentiment Labels
Sentiment and confidence are derived from the Bayesian-adjusted rating and total rating count.

**Confidence levels** (based on `[stories.rating_count]`):

| Confidence | Condition |
|---|---|
| `not_yet_rated` | 0 ratings |
| `early_feedback` | 1–9 ratings (`< MIN_DISPLAY_RATINGS`) |
| `forming` | 10–49 ratings |
| `established` | ≥ 50 ratings (`ESTABLISHED_RATINGS`) |

**Sentiment labels** (based on `[stories.bayesian_rating]`, only shown at `forming` or above):

| Label | Bayesian Rating Range |
|---|---|
| `excellent` | ≥ 4.60 |
| `very_good` | 4.30–4.59 |
| `positive` | 3.90–4.29 |
| `mixed` | Below 3.90 with split distribution |
| `divisive` | High variance across ratings |
| `cool_reception` | Below 3.90 with consistent low ratings |

- Stored in `[stories.rating_sentiment]` and `[stories.rating_confidence]`
- Display component: `src/components/story/story-card.tsx`

---

## 3. Engagement Metrics

All metrics below are computed and stored in the `story_engagement_stats` table, refreshed on a schedule.

| Field | Definition |
|---|---|
| `[velocity]` | Engagement acceleration score — see §1 |
| `[er_1_3]` | Chapter 3 retention rate — see §1 |
| `[lar_total]` | Library add rate — see §1 |
| `[hide_rate]` | Hide penalty signal — see §1 |
| `[completion_rate]` | Finish/catch-up rate — see §1 |
| `[exposure_debt]` | Visibility shortfall — see §1 |
| `[return_rate_7d]` | Fraction of chapter-1 readers who return within 7 days for another chapter |

Denormalised counters maintained by DB triggers (no query joins needed):
- `[stories.total_views]` — cumulative chapter views
- `[stories.follower_count]` — library follows
- `[stories.chapter_count]` — published chapters
- `[stories.rating_count]` — submitted ratings
- `[chapters.likes]` — chapter-level likes

---

## 4. Discovery Surface Scores

All scores are computed in Supabase DB functions and exposed via RPC. The daily snapshot is stored in `[story_rankings]` (columns: `snapshot_date`, `page_slug`, `genre`, `rank`, `score`, `story_id`).

---

### Breaking Out
**Who qualifies:** Stories aged 7–90 days (`RISING_AGE_MIN`/`RISING_AGE_MAX`) with at least `MIN_STARTS_RISING` = 100 qualified starts and `MIN_IMPRESSIONS_RISING` = 2,000 impressions.

**Score formula (when engagement stats available):**
```
score = 0.50 × [velocity]
      + 0.30 × reliability_weight([lar_total]) × [lar_total]
      + 0.10 × [er_1_3]
      + 0.10 × ([bayesian_rating] / 5.0)
      − [hide_penalty]
```

**Fallback (insufficient data):**
```
score = [follower_count] / max([age_days], 1)
```

DB function: `get_rising_in_genre` (per genre), `get_cross_genre_rising` (cross-genre)
Pages: `/rising-stars`, `/breaking-out` (both read from `story_rankings` snapshot, `page_slug = 'rising-stars'`)

**Cross-genre composition:** Up to `GENRE_CAP` = 5 stories per genre, interleaved to fill `CROSS_GENRE_TOTAL_SLOTS` = 30 slots. At least `GENRE_FLOOR` = 2 genres must be represented.

---

### Trending This Week
**Who qualifies:** Stories with at least `MIN_STARTS_TRENDING` = 50 starts and `MIN_IMPRESSIONS_TRENDING` = 1,000 impressions in the last 7 days. No age ceiling.

**Score formula:**
```
score = 0.45 × [velocity]
      + 0.20 × Freshness([days_since_last_chapter])
      + 0.15 × [er_1_3]
      + 0.10 × ([bayesian_rating] / 5.0)
      + 0.10 × MomentumBoost([rating_momentum])
      − [hide_penalty]
```
- `Freshness` and `MomentumBoost` defined in §1

DB function: `get_trending_in_genre`

---

### Top / Most Popular
**Score formula:**
```
score = 0.45 × [bayesian_rating_lower]     (conservative quality bound)
      + 0.20 × reliability_weight([long_retention])
      + 0.20 × reliability_weight([completion_rate])
      + 0.15 × reliability_weight([lar_total])
      − [hide_penalty]
```
- `[long_retention]` = fraction of readers who read past chapter 10
- Page `/most-followed` uses raw `[follower_count]` instead of this score

DB function: `get_cross_genre_rising` (also powers `/popular`)
Snapshot: `story_rankings` table, queried by pages

---

### Browse Page Sort Options
File: `src/app/browse/page.tsx`

| Sort option | Logic |
|---|---|
| `updated` (default) | `[stories.updated_at]` DESC |
| `newest` | `[stories.created_at]` DESC |
| `popular` | `[stories.total_views]` DESC |
| `followers` | `[stories.follower_count]` DESC |
| `rating` | `[stories.bayesian_rating]` DESC; stories with `forming` or `established` confidence sort above unrated ones |

---

## 5. Personalization

### Best Match For You
**Who it serves:** Logged-in users. Requires computed genre weights.

**Score formula:**
```
match_score = 0.40 × ([user_genre_weight] / [max_genre_weight])
            + 0.30 × ([story_velocity] / [max_velocity])
            + 0.20 × ([bayesian_rating] / 5.0)
            + 0.10 × (1 / (1 + [age_days] / 30))
```
- `[user_genre_weight]` = the user's computed weight for the story's `primary_genre` (see below)
- All velocity and genre values normalised within the candidate pool
- Excludes stories in `[user_muted_tags]`, from authors in `[user_blocked_authors]`, and already-read stories

DB RPC: `get_best_match_for_you(p_user_id, p_limit)`
Page: `/for-you`

---

### Genre Weight Computation
**What it measures:** How strongly a user is interested in each genre, inferred from their behaviour — not just what they say they like.

Five behavioural signals are combined and normalised to a 0–1 scale per genre:

```
raw_weight[genre] =
    3.0 × [count of stories read in genre]         (reading progress — strongest signal)
  + 2.0 × [count of library adds in genre]         (deliberate interest)
  + 1.5 × [count of stories rated in genre]
        + 1.0 bonus if any rating ≥ 4 stars        (invested, positive feedback)
  + 1.0 × [count of chapters liked in genre]       (in-the-moment engagement)
  + 0.5 × [count of genre in genre_preferences]    (stated preference — lowest weight)

normalised_weight[genre] = raw_weight[genre] / max(raw_weight across all genres)
```

Result stored in `[profiles.computed_genre_weights]` as a JSON object: `{"fantasy": 0.95, "romance": 0.40, ...}`

Fallback when no behavioural data: use `[profiles.genre_preferences]` (the array selected during onboarding).

DB RPC: `compute_user_genre_weights(target_user_id)`
File: `src/lib/recommendations.ts`

---

### Similar Stories (Because You Read X)
Used to build "Because You Read X" shelves on the homepage. Finds stories similar to recently-read ones.

```
similarity_score = 3.0 × (number of matching genres)
                 + 1.0 × (number of matching tags)
                 + 1.0   if [bayesian_rating] ≥ 4.0
```
Sorted by similarity score DESC, then `[total_views]` DESC.

DB RPC: `get_similar_stories(source_story_id, limit_count)`

---

### Collaborative Filtering (Readers Like You)
Finds stories liked by users with similar taste to the current user.

```
Step 1 — Find similar users:
  similar_users = users who have ≥ 2 overlapping stories in their reading history with the current user

Step 2 — Score candidate stories:
  For each story read by similar_users but not by current user:
    recommendation_score = (overlap_count × weight_per_similar_user) + ([reader_count] × 2)

Step 3 — Sort by score DESC, then [bayesian_rating] DESC, then [created_at] DESC
```

DB RPC: `get_collaborative_recommendations(target_user_id, limit_count)`
File: `src/lib/recommendations.ts`

---

## 6. Community Picks

A monthly reader-voted story award.

### Eligibility to Nominate
A user can nominate if:
- `[user_experience.xp_score]` ≥ 250 (Regular tier or above)
- They have nominated fewer than 3 stories this calendar month (`COMMUNITY_PICK_MAX_VOTES_PER_MONTH`)

A story is eligible to receive nominations if:
- `[stories.word_count]` ≥ 10,000 (`COMMUNITY_PICK_MIN_WORDS`)
- `[stories.visibility]` = `published`

### Leaderboard
```
Rank stories by [nomination_count] DESC for the current calendar month
(month stored as YYYY-MM-01 in [community_picks.pick_month])
```
At month end, the leaderboard is frozen into `[community_picks]` table.

DB RPC: `get_community_nominations_leaderboard(target_month, limit_count)`
File: `src/lib/community-picks.ts`

---

## 7. XP & Tiers

XP is earned for reading and writing activity, subject to daily caps. Tracked in `[user_experience.xp_score]`.

### XP Awards & Daily Caps

| Action | XP per event | Daily cap |
|---|---|---|
| Chapter read | 2 | 100 XP/day (≤ 50 chapters) |
| Like given | 1 | 10 XP/day |
| Comment posted | 3 | 30 XP/day |
| Library add | 2 | 20 XP/day |
| Chapter published | 10 | — |
| Rating posted | 10 | — |
| Comment liked (received) | 2 | — |

Daily cap enforcement: `award_xp_capped` DB function — checks `[user_daily_xp]` (user_id, date, source_type) before awarding. Reversals (e.g. unlikes, unfollow) bypass caps.

### XP Tiers

| Tier | Minimum XP |
|---|---|
| Newcomer | 0 |
| Regular | 100 |
| Established | 350 |
| Veteran | 750 |
| Elite | 1,500 |
| Legend | 3,000 |
| Mythic | 6,000 |
| Transcendent | 10,000 |
| Celestial | 20,000 |
| Immortal | 35,000 |
| Godlike | 60,000 |
| Omniscient | 100,000 |

---

## 8. Achievements

50+ achievements across four tracks. Evaluated by the `evaluate_achievements` DB trigger, which fires on key events (chapter_read, comment_posted, library_add, etc.) and cross-references `get_user_stats_full()`.

### Reading Track

| Achievement | Thresholds |
|---|---|
| `chapters_read` | 10 / 50 / 100 / 500 / 1,000 / 5,000 chapters |
| `genres_explored` | 3 / 5 / 8 / 10 / 13 distinct genres |
| `library_size` | 5 / 15 / 30 / 50 / 100 / 200 stories |
| `genre_specialist` | 50 / 100 / 200 / 500 chapters in a single genre |
| `reading_streak` | Consecutive days with reading activity |
| `binge_reader` | 20 chapters from the same story within 24 hours |
| `stories_completed` | Finished complete works |

### Writing Track

| Achievement | Thresholds |
|---|---|
| `chapters_published` | 1 / 10 / 25 / 50 / 100 / 250 chapters |
| `words_written` | Progressive word count milestones |
| `stories_published` | Distinct published stories |
| `stories_completed_author` | Marked stories complete |

### Social Track

| Achievement | Thresholds |
|---|---|
| `likes_given` | 1 / 10 / 50 / 100 / 500 |
| `likes_received` | 1 / 10 / 50+ |
| `comments_posted` | 1 / 10 / 50 / 100 / 500 / 1,000 |
| `followers_gained` | 1 / 10 / 50 / 100 / 500 / 1,000 |
| `authors_followed` | 1 / 5 / 10 / 25 / 50 |
| `story_subscribers` | First and progressive paid subscriber counts |
| `story_views` | Total views across all authored stories |

### Special / One-Time

- `first_chapter_read`, `first_library_add`, `first_story_published`, `first_subscriber`, `first_review`
- `community_pick` — story selected as a Community Pick
- `veteran_reader`, `loyal_reader` — based on `[profiles.account_age_days]`
- `profile_completed` — all profile fields populated
- `peak_rank` — best rank ever achieved in discovery rankings (lower is better; e.g. rank ≤ 10 unlocks a tier)
- `rising_stars` — peak rank specifically in the Rising Stars list
- `weeks_top_50` — number of distinct weeks spent in the top 50

### Stats Available to Achievement Engine
The `get_user_stats_full()` DB function returns ~25 metrics:
`chapters_read`, `genres_explored`, `library_size`, `authors_followed`, `comments_posted`, `likes_given`, `likes_received`, `chapters_published`, `words_written`, `stories_published`, `stories_completed` (reader + author), `story_views`, `reviews_written`, `ratings_received`, `reading_streak`, `reading_longest_streak`, `publishing_streak`, `publishing_longest_streak`, `account_age_days`, `profile_completed`, `premium_member`, `peak_rank`, `rising_stars_rank`, `weeks_top_50`

---

## 9. Key Thresholds & Config

Values stored in `platform_config` DB table and/or `src/lib/platform-config.ts` / `src/lib/constants.ts`.

### Discovery Eligibility

| Config key | Value | Meaning |
|---|---|---|
| `RISING_AGE_MIN` | 7 days | Story must be at least 7 days old to enter Rising |
| `RISING_AGE_MAX` | 90 days | Stories older than 90 days excluded from Rising |
| `MIN_STARTS_RISING` | 100 | Min qualified starts for Rising eligibility |
| `MIN_IMPRESSIONS_RISING` | 2,000 | Min impressions for Rising eligibility |
| `MIN_STARTS_TRENDING` | 50 | Min starts in last 7 days for Trending |
| `MIN_IMPRESSIONS_TRENDING` | 1,000 | Min impressions in last 7 days for Trending |
| `MIN_STARTS_SS` | 50 | Min starts for Satisfaction Score to be computed |
| `NEW_AGE_DAYS` | 30 | Max age for "New Releases" surface |
| `NEW_IMPRESSIONS_CAP` | 50,000 | Impressions cap before story leaves "New" exploration pool |

### Ratings

| Config key | Value | Meaning |
|---|---|---|
| `MIN_DISPLAY_RATINGS` | 10 | Minimum ratings before sentiment label is shown |
| `ESTABLISHED_RATINGS` | 50 | Ratings count for `established` confidence level |
| `BAYESIAN_C` | 4.15 | Global prior (genre-specific if available) |
| `BAYESIAN_M` | 20 | Prior weight (equivalent to 20 baseline ratings) |

### Cross-Genre Composition

| Config key | Value | Meaning |
|---|---|---|
| `CROSS_GENRE_TOTAL_SLOTS` | 30 | Total slots in the cross-genre Rising list |
| `GENRE_CAP` | 5 | Max stories per genre in the cross-genre list |
| `GENRE_FLOOR` | 2 | Min distinct genres that must appear |

### Hide Rate

| Config key | Value | Meaning |
|---|---|---|
| `HIDE_RATE_THRESHOLD` | 0.05 (5%) | Below this, no penalty |
| `HIDE_RATE_MIN_IMPRESSIONS` | 200 | Minimum impressions before hide rate is measured |

### Velocity Weights

| Config key | Value | Meaning |
|---|---|---|
| `VELOCITY_W_STARTS` | 0.40 | Weight of chapter-1 starts in velocity |
| `VELOCITY_W_LIBRARY` | 0.35 | Weight of library adds in velocity |
| `VELOCITY_W_READS` | 0.25 | Weight of chapter reads in velocity |
| `VELOCITY_FLOOR` | 10 | Denominator floor to avoid division by zero |

### Exploration Slots (reserved for underexposed stories)

| Config key | Value | Meaning |
|---|---|---|
| `EXPLORATION_PCT_NEW` | 40% | % of New surface reserved for high-exposure-debt stories |
| `EXPLORATION_PCT_RISING` | 20% | % of Rising surface reserved |
| `EXPLORATION_PCT_TRENDING` | 10% | % of Trending surface reserved |
| `DAILY_EXPECTED_IMPRESSIONS` | 50 | Used to compute exposure_debt |

### Community Picks

| Config key | Value |
|---|---|
| `COMMUNITY_PICK_MIN_XP` | 250 (Regular tier) |
| `COMMUNITY_PICK_MAX_VOTES_PER_MONTH` | 3 |
| `COMMUNITY_PICK_MIN_WORDS` | 10,000 |

---

## 10. File & Function Map

### TypeScript / Next.js

| Purpose | File |
|---|---|
| Rankings helpers (RPC wrappers) | `src/lib/rankings.ts` |
| Recommendations (genre weights, collab filtering, because-you-read) | `src/lib/recommendations.ts` |
| Community Picks (leaderboard, past picks, enrichment) | `src/lib/community-picks.ts` |
| Platform config (tier prices, fee %, payout minimum) | `src/lib/platform-config.ts` |
| Constants (genres, tags, XP caps, community pick thresholds) | `src/lib/constants.ts` |
| Rating submission + eligibility | `src/app/api/ratings/route.ts` |
| Snapshot rankings trigger | `src/app/api/admin/snapshot-rankings/route.ts` |
| Impression tracking | `src/app/api/impressions/route.ts` |
| Genre weights recompute | `src/app/api/recommendations/recompute/route.ts` |
| Browse sort logic | `src/app/browse/page.tsx` |
| For You page | `src/app/for-you/page.tsx` |
| Rising Stars page | `src/app/rising-stars/page.tsx` |
| Breaking Out page | `src/app/breaking-out/page.tsx` |
| Popular page | `src/app/popular/page.tsx` |
| Community Picks page | `src/app/community-picks/page.tsx` |

### Supabase DB Functions (RPC)

| Function | Purpose |
|---|---|
| `get_rising_in_genre` | Rising Stars score, per-genre |
| `get_cross_genre_rising` | Cross-genre Rising Stars (30 slots, interleaved) |
| `get_trending_in_genre` | Trending score, per-genre |
| `get_trending_this_week` | Cross-genre Trending |
| `get_fastest_growing` | Fastest velocity gains |
| `get_best_match_for_you` | Personalised For You feed |
| `compute_user_genre_weights` | Genre weight computation from behaviour |
| `get_similar_stories` | Because You Read X recommendations |
| `get_collaborative_recommendations` | Readers Like You recommendations |
| `get_recent_reads` | User's most recently read stories |
| `get_community_nominations_leaderboard` | Monthly Community Picks ranking |
| `snapshot_rankings` | Daily snapshot → `story_rankings` table |
| `award_xp_capped` | XP award with daily cap enforcement |
| `evaluate_achievements` | Achievement unlock trigger |
| `get_user_stats_full` | All ~25 stats for achievement evaluation |

### Key DB Tables

| Table | Purpose |
|---|---|
| `story_engagement_stats` | Computed engagement metrics (velocity, er_1_3, etc.) |
| `story_rankings` | Daily ranked snapshots per surface and genre |
| `story_peak_rankings` | All-time best rank per story (for achievements) |
| `community_nominations` | Active nominations (current month) |
| `community_picks` | Locked past picks |
| `user_experience` | XP scores and tier |
| `user_daily_xp` | Per-day XP earned by source type (for cap enforcement) |
| `user_achievements` | Unlocked achievements per user |
| `profiles.computed_genre_weights` | Normalised genre interest weights (JSON) |
| `profiles.genre_preferences` | Stated genre preferences from onboarding |
