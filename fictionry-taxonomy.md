# FICTIONRY — Complete Genre Taxonomy & Discovery System
## Product Specification v3.0 (Revised)

---

# Architecture Overview

The taxonomy is built on **five distinct layers** plus two **metadata dimensions**. Each layer answers a different question and serves a different function in discovery, recommendation, and catalogue health.

| Layer | Name | Question It Answers | Input Type | Required? |
|-------|------|---------------------|------------|-----------|
| 1 | **Primary Genre** | What kind of story is this at its core? | Single select | Yes |
| 2 | **Subgenre** | What specific flavour within that genre? | Select up to 3 | No |
| 3 | **Tags** | What tropes, moods, structures, and experiences define it? | Select up to 12 from curated list | No (but strongly encouraged) |
| 4 | **Content Rating & Warnings** | Who is this appropriate for, and what should readers be prepared for? | Rating: mandatory. Warnings: select all that apply. | Rating: Yes. Warnings: No (but strongly encouraged). |
| 5 | **Format** | How is this structured as a reading experience? | Single select | Yes |
| Meta-A | **Origin Type** | Is this original fiction or fan fiction? | Toggle | Yes |
| Meta-B | **Fandom** | (Fan fiction only) What source material? | Searchable select, up to 3 | Yes if fan fiction |

### Why five layers + two meta dimensions?

Most platforms conflate genre, tropes, mood, content warnings, format, and fandom into a single flat tag system. This creates a taxonomy where “LitRPG” sits next to “Profanity” sits next to “Complete” sits next to “Harry Potter” as if they are the same type of information. They are not.

Keeping them separate means: cleaner discovery, better recommendations, author clarity, reduced gaming, and a taxonomy you can maintain as the platform grows from 1,000 stories to 1,000,000.

---

# Core Classification Rules (NEW — Required Reading)

These rules are part of the taxonomy, not just guidance. They reduce ambiguity and make author choices more consistent.

## Rule 1: Primary Genre = Reader’s Main Promise
Choose the genre that best answers:

> **“What experience is the reader primarily here for?”**

- If the story can lose a subplot and still remain the same *kind* of story, that subplot should not define Primary Genre.
- Primary Genre is about the **core reading promise**, not everything present in the story.

## Rule 2: World Type Before Tone
When in doubt, classify in this order:

1. **Is the setting speculative?** (magic, impossible tech, supernatural rules)
2. **Is it contemporary/real-world?**
3. **What is the central engine?** (romance / dread / investigation / growth / satire / etc.)
4. **What is the tone?** (cozy, dark, funny, bleak, etc.) -> usually a tag, not genre

## Rule 3: “Speculative Setting” Takes Precedence
If speculative elements fundamentally define the world, **prefer Fantasy or Science Fiction** over Contemporary/Thriller/etc. unless another genre’s core promise is clearly dominant.

Examples:
- Modern city + hidden vampires + romance spine -> **Romance** (Paranormal Romance subgenre)
- Modern city + hidden vampires + investigation and dread -> **Horror** or **Thriller & Mystery**
- Modern city + magic underworld, adventure/power systems -> **Fantasy** (Urban Fantasy)

## Rule 4: Paranormal & Supernatural is for Near-Real Settings
Use **Paranormal & Supernatural** when:
- the setting is recognisably real/near-real, and
- supernatural/paranormal elements coexist with ordinary life, and
- the story is **not primarily Horror**, **not primarily Romance**, and **not primarily high/worldbuilding Fantasy**

## Rule 5: Tone is Usually a Tag, Not a Subgenre
Use subgenres for **world/narrative mode conventions**. Use tags for **mood and emotional register** (e.g., cozy, bleak, humorous).

## Rule 6: Primary Genre is Mutable (with Guardrails)
Primary Genre can be changed by the author, subject to:

- **First change**: Free, immediate, no cooldown
- **Subsequent changes**: 90-day cooldown between changes, maximum 2 changes per calendar year
- **All changes logged** for recommendation/audit history
- **“Story Evolved” transparency** shown to readers
- **Automated drift detection** (>70% reader discovery/source mismatch) triggers author review prompt, not forced change

This preserves flexibility for serial fiction while protecting catalogue integrity.

---

# Layer 1 — Primary Genres

Primary Genre is mandatory and single-select. It represents what the story **is** at its broadest level — the shelf it would sit on in a bookstore, the section a reader would browse.

There are **13 Primary Genres**.

| # | Genre | Description | Primary Audience Source |
|---|-------|-------------|-------------------------|
| 1 | **Fantasy** | Stories set in worlds with magic, mythic systems, or impossible supernatural structures as core world logic. Includes epic fantasy, progression fantasy, and urban fantasy. | RoyalRoad core, Scribble Hub |
| 2 | **Science Fiction** | Futures, alternate science, space, speculative technology, or scientifically framed impossibilities. | Underserved on web fiction platforms |
| 3 | **Horror** | Primary intent is dread, fear, or unease. Includes psychological, supernatural, cosmic, folk, gothic, and body horror. | Niche but intensely loyal audience |
| 4 | **Romance** | The central narrative is a romantic relationship and its development. HEA/HFN expectations apply for genre readers. | Wattpad core, BookTok |
| 5 | **Thriller & Mystery** | Suspense, investigation, crime, secrets, pursuit, conspiracy, and revelation are the primary drivers. | Underserved on web fiction |
| 6 | **Action & Adventure** | Plot-driven stories where conflict, movement, quests, exploration, or survival are the main engine. | RoyalRoad adjacent |
| 7 | **Comedy & Satire** | The primary intent is to amuse, parody, or critique through humour. | Cross-genre, underserved |
| 8 | **Contemporary Fiction** | Recognisable real-world setting with no speculative elements as core premise; may be dramatic, slice-of-life, or commercial. | Wattpad adjacent |
| 9 | **Historical Fiction** | Stories set in a specific real historical period where historical setting is a defining feature. Includes alternate history. | Underserved on web fiction |
|10 | **Literary Fiction** | Literary/upmarket fiction where prose craft, theme, and character interiority are primary over plot mechanics. | Differentiator |
|11 | **Paranormal & Supernatural** | Paranormal or supernatural elements in a near-real/contemporary setting, where the story is not primarily Horror, Romance, or worldbuilding Fantasy. | Wattpad-adjacent / paranormal readers |
|12 | **Non-Fiction & Essay** | True stories, memoir, essay, narrative non-fiction, serial journalism, and craft writing. | Untapped |
|13 | **Fan Fiction** | Stories derived from existing IPs or real public figures; fandom identity is the main discovery axis. | AO3, Wattpad |

### Rationale Notes (v3)
- **Experimental** is no longer a Primary Genre. It has been redistributed into **Format + Tags + Subgenres** (see below) because “experimental” is usually a *form characteristic*, not a stable reader-intent shelf.
- **Comedy & Satire remains Primary** because comedy is a real reading identity.
- **Fan Fiction remains Primary + parallel system** because fandom is the primary discovery axis for fanfic readers.

---

# Layer 2 — Subgenres

Subgenres are optional (up to **3**), dynamically filtered based on Primary Genre. Authors see only subgenres relevant to their selected genre.

## Subgenre Design Rule (NEW)
Subgenres should describe one or more of:
- **World model / setting convention**
- **Narrative mode**
- **Genre-specific market convention**

Subgenres should **not** primarily describe:
- Tone/mood (use Tone & Mood tags)
- Protagonist identity (use Character & POV tags)
- Generic tropes (use Tropes tags)

---

## Fantasy — 18 Subgenres (trimmed)

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Epic Fantasy** | Large-scale world, grand stakes, detailed lore, often multiple POVs | Tolkien/Sanderson mode |
| **LitRPG** | Explicit game mechanics in the narrative (stats, levels, skills, UI) | If readers see numbers/blue boxes |
| **GameLit** | Game-inspired logic/world without explicit visible system UI | Game logic, no hard UI emphasis |
| **Progression Fantasy** | Measurable character power growth is the central engine | Growth arc is the plot engine |
| **Cultivation / Xianxia** | Chinese-inspired cultivation systems, spiritual power, martial progression | Qi, realms, tribulations |
| **Wuxia** | Martial arts-focused, often historical Chinese-inspired, no cultivation required | Jianghu / martial honour |
| **Murim** | Korean martial arts fantasy conventions, sects, masters, regressors common | Korean martial fantasy ecosystem |
| **Isekai / Portal Fantasy** | Character transported/reincarnated into another world | Portal/summoned/reborn elsewhere |
| **Urban Fantasy** | Magic/supernatural systems in a modern city; worldbuilding focus matters | Hidden magic society, magical investigation, etc. |
| **Dark Fantasy / Grimdark** | Bleak, brutal, morally grey fantasy with serious consequences | Tone-heavy but a stable fantasy convention |
| **Mythological Fantasy** | Real-world mythologies drive worldbuilding and conflict | Greek/Norse/Egyptian/etc.-rooted |
| **Fairy Tale Retelling** | Reworking known fairy tales/folk stories | Retellings/fractures |
| **Gaslamp / Steampunk Fantasy** | Industrial-era aesthetics + magic | Victorian-ish fantasy tech/magic blend |
| **Romantasy** | Fantasy and romance are co-equal narrative engines | Both must be central |
| **Dungeon Core** | MC is the dungeon/intelligence behind the dungeon | Dungeon consciousness perspective |
| **System Apocalypse** | Real world receives game-like system overlay | Earth + system arrival |
| **Kingdom / Base Building** | Governance, settlement growth, expansion are central | Logistics/infrastructure/politics focus |
| **Sword & Sorcery** | Personal-scale, episodic, adventure-heavy fantasy | Conan-style, immediate stakes |

**Moved out of Fantasy subgenres (v3):**
- **Cozy Fantasy** -> Tone tag + Fantasy
- **Non-Human MC Fantasy** -> Character/POV tag + Fantasy

---

## Science Fiction — 14 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Space Opera** | Grand-scale interstellar adventure, conflict, civilisation | Sweeping, large-cast SF |
| **Cyberpunk** | High tech, low life, corporate dystopia, neural/city future | Neon + inequality + tech |
| **Post-Apocalyptic** | Set after collapse; survival/rebuilding in the aftermath | Collapse already happened |
| **Dystopian** | Oppressive systems/societies; collapse not required | Surveillance/control/power |
| **Hard Science Fiction** | Scientific plausibility and rigor are primary values | Extrapolation matters |
| **Military Science Fiction** | War and command structures in SF context | Units/chain of command |
| **Solarpunk** | Optimistic, ecological, community-centred future | Regeneration and hopeful systems |
| **Time Travel** | Temporal mechanics are central to the plot | Loops/paradoxes/consequences |
| **Biopunk / Genepunk** | Genetic engineering, biotech, body-as-platform futures | Organic/biological tech focus |
| **Near-Future Thriller** | Plausible near-future technology + contemporary stakes | Tomorrow’s headlines |
| **Mecha** | Giant robots/powered armor as a central SF mode | SF-first mecha stories |
| **First Contact** | Initial contact with alien intelligence is the story engine | Communication/collision |
| **AI / Singularity** | Machine consciousness, AGI, post-human futures | Thinking machines at centre |
| **Alternate History** | Historical divergence leading to a different present/future | Counterfactual history with speculative framing |

---

## Horror — 10 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Psychological Horror** | Mental states, paranoia, uncertainty, unreliable reality | Internal dread |
| **Supernatural Horror** | Ghosts, demons, monsters, cursed phenomena | External supernatural threat |
| **Cosmic Horror** | Existential dread, unknowable forces, insignificance | Lovecraftian scale |
| **Body Horror** | Physical transformation, corruption, visceral biological dread | Flesh-focused terror |
| **Gothic Horror** | Atmosphere, decay, inheritance, haunted spaces | Gothic architecture + dread |
| **Folk Horror** | Rural tradition, ritual, landscape/community as threat | Old ways, harvest dread |
| **Slasher / Survival Horror** | Pursuit, entrapment, staying alive under threat | Chase/survive mode |
| **Internet / Analog Horror** | Web-native or media-native horror artifacts and storytelling | Creepypasta/ARG/analog mode |
| **Cozy Horror** | Spooky/uncanny atmosphere without intense terror | Comfort-spooky |
| **Apocalyptic Horror** | End-of-world collapse happening in real time as horror | Living through the end |

---

## Romance — 14 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Contemporary Romance** | Modern, real-world romance | Present-day romance spine |
| **Historical Romance** | Period setting, romance central | Any historical period |
| **Regency Romance** | Regency/Georgian England conventions | Ton, titles, social rules |
| **Paranormal Romance** | Supernatural setting/elements, romance spine | Vampires/shifters/fae + HEA/HFN expectation |
| **Romantic Comedy (RomCom)** | Comedy + romance co-central, light/warm structure | Banter + HEA |
| **Dark Romance** | Taboo/dangerous/morally complex romantic dynamics | Requires careful warnings |
| **Mafia / Organised Crime Romance** | Criminal ecosystem is the relationship context | Mob/mafia underworld romance |
| **Sports Romance** | Sport/athlete life central to romance context | Team/training/competition matters |
| **Workplace Romance** | Professional setting drives relationship proximity and conflict | Office/hospital/firehouse etc. |
| **Boys Love (BL)** | M/M romance with BL conventions/tradition | BL-specific reader expectation |
| **Girls Love (GL)** | F/F romance / yuri-adjacent conventions | GL-specific framing when relevant |
| **Omegaverse** | A/B/O dynamics as core relationship framework | Social/biological hierarchy framework |
| **Reverse Harem / Why Choose** | One lead, multiple love interests, no forced end-choice | RH/why choose convention |
| **New Adult Romance** | Ages ~18–25, first adult-life transitions, romance central | Between YA and adult market positioning |

---

## Thriller & Mystery — 10 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Cozy Mystery** | Amateur sleuth, low graphic violence, community puzzle | Cozy puzzle-first mystery |
| **Crime Thriller** | Investigation/procedural/criminal pursuit | Professional or high-stakes crime focus |
| **Psychological Thriller** | Tension from manipulation, perception, distrust | Mind-games and instability |
| **Espionage / Spy Thriller** | Intelligence, covert operations, geopolitical stakes | Agencies/secrets/tradecraft |
| **Legal / Court Drama** | Justice/procedure/courts central to tension | Trial/case-driven structure |
| **Conspiracy Thriller** | Hidden powers, institutions, dangerous truths | Cover-up/exposure structure |
| **Political Thriller** | Power, government, geopolitics, political machinery | State/policy/power stakes |
| **Heist** | Planning + execution of theft/con/operation | Plan and payoff are central |
| **Noir** | Fatalism, cynicism, moral ambiguity, urban grime | Noir sensibility/conventions |
| **Whodunit** | Fair-play clue mystery, solvable puzzle emphasis | Classic detective puzzle mode |

---

## Action & Adventure — 8 Subgenres (trimmed)

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Dungeon Crawl** | Exploration of dangerous dungeons/instances, traps, loot, survival | Adventurers enter the dungeon |
| **Survival** | Endurance against hostile environments/disasters/situations | Survival is the engine |
| **Superhero** | Superpowered conflict/adventure in modern/near-future settings | Capes/teams/vigilantes |
| **Martial Arts** | Combat craft, training, competition, philosophy (non-cultivation focus) | Real-world/light-speculative martial focus |
| **Military / War** | Combat, tactics, campaign action, cost of war | Action/war-first framing |
| **Pirate / Seafaring** | Ships, ocean travel, naval conflict, maritime adventure | Seafaring adventure identity |
| **Treasure Hunting / Exploration** | Expedition, discovery, ruins, archaeology-style adventure | Discovery-driven action |
| **Tower Climbing** | Vertical challenge progression floor-by-floor | Tower ascent as core structure |

**Moved out of Action & Adventure subgenres (v3):**
- **Mecha / Giant Robot** -> Sci-Fi Mecha subgenre + action tags as needed

---

## Comedy & Satire — 7 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Comedic Fantasy** | Fantasy setting where comedy is the core reading promise | Funny-first fantasy |
| **Parody** | Exaggerates genre conventions for comic effect | Direct imitation/mockery |
| **Absurdist Fiction** | Surreal logic, nonsense structures, meaning through absurdity | Reality misbehaves |
| **Romantic Comedy** | Romance and comedy co-drive the story | Romcom-first audience promise |
| **Workplace Comedy** | Workplace/social systems are the engine of humour | Job is the joke |
| **Social Satire** | Uses humour to critique institutions/culture | Society-targeted comedy |
| **Dark Comedy** | Humour around bleak/taboo/disturbing subject matter | Gallows humour mode |

---

## Contemporary Fiction — 8 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Slice of Life** | Everyday moments and lived texture over dramatic plot | Life-as-lived focus |
| **Coming of Age** | Identity formation and growth through formative experiences | Youth/transition arcs |
| **Family Drama** | Family relationships and tensions are central | Generational dynamics |
| **Workplace Fiction** | Career/professional life and identity at the centre | Work as social world |
| **Sports Fiction** | Competition/training/team identity in real-world setting | Sport-world first |
| **Campus / Academic Fiction** | School/university/academic institution defines culture and conflict | Campus systems matter |
| **Foodie Fiction** | Food/cooking/hospitality culture drives setting and story | Culinary-centred fiction |
| **Music Fiction** | Music creation/performance/industry central to story | Band/artist/scene focus |

---

## Historical Fiction — 8 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Ancient World** | Pre-medieval real historical settings | Egypt/Rome/Han/etc. |
| **Medieval** | Medieval-era historical settings (non-magical) | Approx. 500–1400 CE |
| **Renaissance & Early Modern** | 15th–17th century historical settings | 1400–1700 CE |
| **Victorian & Edwardian** | Industrial/class/empire era historical settings | 1800–1914 |
| **20th Century** | WWI through late Cold War historical fiction | 1914–1990 |
| **Non-Western Historical** | Historical fiction centred on non-European settings/perspectives | Any period, non-Western focus |
| **Alternate History** | Counterfactual historical divergence in a historical-fiction frame | “What if” history |
| **War Fiction (Historical)** | Historical conflict from soldier/civilian/community perspectives | War shapes the story |

---

## Literary Fiction — 7 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Magical Realism** | Mundane world with subtle magical elements treated as normal | Literary realism + quiet magic |
| **Satirical Fiction** | Narrative fiction used for social/political critique | Literary satire focus |
| **Philosophical Fiction** | Questions/ideas/ethics are primary content | Idea-driven literary fiction |
| **Absurdist Literary Fiction** | Literary absurdism, alienation, surreal systems | Kafka-adjacent traditions |
| **Political Fiction** | Power, ideology, governance as literary focus | Political systems as theme |
| **Autofiction** | Fictionalised autobiography/author-self blending | Memoir-fiction blur |
| **Speculative Literary Fiction** | Literary fiction with speculative elements, literary frame primary | Literary-first speculative |

---

## Paranormal & Supernatural — 7 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Ghost Story** | Hauntings/spirits/liminal spaces in a near-real setting | If dread dominates, choose Horror |
| **Witches & Covens** | Witchcraft, covens, magical community in near-real settings | Paranormal community focus |
| **Angels & Demons** | Divine/infernal beings in contemporary or near-real settings | Modern sacred/infernal conflict |
| **Psychic / Abilities** | Paranormal mental/perceptual abilities in real-world contexts | Psychic powers, no system framing |
| **Shifter Fiction** | Shapeshifter identity and community central (non-romance-primary) | Pack/shifter culture focus |
| **Urban Supernatural** | Hidden supernatural societies in real cities (less system-heavy than urban fantasy) | Secret supernatural underworld |
| **Occult / Cursed Objects** | Rituals, curses, occult phenomena, haunted artifacts | Paranormal object/event-driven stories |

**Moved out of Paranormal & Supernatural subgenres (v3):**
- **Paranormal Romance** -> Romance subgenre only (to reduce duplication)

---

## Non-Fiction & Essay — 7 Subgenres

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Personal Memoir** | First-person true-life narrative | Your lived experience |
| **Narrative Non-Fiction** | True events told with narrative/literary technique | Story-structured truth |
| **Personal Essay / Column** | Serialised reflection/opinion/personal perspective | Essayistic format |
| **Travel Writing** | Place/culture/movement as subject | Place and meaning |
| **Creative Non-Fiction** | Factually grounded but literary/crafted in form | Artful truth-telling |
| **Craft & How-To** | Writing/process/skill guidance for readers/creators | Practical instruction |
| **Investigative / Deep Dive** | Research-driven serial or longform inquiry | Evidence/explainer reporting |

---

## Fan Fiction — 12 Subgenres

Fan Fiction uses its own subgenre system because fan fiction conventions describe **the story’s relationship to canon/source**, which is a primary fanfic discovery axis.

Every Fan Fiction story **also** receives a **Secondary Genre Classification** from the original-fiction Primary Genres above (single select, required). This powers cross-genre discovery.

| Subgenre | Description | Author Guidance |
|----------|-------------|-----------------|
| **Canon Compliant** | Consistent with canon and set within canon logic | Gap fills / canon-consistent extensions |
| **Canon Divergent** | Follows canon until a branching point | “What if X happened instead?” |
| **Alternate Universe (AU)** | Characters/premise recontextualised in a different setting | Coffee shop AU, school AU, etc. |
| **Fix-It** | Rewrites canon outcomes to repair perceived failures | Saves characters / fixes endings |
| **Crossover** | Multiple canons/properties intersect | Shared canon collision |
| **Reader Insert / Self-Insert** | Reader stand-in or self enters canon world | Y/N or self-insert convention |
| **OC-Centric** | Original character is the focal lead in canon world | New protagonist in known universe |
| **Continuation / Sequel** | Continues events after canon ends | “What happened next?” |
| **Prequel** | Set before canon | Backstory/origin events |
| **Retelling** | Canon story retold from another lens | Alternate POV/angle |
| **Real Person Fiction (RPF)** | Fiction about real public figures | Must display prominent RPF warning |
| **Fusion** | One canon’s structure/world overlaid with another’s characters/elements | Canon A in Canon B framework |

### Fan Fiction Additional Metadata (required/optional)
When **Fan Fiction** is selected as Primary Genre, the author also completes:

- **Fandom** (required, up to 3)
- **Secondary Genre** (required, single select from original-fiction primary genres)
- **Relationship Tags** (optional, up to 3; structured Character/Character or Character & Character)

This preserves fanfic-native discovery while enabling genre-side discovery.

---

# Layer 3 — Content Tags

Tags are optional, cross-genre, and selected from a curated list. Authors may select **up to 12 tags** from discovery groups.

Tags are **not freeform**. The list is curated and governed. Authors can suggest new tags through a dedicated flow.

Tags are organised into **8 groups**. Authors can browse by group, search globally, or receive suggestions.

### Cap Rules (revised)
- **Discovery tag cap:** up to **12**
- **Tone & Mood:** unlimited, does **not** count toward cap
- **Representation:** unlimited, does **not** count toward cap

### Tag Scope Rule (NEW / clarified)
**Tags are for reader-experience, narrative, and discovery signals — not publication-state metadata.**  
Publication Status (e.g., Ongoing, Complete, Hiatus) and update cadence are stored separately and surfaced through dedicated UI labels/filters, not taxonomy tags.

### Tag Deduplication Rule (NEW)
A concept should exist in **one layer only** unless there is a clear distinction between:
- **Subgenre (structural convention)** and
- **Tag (trope/feature/mood)**

Where duplication is unavoidable, the UI should explain the difference.

---

## Group 1: Tone & Mood *(unlimited — does not count toward cap)*

These tags describe the **emotional experience** of reading the story.

| Tag | Description |
|-----|-------------|
| Dark & Gritty | Bleak world, hard choices, moral ambiguity |
| Cozy & Warm | Comfort reading, low threat, soft feelings |
| Bittersweet | Joy and sorrow intertwined |
| Hopeful | Things may be bad, but there is forward light |
| Bleak | Unrelenting darkness, tragic/nihilistic tone |
| Humorous | Funny throughout, not just occasional jokes |
| Satirical | Humour used to critique real systems/culture |
| Philosophical | Ideas/questions matter as much as events |
| Tense & Suspenseful | Constant anticipation/unease |
| Slow & Immersive | Atmospheric, deliberate pacing |
| Fast-Paced | High plot velocity |
| Melancholic | Wistful sadness/loss |
| Uplifting | Emotionally restorative or encouraging |
| Whimsical | Playful, imaginative, lightly surreal |
| Nostalgic | Memory/looking-back emotional texture |
| Intense | Emotionally or physically extreme feel |
| Eerie | Unsettling atmosphere without full horror commitment |

---

## Group 2: Romantic & Relationship Elements *(counts toward 12-tag cap)*

| Tag | Description |
|-----|-------------|
| Slow Burn | Romance develops gradually over many chapters |
| Enemies to Lovers | Adversaries become romantic partners |
| Friends to Lovers | Friendship becomes romance |
| Forbidden Love | Relationship crosses social/political/moral boundary |
| Second Chance | Former lovers reconnect |
| Love Triangle | Three-way romantic tension |
| Unrequited Love | One-sided romantic feeling |
| Found Family | Chosen familial bonds form between non-blood characters |
| Polyamory | Multiple consensual romantic relationships |
| Age Gap | Significant age difference between romantic leads |
| Forced Proximity | Characters must remain near each other |
| Fated Mates | Destined/supernatural bond |
| Harem | One lead, multiple romantic/sexual interests (anime/manga convention) |
| Possessive / Jealous Lead | Possessiveness is a featured dynamic |
| Marriage of Convenience | Practical arrangement develops real feelings |
| Slow-Build Relationship | Deep non-romantic relationship develops slowly |

---

## Group 3: Character & POV *(counts toward 12-tag cap)*

| Tag | Description |
|-----|-------------|
| Female Lead | Primary protagonist is female |
| Male Lead | Primary protagonist is male |
| Non-Binary Lead | Primary protagonist is non-binary/genderqueer |
| Non-Human Lead | Protagonist is monster/AI/dungeon/animal/etc. |
| Multiple POV | More than one key perspective character |
| Single POV | One exclusive perspective |
| First Person | “I” narration |
| Second Person | “You” narration |
| Unreliable Narrator | Narrator cannot be fully trusted |
| Anti-Hero | Morally grey or flawed protagonist |
| Villain Protagonist | Lead is antagonist or morally dark focal |
| Child / Teen POV | Young perspective character(s) |
| Ensemble Cast | Large group of co-important characters |
| Morally Grey Characters | No clean heroes/villains |
| Competent Lead | Skilled/capable protagonist from early on |
| Reluctant Hero | Protagonist resists the role/calling |

---

## Group 4: Plot & Structure *(counts toward 12-tag cap)*

| Tag | Description |
|-----|-------------|
| Nonlinear | Fragmented chronology, timeline jumps |
| Slow Start | Takes time before main conflict ignites |
| Action from Page One | Immediate high-energy opening |
| Plot Twists | Surprise reveals materially change understanding |
| Mystery Box | Central long-arc mystery unfolds gradually |
| Character Study | Psychology/interiority is primary focus |
| Plot-Heavy | Event progression prioritized over introspection |
| Dual Timeline | Two time periods run in parallel |
| Cliffhangers | Chapters frequently end unresolved |
| Framing Device | Story-within-story / mediated narration |
| Standalone | Complete narrative, no sequel required |
| Anthology | Multiple standalone pieces in shared frame |
| Political Intrigue | Factions/court/power manoeuvring central |
| Heist / Caper | Planning + execution structure central |

---

## Group 5: World & Setting *(counts toward 12-tag cap)*

| Tag | Description |
|-----|-------------|
| Original World | Entirely invented setting |
| Real-World Setting | Set in the real world (modern or historical) |
| School / Campus | Education setting is primary |
| Small Town | Rural/small-community setting |
| Big City | Urban/metropolitan setting |
| Space Setting | Space stations/ships/alien worlds |
| Historical Setting | Specific historical era as setting feature |
| Non-Western Setting | Non-European/North American setting focus |
| Mythology-Based | Uses real mythological traditions as core source |
| Virtual World / Game World | Simulation/game/VR setting |
| Underwater / Ocean | Aquatic or maritime world focus |
| Underground / Subterranean | Caves/deep earth/underground cities |
| Multi-World / Dimensional | Multiple worlds/planes/dimensions |
| Post-Apocalyptic World | Set after civilisation collapse |
| Prison / Captivity Setting | Constrained/controlled setting |

---

## Group 6: Power & Progression *(counts toward 12-tag cap)*

| Tag | Description |
|-----|-------------|
| Power Fantasy | Empowerment wish-fulfilment is core appeal |
| Underdog | Disadvantaged/underestimated protagonist |
| Overpowered Lead | Extremely powerful protagonist early on |
| Weak to Strong | Clear growth from weak to formidable |
| Slow Progression | Growth is gradual and earned |
| Smart Lead | Intelligence/planning is primary weapon |
| Tactical / Strategy | Conflict resolved through planning/strategy |
| Magic System (Hard) | Rules-based, explicit magic logic |
| Magic System (Soft) | Mystical/impressionistic magic logic |
| RPG Elements | Game-like mechanics/classes/levels exist |
| System / Status Screen | Visible UI/stat menus/status overlays |
| Crafting / Building | Making/building is a recurring engine |
| Monster Evolution | Evolution stages/tiers are central |
| Regression | Return to an earlier time with memory/knowledge |
| Skill Trees / Abilities | Structured ability unlock paths |

---

## Group 7: Tropes & Story Patterns *(counts toward 12-tag cap)*

| Tag | Description |
|-----|-------------|
| Chosen One | Prophesied/selected/destined protagonist |
| Reincarnation | Character dies and is reborn |
| Time Loop | Repeating temporal period |
| Revenge Plot | Vengeance drives the story |
| Redemption Arc | Moral recovery of flawed/villainous character |
| Mentor / Apprentice | Teacher-student dynamic central |
| Tournament Arc | Structured competition framework |
| Hidden Identity | Concealed true identity/status |
| Secret Society | Hidden organisation exerts power |
| Academy / School Arc | Training/school arc structure |
| Transmigration | Consciousness moves to another body/world |
| Awakening / Unlock | Hidden power/truth is discovered |
| Survival Games | Forced deadly competition |
| Dungeon Diving | Repeated dungeon/instance exploration for growth/loot |
| Kingdom Building | Building/governing a domain is a recurring plot engine |
| Monster Taming | Capture/raise/bond with creatures |
| Apocalypse Prevention | Trying to stop impending catastrophe |

**Removed duplicate (v3):**
- **Found Family** duplicate removed here (retained in Romantic & Relationship Elements for cross-genre relational discovery consistency)

---

## Group 8: Representation *(unlimited — does not count toward cap)*

These tags signal inclusive representation. They are **allow-list filters only** (readers can filter for, not exclude).

### Representation Terminology Policy (NEW)
Representation tags should use **respectful, community-informed terminology** and **clear definitions**. If a concept is important but the platform does not yet have appropriate wording or scope, it should be **deferred for review** rather than shipped with ambiguous or harmful language.

| Tag | Description |
|-----|-------------|
| LGBTQ+ Leads | One or more primary characters are LGBTQ+ |
| LGBTQ+ Themes | Queerness is a thematic element |
| POC Leads | One or more primary characters are people of colour |
| Disability Rep | Meaningful disability representation |
| Neurodivergent Leads | ADHD/autism/dyslexia/etc. representation |
| Religious Themes | Faith/spirituality is explored |
| Cultural Specificity | Rooted in specific cultural tradition/context |
| Mental Health Focus | Mental health explored with depth/care |
| Chronic Illness Rep | Characters living with chronic illness |
| Indigenous Perspectives | Indigenous peoples/knowledge/worldviews centred |
| Trans Protagonist | Explicit trans main character |
| Multilingual | Multiple languages used meaningfully |

---

## Publication Metadata (non-tag, non-taxonomy metadata)

The following are **not taxonomy tags** and are stored in dedicated metadata fields:

- **Publication Status** (e.g., Ongoing, Complete, Hiatus)
- **Update Cadence** (author-supplied freeform field)

These may be displayed as reader-facing labels and may be filterable in discovery UI, but they do not consume tag slots.

---

# Layer 4 — Content Rating & Warnings

Content rating is **mandatory** and separate from genre/tag UI. Its role is audience routing, trust, and safety.

## Content Ratings

| Rating | Description | Age Gate | Comparable |
|--------|-------------|----------|------------|
| **Everyone** | Suitable for all ages; no graphic violence/sexual content; only mild fear/themes | None | G / U |
| **Teen** | Mild violence/language, age-appropriate romance, non-graphic scary themes | None (parental advisory) | PG-13 / 12 |
| **Mature** | Strong language, violence, non-explicit sexual content, dark/complex themes | Soft gate | MA15+ / 15 |
| **Adult 18+** | Explicit sex, extreme violence, or content requiring adult verification | Hard gate | R18+ |

## Content Warning Checkboxes

Authors select all applicable warnings. Readers can filter out stories with specific warnings.

### Violence & Physical Safety
- Violence
- Gore / Body Horror
- Death of Major Character
- Child Endangerment
- Animal Harm
- Torture / Extreme Violence
- Genocide / Mass Violence
- Kidnapping / Captivity

### Sexual Content
- Sexual Content (Explicit)
- Sexual Content (Fade to Black)
- Non-Consensual Scenarios
- Dubious Consent
- Age Gap (Sexual)
- **Underage Sexual Content** — **not permitted on platform** (policy violation, not a warning)

### Themes & Emotional Content
- Self-Harm / Suicide
- Abuse (Physical, Emotional, or Sexual)
- Substance Use / Addiction
- Mental Health Themes
- Eating Disorders
- Profanity (Heavy)
- Religious / Spiritual Content
- Slavery (Depicted)
- Racism / Discrimination (Depicted)
- Gaslighting / Manipulation
- Infidelity
- Pregnancy Loss / Miscarriage
- Parental Death
- Body Dysmorphia
- Stalking

### Warning UX Rule (NEW)
Warnings should support **reader safety**, not moral judgment. UI copy should explicitly state this in onboarding and edit flows.

---

# Layer 5 — Format

Format affects reading UI, sorting, and product behaviour. It is **not a genre**.

| Format | Definition | UI Implications |
|--------|-----------|-----------------|
| **Serial Novel** | Ongoing chapter-based story | Update cadence, subscribe CTA, progress |
| **Complete Novel** | Finished long-form work, all chapters available | Binge-ready badge, read time |
| **Novella** | Complete work ~20k–50k words | Word count prominent |
| **Short Story** | Complete work under ~20k words | Read time prominent |
| **Short Story Collection** | Multiple shorts in one collection | Internal story navigation |
| **Flash Fiction Collection** | Very short pieces (often sub-1k) | Card/swipe reading UI |
| **Verse / Poetry** | Story primarily in verse/poetic form | Verse-friendly layout |
| **Interactive / CYOA** | Reader choices affect path | Branching UI |
| **Anthology** | Multi-author works with shared theme/world | Multi-author attribution |
| **Essay / Column** | Serial or standalone non-fiction essays | Essay layout, optional citations |
| **Webcomic / Illustrated Serial** | Primarily visual storytelling | Image-first/panel UI |

### Format vs Publication Status (NEW clarification)
**Format** describes the structural type of the work (e.g., Serial Novel, Complete Novel, Short Story, Novella, Interactive / CYOA).  
**Publication Status** describes the work’s current release state (e.g., Ongoing, Complete, Hiatus) and is separate from taxonomy tags.  
**Update cadence** is author-supplied publication metadata (freeform) and is not part of the taxonomy tag system.

This keeps structural classification separate from state/cadence metadata and prevents tag-slot duplication.

### Experimental Form Coverage (v3)
Work that was previously “Experimental” as a primary genre is now captured by:
- **Format** (Interactive/CYOA, Verse/Poetry, Webcomic, Anthology)
- **Subgenre** (e.g., Literary absurdism, docu-style modes in appropriate genres)
- **Tags** (In-Universe Documents, Multimedia-style tags if added later)

---

# Discovery & Recommendation Architecture

The taxonomy only matters if it powers excellent discovery.

## Discovery Surfaces

| Surface | Primary Signal | Secondary Signal | Notes |
|---------|---------------|-----------------|-------|
| **Browse by Genre** | Primary Genre | Subgenre -> tags -> rating | Every Primary Genre gets a landing page |
| **Personalised Feed** | Reading-history affinity model | Completion rate, saves, ratings | Requires data history |
| **You Might Also Like** | Weighted tag overlap | Subgenre, rating, word count, format | On story pages |
| **Trending** | Recent velocity (reads + adds + engagement) | Normalised by story age | Global + per-genre |
| **New Releases** | First publish date | Reader prefs | Fresh content |
| **Completed Only** | Format + complete signals | Genre/tags/rating | Binge readers |
| **Rising Stars** | Velocity for stories <30 days old | Reader affinity | **Per-genre required** |
| **Genre Deep Dive** | Primary Genre + subgenres | Genre-specific tag chips | Genre feels like a home |
| **Mood Match** | Tone & Mood cluster | Reader historical mood preference | First-class surface |
| **Fandom Browse** | Fandom metadata | Relationships, secondary genre | Fanfic-first flow |
| **Search** | Full-text title/description | Structured filters | Text + metadata |
| **Community Lists** | Curated lists | Sort by genre/mood/completion | Community-led discovery |
| **Exclusion Filtering** | User hidden tags/warnings | Persistent across surfaces | “Never show me X” |

## Recommendation Tag Weighting (revised framing)
Use weights, but treat them as **learned defaults**, not fixed forever.

| Tier | Starting Weight | Examples | Why |
|------|------------------|----------|-----|
| **Tier 1 — Identity** | 3x | Core experiential tags (e.g., Slow Burn, Power Fantasy, Dark & Gritty) | Defines reading promise |
| **Tier 2 — Structure** | 2x | Multiple POV, First Person, Character Study, Slow Start | Strong format/reading preferences |
| **Tier 3 — Tropes** | 1.5x | Enemies to Lovers, Time Loop, Found Family | Community/high-interest signals |

### Weighting Rule (NEW)
Weights should be **validated quarterly** against:
- click-through rate
- chapter-3 retention
- completion rate
- save/library-add rate

Avoid hard-coding long-term assumptions without behavioural validation.

## Mood Match Clusters (starter set)

| Cluster | Mood Tags | Emoji |
|---------|-----------|-------|
| **Light & Uplifting** | Cozy & Warm, Humorous, Hopeful, Whimsical, Uplifting | ☀️ |
| **Dark & Immersive** | Dark & Gritty, Bleak, Tense & Suspenseful, Melancholic, Intense | 🌙 |
| **Emotional** | Bittersweet, Slow & Immersive, Philosophical, Nostalgic | 💫 |
| **High Energy** | Fast-Paced, Tense & Suspenseful, Intense | ⚡ |
| **Cozy** | Cozy & Warm, Slow & Immersive, Humorous, Whimsical | 🍵 |
| **Intense** | Dark & Gritty, Tense & Suspenseful, Fast-Paced, Bleak, Intense | 🔥 |
| **Spooky** | Eerie, Dark & Gritty, Tense & Suspenseful | 🎃 |

**Note (v3):** “Action from Page One” removed from mood clusters because it is a structure tag, not mood.

---

# Taxonomy Governance

A genre taxonomy is living infrastructure. Governance keeps it healthy.

## Ownership

| Decision Type | Owner | Process |
|---------------|-------|---------|
| Add new Primary Genre | Executive / Product Lead | Rare, data-driven, strategic |
| Add new Subgenre | Editorial Team / Taxonomy Owner | Quarterly review + evidence threshold |
| Add new Tag | Editorial Team / Taxonomy Owner | Monthly review of suggestion queue |
| Merge duplicate tags | Taxonomy Owner | Ongoing; automatic migration + aliases |
| Retire tag/subgenre | Editorial Team | Low-use threshold + migration + notice |
| Rename tag/subgenre | Taxonomy Owner | Alias maintained + author notification |
| Author re-categorisation | Author self-serve | Primary Genre subject to cooldown |
| Reader-reported mismatch | Moderation queue | Threshold triggers review |

## Taxonomy Owner Role
A named owner (even part-time at launch) is required. They:
- Review suggestion queue weekly
- Run quarterly review
- Monitor co-occurrence anomalies
- Publish changelog
- Coordinate Genre Champions

## Genre Champions (Community Volunteers)
2-3 per major genre; advisory only (no direct taxonomy-edit rights). They:
- Review suggestions
- Flag mismatch issues
- Surface emerging conventions
- Advise on quarterly reviews

## Quarterly Taxonomy Review Checklist (revised emphasis)
1. Promote suggestions that meet thresholds
2. Retire/merge low-use tags
3. Find semantic duplicates
4. Review external trend emergence (other platforms, reader communities)
5. Audit top stories per genre for misclassification patterns
6. Review contradictory tag pairs and warning omissions
7. Check bounce/churn by tag source
8. Update author guidance examples
9. Publish changelog with deprecation notice windows
10. Review Champion feedback

---

# Anti-Gaming Measures

| Measure | How It Works |
|---------|-------------|
| **Per-genre discovery parity** | Each Primary Genre gets Trending/Rising/New Releases surfaces |
| **Reader mismatch reporting** | Prompt after chapter 3: “Does this match its tags/genre?” |
| **Automated drift detection** | >70% discovery mismatch source triggers author review prompt |
| **Tag limits** | 12-tag cap reduces tag stuffing |
| **Tag contradiction prompts** | Soft warnings for rare/contradictory pairs (not hard blocks) |
| **Reader engagement signals** | High bounce from tag-sourced clicks flags potential misuse |
| **Genre change logging** | Primary Genre changes visible and auditable |

### Contradiction Handling Rule (NEW)
Use **soft enforcement** (“These are rarely used together — keep both?”) rather than hard rejects for most cases. Hard blocks should be reserved for policy/safety violations only.

Publication-state metadata (e.g., Complete, Hiatus) is validated separately from taxonomy tags and may be system-verified or moderation-reviewed where relevant.

---

# Appendix A — Classification Decision Tree (NEW)

Use this in author onboarding and help docs.

## Step 1: Is it Fan Fiction?
- If based on existing IP/public figures -> **Primary Genre = Fan Fiction**
- Then choose **Fanfic Subgenre + Fandom + Secondary Genre**

## Step 2: Is it Non-Fiction?
- If presented as true/essay/memoir/journalistic/craft content -> **Non-Fiction & Essay**

## Step 3: Is the world speculative?
- Magic/mythic systems -> likely **Fantasy**
- Speculative tech/science/futures -> likely **Science Fiction**
- Paranormal in near-real setting without horror/romance dominance -> **Paranormal & Supernatural**

## Step 4: What is the core narrative engine?
- Romantic relationship -> **Romance**
- Fear/dread -> **Horror**
- Investigation/suspense/revelation -> **Thriller & Mystery**
- Quest/conflict/exploration/survival -> **Action & Adventure**
- Humour/parody/social critique -> **Comedy & Satire**

## Step 5: If real-world and non-speculative
- Commercial/dramatic/slice-of-life -> **Contemporary Fiction**
- Period setting -> **Historical Fiction**
- Literary/upmarket/theme/prose-first -> **Literary Fiction**

---

# Appendix B — Author Onboarding Classification Flow (Revised)

The process should feel fast and helpful.

**Step 1: “What kind of story is this?”**  
Show 13 Primary Genres as cards + one-line examples.

**Step 2: “Any specific flavour?”**  
Show filtered subgenres (up to 3). Include “Skip.”

**Step 3: “Help readers find you”**  
Suggest tags based on Primary Genre + Subgenres.  
- Up to 12 discovery tags  
- Tone & Mood / Representation always free

Tags describe **story content and reader experience** (tropes, mood, structure, world, progression). **Publication status and update cadence are handled separately** and do not use tag slots.

**Step 4: “Content rating”**  
Clear examples; single select.

**Step 5: “Content warnings (reader safety)”**  
Grouped checkboxes. “None of the above” visible.

**Step 6: “How is this published?”**  
Format selection. Auto-suggest from current manuscript/chapter structure.

### Onboarding Assist Prompts (NEW)
Use confidence prompts for common misclassifications:
- “If the romance were removed, would the story still work?” (Romance check)
- “Is the world speculative because of magic, tech, or paranormal rules?” (Speculative check)
- “Is the comedy the main reason readers are here?” (Comedy check)
- “Is this a real-world story with supernatural elements, or a fantasy world/system?” (Paranormal vs Fantasy check)

Target completion time remains **~60–90 seconds** for a thoughtful author.

---

# Appendix C — Governance Rules for New Terms (NEW)

## Add a Subgenre only if all are true:
1. It has a clear, stable reader meaning
2. It is not just a mood/tone tag
3. It is not just a protagonist identity tag
4. It appears in meaningful volume and user language
5. It improves discovery precision more than it increases complexity

## Add a Tag only if all are true:
1. Authors use the concept repeatedly
2. Readers search/filter for it
3. It is definable in one line
4. It is not a synonym of an existing tag
5. It is not better represented as subgenre/warning/format

---

# Appendix D — Complete Taxonomy Count (v3.2, estimated)

| Component | Count |
|-----------|-------|
| Primary Genres | 13 |
| Subgenres (total across all genres) | ~120 (estimated) |
| Content Tags (total across all groups) | ~130–135 (estimated; excludes publication-state metadata) |
| — Tone & Mood (uncapped) | 17 |
| — Romantic & Relationship | 16 |
| — Character & POV | 16 |
| — Plot & Structure | 14 |
| — World & Setting | 15 |
| — Power & Progression | 15 |
| — Tropes & Story Patterns | 17 |
| — Representation (uncapped) | 12+ (subject to terminology review) |
| Content Ratings | 4 |
| Content Warnings | 29 |
| Formats | 11 |
| Total Classification Options | ~310–325 (estimated) |

This remains significantly more structured than Wattpad/RoyalRoad and far more governable than freeform AO3-style wrangling without a large volunteer workforce.
