# FICTIONRY — Discovery, Ranking, Ratings & Recommendation Strategy
## Product Specification v2.1 (Unified)

> **Goal:** Build a discovery system that is *fair to new work*, *hard to game*, *trustworthy to readers*, and *scales to millions of stories* — without the common web-fiction traps: backlog dumps dominating leaderboards, early-rating roulette, and winner-take-all visibility loops.

This is the **single canonical document** for:
- Discovery surfaces and ranking (genre-first + balanced cross-genre)
- Ranking signals and formulas
- **Ratings, reviews, and public sentiment** (collection, display, and internal scoring)
- Reader preferences and controls
- Anti-abuse and catalog integrity
- Creator analytics
- Tunable parameters

### Changelog
- **v2.0** — Unified discovery + ratings into single document
- **v2.1** — Defined Satisfaction Score formula. Defined Velocity for Trending. Wired rating momentum into Trending. Used conservative lower bound (AR_lower) in Top. Used credibility-weighted avg in internal scoring. Defined Exposure Debt and exploration slot mechanics. Specified cross-genre composition model with concrete slot counts. Defined hide/mute penalty mechanics. Lowered New eligibility to 1 chapter / 1,500 words. Added Trending eligibility minimums. Added per-genre prior reference. Expanded Creator Analytics.

It pairs with:
- **Fictionry Taxonomy v3.2**

---

# 0) Definitions and Terms

### Story primitives
- **Story**: a collection of chapters (or sections) with metadata (taxonomy, rating/warnings, format, publication status).
- **Chapter**: an atomic reading unit with a word count and publish timestamp.
- **Work age**: time since first publish (not time since last update).
- **Freshness**: time since last publish/update.

### Reader primitives
- **Impression**: a story card is shown in a feed/search/browse surface.
- **Click**: reader opens story page from a surface.
- **Start**: reader begins reading (opens chapter 1 or first unread chapter).
- **Qualified start**: a start that progresses beyond a minimal threshold (anti-bounce). Defined as: reader reaches chapter 2 OR reads >= 1,500 words.
- **Depth**: how far a reader progresses (chapters or words).
- **Return**: reader comes back within a window (e.g., 24h / 7d).
- **Library add**: follow/subscribe/save to library.
- **Hide/Mute**: explicit negative signal (hide story, hide tag, hide author). See §9.2 for mechanics.
- **Completion**: reader finishes a story (complete works) or reaches latest available chapter (serials).

### Data windows
- **Early window**: first 3 chapters or first 10k words.
- **Momentum window**: last 7 days of activity.
- **Reliability threshold**: minimum sample size needed to treat metrics as stable (varies per surface; see §3).

### Core principle
> **Never compare stories on raw totals across different ages, exposures, or backlog sizes.**
Normalize by *impressions*, *age*, and *available content*.

---

# 1) Philosophy: What Fictionry Optimizes For

Competitors often optimize for "who can trigger the biggest early spike," producing:
- backlog dump dominance
- rating anxiety / brigades
- tag/genre gaming
- monoculture

Fictionry optimizes for:

### 1.1 Fairness
- New stories get enough exposure to prove themselves.
- Small genres are not suffocated by large genres.
- A single early bad rating cannot "kill" a story.

### 1.2 Reader satisfaction
- Optimize for **time well spent**, not raw time spent.
- Matching (genre/subgenre/tags/mood/structure) matters more than raw popularity.

### 1.3 Trust and transparency
- Surfaces have clear meanings (New vs Rising vs Trending vs Top).
- Creators can understand what's happening (without exposing exploitable internals).

### 1.4 Anti-gaming and resilience
- Robust to brigades, clickfarms, and manipulation.
- Degrades gracefully under attack.

### 1.5 Diversity and breadth
- Cultivate many mid-sized hits.
- Maintain long-tail health via exploration and balanced surfaces.

---

# 2) Discovery Surfaces (IA) and What Each Surface "Means"

Fictionry is **genre-first**. Competitive ranking happens primarily within each Primary Genre.

### 2.1 Per-genre surfaces (default)
Each Primary Genre has its own landing page and key feeds:

1. **New in Genre**
   - Meaning: "Freshly published; rotation ensures new stories get seen."
   - Sort: freshness + exploration rotation + basic quality gates.

2. **Rising in Genre**
   - Meaning: "Accelerating *relative to age and exposure*."
   - Sort: momentum + retention + reliability weighting (ratings lightly).

3. **Trending in Genre**
   - Meaning: "Hot now."
   - Sort: velocity normalised by impressions + recency + rating momentum as signal.

4. **Top in Genre (Established)**
   - Meaning: "Consistently beloved with lots of data."
   - Sort: satisfaction (conservative lower bound) + reliability + long-horizon retention.

5. **Complete in Genre**
   - Meaning: "Finished works for binge readers."
   - Sort: satisfaction + completion rate + reader-fit signals.

### 2.2 Cross-genre surfaces (composed, not winner-take-all)

1. **Across Fictionry: Rising (Balanced)**
   - Composition: slot-based with genre floors and caps (see §7).

2. **Mood Match (Cross-genre)**
   - Primary axis: Tone/Mood tags.

3. **Best Match For You (Cross-genre)**
   - Personalised from taxonomy affinity + behaviour; includes exploration slice.

4. **Editorial Picks / Spotlights**
   - Human curation for blind spots and niches.

### 2.3 Search (hybrid)
- Full-text + structured filters (genre, subgenre, tags, rating/warnings, format, status).
- Defaults to relevance + satisfaction, not popularity.

---

# 3) Eligibility Rules and Guardrails

Eligibility prevents unfair comparisons and gaming.

### 3.1 New Story eligibility
A story is "New" if:
- Age ≤ `NEW_AGE_DAYS` (default 30)
- AND impressions < `NEW_IMPRESSIONS_CAP` (default 50k)

Minimum content threshold:
- At least 1 chapter AND at least 1,500 words

> **Rationale:** Many serial authors publish chapter 1 first to test reader interest. Since New is explicitly an exposure/rotation surface (not a quality surface), the bar should be low enough to let these stories be seen. Quality gating happens on Rising and above.

### 3.2 Rising eligibility
A "Rising" candidate:
- Age between `RISING_AGE_MIN` (default 7) and `RISING_AGE_MAX` (default 60)
- AND meets reliability minimums:
  - `MIN_UNIQUE_READERS_RISING` (default 200)
  - `MIN_IMPRESSIONS_RISING` (default 2,000)
  - `MIN_STARTS_RISING` (default 100)

### 3.3 Trending eligibility
A "Trending" candidate:
- At least `MIN_STARTS_TRENDING` (default 50) qualified starts in the last 7 days
- At least `MIN_IMPRESSIONS_TRENDING` (default 1,000) impressions in the last 7 days
- Not blocked by reader exclusions
- Not suspected of abuse (or dampened)

### 3.4 Top/Established eligibility
A story is "Established" if:
- ≥ `ESTABLISHED_RATINGS` (default 50 qualified ratings) OR `SatisfactionScore` reliability ≥ 0.8 (see §4.5)
- AND at least 100 readers reached early-depth threshold (chapter 3 or 10k words)
- AND active for at least 28 days

### 3.5 Taxonomy integrity gating
Stories must have required metadata complete (Primary Genre, content rating, format, publication status) to appear in competitive surfaces. Obvious mismatch patterns can nudge review.

---

# 4) The Signals: What We Measure (and why)

Discovery is driven by **behavioral satisfaction**, not vanity metrics.

### 4.1 Core positive signals
1. **Library Add Rate (LAR)** = `library_adds / impressions`
2. **Start Rate (SR)** = `starts / impressions` (packaging effectiveness)
3. **Early Retention (ER)**:
   - `ER_1_2 = readers_reaching_ch2 / readers_starting_ch1`
   - `ER_1_3 = readers_reaching_ch3 / readers_starting_ch1`
   - `ER_words10k = readers_reaching_10k_words / readers_starting`
4. **Return Rate (RR)**:
   - `RR_24h`, `RR_7d` normalised by update cadence
5. **Completion Rate (CR)** (complete works):
   - `CR = completions / qualified_starts`
6. **Satisfaction Score (SS)**: see §4.5
7. **Rating Momentum (RM)**: see §4.6

### 4.2 Neutral/secondary signals
- Session depth
- Read time per start (use carefully — not currently tracked; can add later)
- Commenting rate (easy to game; low weight)

### 4.3 Negative signals
- **Bounce**: start then quit quickly (did not reach qualified start threshold)
- **Hide/Mute**: see §9.2 for mechanics
- **Warning mismatch reports**
- **Abuse flags**

### 4.4 Why raw views are dangerous
Raw views are exposure-dependent, backlog-dependent, bottable, and weakly correlated with satisfaction. They can contribute to trend detection, but not dominate rank.

### 4.5 Satisfaction Score (SS) — composite metric
Satisfaction Score combines rating signal with behavioural proxies into a single normalised score (0–1).

**Formula:**
```
SS = 0.30 * normalize(RatingSignal)
   + 0.25 * normalize(ER_1_3)
   + 0.20 * normalize(RR_7d)
   + 0.15 * normalize(CR_or_CatchupRate)
   + 0.10 * normalize(LAR)
```

Where:
- `RatingSignal` = reliability-weighted Bayesian AR (see §5.4). Uses per-genre prior when available.
- `ER_1_3` = early retention (readers reaching chapter 3)
- `RR_7d` = 7-day return rate, normalised by update cadence
- `CR_or_CatchupRate` = completion rate for complete works; catch-up rate (reaching latest chapter) for serials
- `LAR` = library add rate
- `normalize()` = maps each metric to 0–1 range relative to genre median and 95th percentile

**Reliability gating:** SS is only computed when a story has at least `MIN_STARTS_SS` (default 50) qualified starts. Below this, the story uses a provisional score based on available signals with wider confidence intervals.

**Why these weights:** Ratings get the highest single weight because they are the most direct expression of reader satisfaction, but behavioural signals collectively outweigh ratings (0.70 vs 0.30). This ensures stories that readers demonstrably enjoy (high retention, high return) are surfaced even if they have few formal ratings.

### 4.6 Rating Momentum (RM)
From the ratings spec (v1.3 §5.6):
- `recent_rating_avg` — credibility-weighted mean of last 30 days or last 20 ratings
- `rating_momentum` = `recent_rating_avg - lifetime_weighted_avg`

Positive momentum means recent readers are rating higher than historical average. Used in Trending (see §6.2).

### 4.7 Velocity — rate of activity change
Velocity measures how quickly a story's engagement is growing or shrinking over recent windows.

**Formula:**
```
activity_recent = w1*starts_7d + w2*library_adds_7d + w3*chapter_reads_7d
activity_prior  = w1*starts_prev_7d + w2*library_adds_prev_7d + w3*chapter_reads_prev_7d

Velocity = (activity_recent / max(activity_prior, floor)) * log(1 + activity_recent)
```

Where:
- `w1 = 0.40, w2 = 0.35, w3 = 0.25` (starts weighted highest as strongest intent signal)
- `floor = 10` (prevents division by zero and dampens noise when prior activity is near-zero)
- The `log(1 + activity_recent)` term ensures raw volume still matters somewhat — a story going from 2 to 4 starts (2x velocity) doesn't outrank one going from 200 to 300 (1.5x velocity but far more absolute activity)

---

# 5) Ratings, Reviews & Public Sentiment (Summary)

> **Canonical reference: Fictionry Ratings, Reviews & Reader Sentiment System v1.3.** This section summarises the ratings system for discovery context. For full schema, API, QA, and UI details, see the ratings spec.

## 5.1 Design summary
- Reader submits **1–5 stars**.
- Public sees **sentiment labels** + count, not decimals.
- Internal uses **qualified-only, credibility-weighted, Bayesian-adjusted, reliability-weighted** score.
- Ratings are de-emphasised in early discovery; emphasised in established surfaces.
- Reviews require a rating first and deeper reading.

## 5.2 Rating eligibility (Qualified Ratings)
A reader may rate if ANY of:
- `chapters_read >= 3`
- `words_read_unique >= 6000`
- `words_read_unique >= clamp(0.35 * available_words, 1500, 12000)`

## 5.3 Public display: sentiment labels
Sentiment label wording is **identical everywhere** (cards, pages, search, lists).

### Confidence states (sample-based only)
- `n == 0` → **Not Yet Rated**
- `1–9` → **Early Feedback (n)**
- `10–49` → sentiment label + **Forming**
- `50+` → sentiment label + **Established**

### Sentiment labels
- `AR >= 4.60` → **Excellent**
- `4.30 <= AR < 4.60` → **Very Good**
- `3.90 <= AR < 4.30` → **Positive**
- `AR < 3.90`, `n < 20` → **Mixed**
- `AR < 3.90`, `n >= 20`, `stddev >= 1.20` → **Divisive**
- `AR < 3.90`, `n >= 20`, `stddev < 1.20` → **Cool Reception**

## 5.4 Internal scoring (Bayesian + credibility + reliability)
```
weighted_avg = sum(rating_value * credibility_weight * abuse_weight)
             / sum(credibility_weight * abuse_weight)

C = genre_prior ?? global_prior (4.15)
m = 20

AR = (m*C + n*weighted_avg) / (m + n)

AR_lower = AR - 1.65 * stddev / sqrt(n)    // conservative lower bound, n >= 10

R_rating = min(1, log(1+n) / log(1+50))

RatingSignal = R_rating * normalize(AR) + (1 - R_rating) * prior_baseline

RatingSignal_lower = R_rating * normalize(AR_lower) + (1 - R_rating) * prior_baseline
```

- `RatingSignal` is used in Rising, Trending, and Satisfaction Score
- `RatingSignal_lower` (conservative) is used in Top surfaces to prevent small-sample stories from dominating

### Per-genre Bayesian priors
Genre-specific `C` values are stored in `genre_rating_config` (see ratings spec v1.3 §9.6). At launch, all genres fall back to global `C = 4.15`. When a genre accumulates 100+ qualified ratings, compute and store `C_genre = mean(all qualified ratings in genre)`.

## 5.5 Credibility weighting (mandatory)
- Eligible: 1.0
- ≥ 25% available OR ≥ 10 chapters: 1.1
- ≥ 60% available OR ≥ 25 chapters: 1.2
- Completed or caught up (≥ 90%): 1.3

## 5.6 Staleness badge
Story is **Stale** when status is Ongoing/Hiatus and `days_since_last_chapter >= 180`. Staleness affects discovery ranking (demotion) but not confidence state or sentiment label.

## 5.7 Reviews
Review requires: (1) eligible-to-rate threshold, (2) a submitted rating, (3) deeper reading (5 chapters / 20k words / 50% clamped to 5k–25k). Review votes: **Helpful** / **I Disagree**.

---

# 6) Ranking Algorithms (Surface Scoring)

## 6.1 Reliability weighting (general)
Applied to any rate-based metric:

`R = min(1, log(1+n) / log(1+N0))`

Where `n` = sample size and `N0` = reliability target for that metric. Unreliable metrics blend toward genre baseline.

## 6.2 Surface formulas

### New in Genre
```
Score_new = FreshnessBoost(age) + ExplorationSlot(exposure_debt) + QualityGate
```

- `FreshnessBoost(age)` = decaying function of work age (e.g., `1 / (1 + age_days/7)`)
- `ExplorationSlot` = priority boost for stories with high exposure debt (see §8)
- `QualityGate` = meets minimum content threshold (1 chapter, 1,500 words); no quality scoring
- **Rating weight: 0%**

### Rising in Genre
```
Score_rising = 0.35 * R(LAR) * LAR
             + 0.35 * R(ER) * ER_1_3
             + 0.20 * R(RR) * RR_7d
             + 0.10 * RatingSignal
             - Penalties
```

- All rate-based metrics are reliability-weighted (`R(metric)`)
- **Rating weight: ~10%** (via RatingSignal)
- Penalties: hide rate penalty (see §9.2), abuse dampening

### Trending in Genre
```
Score_trending = 0.45 * Velocity
              + 0.20 * RecencyBoost(days_since_last_chapter)
              + 0.15 * R(ER) * ER_1_3
              + 0.10 * RatingSignal
              + 0.10 * MomentumBoost(rating_momentum)
              - Penalties
```

- `Velocity` = activity acceleration (see §4.7)
- `RecencyBoost` = decaying function of freshness (e.g., `1 / (1 + days/14)`)
- `MomentumBoost(rm)` = `clamp(rm * 0.5, -0.2, 0.2)` — bounded so momentum can boost or suppress but not dominate
- **Rating weight: ~10%** direct + ~10% via momentum = ~20% total rating influence

### Top in Genre (Established)
```
Score_top = 0.45 * RatingSignal_lower
          + 0.20 * R(LongRetention) * LongRetention
          + 0.20 * R(CR_or_Return) * CompletionOrReturn
          + 0.15 * R(LAR_long) * LAR_long
          - Penalties
```

- **Uses `RatingSignal_lower`** (conservative lower bound) to prevent small-sample stories from dominating. A story with 12 ratings averaging 4.9 will not outrank a story with 500 ratings averaging 4.5.
- `LongRetention` = readers still active after 28+ days
- `CompletionOrReturn` = completion rate (complete works) or 28-day return cadence (serials)
- `LAR_long` = library add rate over the story's lifetime (not just recent)
- **Rating weight: ~45%** — highest of any surface, appropriate for established stories with high-confidence data

### Complete in Genre
```
Score_complete = 0.35 * RatingSignal_lower
              + 0.30 * R(CR) * CR
              + 0.20 * R(ER) * ER_1_3
              + 0.15 * R(LAR) * LAR
              - Penalties
```

- Only includes stories with `status = completed`
- CR (completion rate) weighted heavily — the defining signal for complete works

### Best Match For You (Personalised)
```
Score_match = 0.35 * ContentSimilarity
            + 0.25 * BehavioralSimilarity
            + 0.20 * QualityConfidence
            + 0.15 * Novelty
            - 0.05 * Risk
```

- `ContentSimilarity` = taxonomy overlap (genre, subgenre, tags, mood) with reader's preference profile
- `BehavioralSimilarity` = collaborative filtering (readers like you enjoyed this)
- `QualityConfidence` = SatisfactionScore * reliability — quality matters but doesn't override fit
- `Novelty` = inverse of how similar this story is to what the reader has already seen/read
- `Risk` = probability of mismatch (content warnings the reader hasn't seen, genres outside their profile)

---

# 7) Genre-first + Balanced Cross-genre Composition

## 7.1 No raw global Top 100
Global charts are winner-take-all and dominated by the largest genres. Fictionry does not have a raw global ranking.

## 7.2 Composition model: Slot-based with floors and caps
Cross-genre surfaces (e.g., "Across Fictionry: Rising") use a **slot allocation** model.

### How it works
Given a cross-genre surface with `TOTAL_SLOTS` positions (default 30):

1. **Floor allocation:** Each active genre gets `GENRE_FLOOR` slots (default 2). If there are 15 active genres, this consumes 30 slots — exactly filling the surface with guaranteed representation.

2. **Remaining slots:** If `TOTAL_SLOTS > (active_genres * GENRE_FLOOR)`, remaining slots are allocated proportional to genre activity (impressions + starts in the last 7 days), with a per-genre cap of `GENRE_CAP` (default 5) to prevent any single genre from dominating.

3. **Within each genre's allocation:** Stories are ranked by the relevant surface's scoring formula (e.g., Rising score for the cross-genre Rising surface).

### Why this works
- Small genres always get visibility (floor)
- Large genres get more slots but can't monopolise (cap)
- The surface still surfaces the best stories from each genre

### Personalised cross-genre surfaces
"Best Match For You" uses the same slot model but adjusts genre allocation proportional to the reader's genre affinity weights rather than global genre activity. Exploration slice: at least `EXPLORATION_SLOTS` (default 3) of the total slots come from genres outside the reader's top 3 preferences.

---

# 8) Exploration vs Exploitation

### 8.1 Exploration budget
Every surface reserves a percentage of positions for exploration:

| Surface | Exploration % | Mechanic |
|---------|--------------|----------|
| New in Genre | 40% | High rotation; exposure debt priority |
| Rising in Genre | 20% | Underexposed stories with promising early signals |
| Trending in Genre | 10% | Light exploration only |
| Top in Genre | 5% | Minimal; mostly exploitation |
| Best Match For You | 25% | Genre diversity + novelty |

### 8.2 Exposure Debt
Exposure Debt measures how underexposed a story is relative to what it "deserves" based on its age and eligibility.

**Formula:**
```
expected_impressions = age_days * DAILY_EXPECTED_IMPRESSIONS_PER_ELIGIBLE_STORY
exposure_debt = max(0, expected_impressions - actual_impressions)
```

Where `DAILY_EXPECTED_IMPRESSIONS_PER_ELIGIBLE_STORY` is a tunable value (default 50), representing the minimum daily impression floor the platform aims to deliver to each eligible story.

### 8.3 Exploration slot mechanics
Within each surface's exploration budget:
1. Identify eligible stories with `exposure_debt > 0`
2. Rank by `exposure_debt` descending (most underexposed first)
3. Filter to stories that pass the surface's minimum quality gates
4. Fill exploration slots from this ranked list
5. After a story appears in an exploration slot, its `actual_impressions` increases, naturally reducing its debt

### 8.4 Why this matters
Without explicit exploration, a story that gets unlucky early (shown to the wrong readers, bad time of day) can fall off all surfaces permanently. Exposure debt ensures every eligible story gets enough impressions to generate meaningful signals. Once a story has enough data, its quality metrics determine whether it rises or fades — but it always gets the chance.

---

# 9) Reader Preferences and Controls

### 9.1 Preference types

**Hard exclusions** (story is never shown):
- Content warnings the reader has excluded
- Tags the reader has explicitly muted
- Authors the reader has blocked

**Soft preferences** (affect ranking, not eligibility):
- Genre affinity (from onboarding + reading behaviour)
- Mood affinity (from tag interactions)
- Format preference (serial vs complete vs short)
- Computed genre weights (stored in `profiles.computed_genre_weights`)

### 9.2 Hide/Mute mechanics
When a reader hides a story or mutes a tag/author:

**User-level effect (immediate):**
- The story/tag/author is permanently excluded from that reader's feeds
- This is a hard exclusion — no surface shows hidden content to that reader

**Aggregate effect (quality signal):**
- Track `hide_rate = hides / impressions` per story
- When `hide_rate > HIDE_RATE_THRESHOLD` (default 0.05 / 5%), apply a ranking penalty:
  - `hide_penalty = clamp((hide_rate - 0.05) * 10, 0, 0.5)`
  - This penalty is subtracted from the story's score on all surfaces
- Hide rate is computed over a rolling 30-day window with a minimum of 200 impressions to prevent noise

**Why this design:**
- Individual hides don't punish authors (one unhappy reader can't suppress a story)
- Aggregate hide rate catches genuinely problematic content (misleading tags, poor content warnings, clickbait)
- The threshold and penalty are tunable

---

# 10) Anti-Abuse and Catalog Integrity

### 10.1 Detection signals
- **Rating bursts:** sudden spike in ratings from accounts with little reading history
- **Correlated accounts:** similar IP/device/timing patterns across rating or voting activity
- **Abnormal rating-only users:** accounts that rate but barely read (low chapter_reads relative to ratings given)
- **Clickbait pattern:** high SR + low ER (story attracts clicks but readers immediately bounce)
- **Tag/genre gaming:** story metadata doesn't match content (detected via reader mismatch reports and hide patterns)
- **Self-promotion rings:** mutual rating/reviewing clusters

### 10.2 Response ladder
1. **Downweight:** reduce suspicious signals' contribution to aggregates (default response)
2. **Delay counting:** hold signals from suspicious sources pending confidence check
3. **Rate-limit:** restrict rating/review frequency for flagged accounts
4. **Dampening:** reduce story's visibility on competitive surfaces while investigation is pending
5. **Manual review:** flag for moderation team
6. **Account sanctions:** warning → suspension → ban

### 10.3 Quiet robustness
Prefer downweighting and dampening over visible removals. This avoids public drama, adversarial learning, and false positive harm.

---

# 11) Creator Analytics

### 11.1 What creators see

**Discovery performance:**
- Impressions by surface (New, Rising, Trending, Top, Search, Best Match)
- Click-through rate (clicks / impressions) by surface
- Start rate (SR)

**Reader engagement:**
- Early retention (ER_1_2, ER_1_3)
- Return rate (RR_7d)
- Library add rate (LAR)
- Completion rate (complete works) or catch-up rate (serials)

**Ratings:**
- Public sentiment label + confidence state
- Qualified ratings count
- Rating momentum indicator (directional, no exact numbers)
- Number of blocked unqualified rating attempts

**Eligibility status:**
- Current eligibility for each surface (New, Rising, Trending, Top)
- What's needed to reach the next surface (e.g., "Need 80 more unique readers for Rising eligibility")

### 11.2 What creators do NOT see
- Internal ranking scores or formula weights
- Anti-abuse flags or trust scores
- Other stories' exact metrics
- Rater identities (unless public review)
- Exact moderation heuristics

### 11.3 Creator education
Dashboard note:
> Your story's visibility is driven by reader engagement (starts, retention, follows, returns) more than by ratings. Early discovery surfaces prioritise new stories getting enough exposure to prove themselves. Ratings become more influential as your reader base grows.

---

# 12) Tunable Parameters (launch defaults)

All parameters should be stored in `platform_config` for runtime tuning.

### Eligibility
- `NEW_AGE_DAYS = 30`
- `NEW_IMPRESSIONS_CAP = 50,000`
- `MIN_CONTENT_CHAPTERS_NEW = 1`
- `MIN_CONTENT_WORDS_NEW = 1,500`
- `RISING_AGE_MIN = 7`
- `RISING_AGE_MAX = 60`
- `MIN_UNIQUE_READERS_RISING = 200`
- `MIN_IMPRESSIONS_RISING = 2,000`
- `MIN_STARTS_RISING = 100`
- `MIN_STARTS_TRENDING = 50` (last 7 days)
- `MIN_IMPRESSIONS_TRENDING = 1,000` (last 7 days)
- `MIN_STARTS_SS = 50` (for Satisfaction Score computation)

### Ratings
- `MIN_DISPLAY_RATINGS = 10`
- `ESTABLISHED_RATINGS = 50`
- `MIN_VARIANCE_LABEL_RATINGS = 20`
- `VARIANCE_THRESHOLD = 1.20` (stddev for Divisive/Cool Reception)
- `STALE_DAYS = 180`
- `BAYESIAN_C = 4.15` (global prior; per-genre overrides in `genre_rating_config`)
- `BAYESIAN_M = 20`

### Exploration
- `DAILY_EXPECTED_IMPRESSIONS = 50`
- `EXPLORATION_PCT_NEW = 40`
- `EXPLORATION_PCT_RISING = 20`
- `EXPLORATION_PCT_TRENDING = 10`
- `EXPLORATION_PCT_TOP = 5`
- `EXPLORATION_PCT_MATCH = 25`

### Cross-genre composition
- `CROSS_GENRE_TOTAL_SLOTS = 30`
- `GENRE_FLOOR = 2`
- `GENRE_CAP = 5`
- `EXPLORATION_SLOTS_MATCH = 3` (genres outside reader's top 3)

### Penalties
- `HIDE_RATE_THRESHOLD = 0.05`
- `HIDE_RATE_MIN_IMPRESSIONS = 200`

### Velocity
- `VELOCITY_W_STARTS = 0.40`
- `VELOCITY_W_LIBRARY = 0.35`
- `VELOCITY_W_READS = 0.25`
- `VELOCITY_FLOOR = 10`
