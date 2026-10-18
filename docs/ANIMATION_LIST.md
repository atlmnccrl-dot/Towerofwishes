# Animation list: main characters

This covers every animation the six heroes need (Eiryn, Kael, Aerys, Nox, Braxen, Eloryn), plus the two prologue characters (Alric and the unknown climber), and what the cutscenes need.

Sources:
- the 430-event inventory (`docs/source/MASTER_HANDOFF_2026-10-17.txt`);
- the author's decisions (for example, Aerys's Spear of Light);
- the moves already in the fight code.

Labels:
- **[canon]**: named or described in the inventory or by the author.
- **[working name]**: a name I gave a move. Rename freely.
- **OPEN**: the inventory hasn't decided it. I don't invent it.

---

## 0. How to read this list

### Tiers and directions

| Tier | What it is | Directions to draw |
|---|---|---|
| **A: Move** | idle, walk, run, turn | **5** (S, SE, E, NE, N). The game mirrors the other three. |
| **B: Fight** | attacks, defence, reactions | **5**. Fights happen at any angle. |
| **C: Signature** | specials and heavy arts | **2–3** (S, SE, E). Heavy arts play as cutscenes with a chosen camera angle. |
| **D: Story** | acting moments in cutscenes | **1–2**, only the angle the shot uses. I'll name the angle for each one. |

Tier D is the big saving: a cutscene animation only needs the one view the camera sees.

### Frame counts (any rate works; the JSON timings are read)

| Kind | Frames |
|---|---|
| idle | 12–24, loop |
| walk, run | 16–24, loop (36 works but makes heavier files) |
| basic attack | 10–16 |
| special | 16–30 |
| heavy art | 30–60 |
| hit, dodge, parry | 6–12 |

### Hit timing
For every attack, tell me the frame the blow lands on (for example, "hit on frame 7"). That's when the game applies damage, the spark and the screen shake. If it's a multi-hit, list every hit frame.

### Same rules as before
- Transparent background.
- Same scale and feet anchor as the base sprite.
- No shadow baked in.
- Name each ZIP `<character>_<animation>_<direction>`, with the direction **as seen on screen**.

### Phases
Attacks can come as one sheet. Mark the wind-up, hit and recover frames and the game splits them, so it can cancel a wind-up when the fighter is hit.

---

## 1. Shared set (every playable hero)
Each of the six needs all of these. Character-specific versions are in section 2.

| # | Animation | Tier | Notes |
|---|---|---|---|
| 1 | idle | A | Breathing, weight shift. Weapon ready in fights. |
| 2 | idle_relaxed | A | Weapon put away, for towns and scenes. Can be skipped if 1 works for both. |
| 3 | walk | A | |
| 4 | run | A | Also used for the All Out rush. |
| 5 | basic attack | B | Combo pieces are listed per character. |
| 6 | parry / block | B | Automatic defence. |
| 7 | dodge | B | A sidestep or roll, about 0.3 s. |
| 8 | hit | B | Light flinch. |
| 9 | stagger | B | Big flinch, off balance, about 0.8 s. |
| 10 | knockdown + get up | B | One sheet: fall, short lie, rise. |
| 11 | defeated | B | Falls and stays down. Used on a loss; never a death unless the story says so. |
| 12 | drained (exhausted) | B | Hunched, heavy breathing, loop. Shown after **All Out** and when stamina runs out. |
| 13 | All Out activation | C | A short power-up pose, about 0.5 s, the same moment for all heroes. |
| 14 | victory | C | End-of-fight pose. |
| 15 | cast / channel | B | Only for casters (Eiryn, Aerys, Eloryn): a hold-and-charge loop. |
| 16 | talk idle | D, S | Standing, speaking: a light gesture loop. |
| 17 | gestures | D, S | Point; arms crossed; hands on hips; hand to chin; shrug; laugh; nod; shake head. |
| 18 | sit, sit-talk, sit-eat/drink | D, S | Tavern, inn, campfire. |
| 19 | look up / look around | D, S | |
| 20 | pick up / hand over | D, S | Coins, items, the miller's sacks, rewards. |

**That's about 14 animations in 5 directions plus about 6 in one direction, roughly 75 sheets per hero.**

To cut it down:
- **Draw tiers C and D first.** Tier B can start with only S, E and N.
- **Use 3 directions instead of 5.** Hits, staggers and dodges are very short, so S, E and N are enough there. That brings it to about 55 sheets.

---

## 2. Per character

### EIRYN: ancient glyph caster (Pressure, Negation, preservation)

Basic attacks, **Tier B**:
- **Pressure** [canon]. A palm thrust that sends a force glyph forward as a ranged push. Her main attack.
- **Close Pressure** [canon kind]. A short-range shove when something gets close.

Special, the host Special button, **Tier C**:
- **Negation** [canon, TW-025 "Negation defense"]. She raises a glyph that cancels an incoming attack.
  - Needed: raise glyph → hold → release.
  - The exact gameplay rule is mine to propose (blocks one heavy attack aimed at the party). It needs your approval.

Heavy arts, **Tier C, as cutscenes**:
- **Force Lance** [the book's "narrow path of force", the Ogre kill]. Both hands drive a line of force forward.
  - Frames: draw the glyph → compress → fire.
- **Pressure burst** [canon kind]. A glyph on the ground erupts around her.

Movement and status:
- **Pressure launch** [canon, opening]. She casts a glyph under her feet and is flung up and forward.
  - Frames: crouch, launch, airborne, land.
- **Spell fizzle** [canon, bandit scene]. Her glyph flickers and dies, and she sags.
- **Mana-empty idle and walk** [canon, after the preservation spell]. Unsteady, a hand on something. Used until the Ogre.

Story-only, **Tier D**:
- rooftop run and leap (the opening), in her pre-Reset outfit if it differs;
- caught by Alric and the hug;
- screaming at the Reset;
- casting the **preservation spell** (TW-029–033): kneel, glyph, light engulfs her;
- waking (only in the TW-254 flashback);
- warming tea with a tiny glyph (the fine scene);
- the Guild test: moving a stone block with a small Pressure, a floating counter;
- the **emotional overload** (TW-395): every remaining spell released at once, the finale.

### KAEL: swordsman, physical improviser

Basic attacks, **Tier B**:
- **Slash combo** [canon kind], 3 pieces: horizontal slash, return slash, heavier downward finisher.
- **Riposte**: a quick counter cut right after a parry.

Special, **Tier C**:
- **Sword technique** [working name; its look isn't described in the book].
  - My proposal: a lunging rising cut that knocks the foe back. Tell me what Kael's special should be.

Heavy art, **Tier C**:
- **Blade art** [working name]. A multi-cut flurry, then a sheathe.

Without a sword [canon, sky-beast arc TW-089 onward; he loses his sword], **Tier B**:
- punch combo;
- grapple / throw;
- being thrown.

He fights unarmed until he buys a new sword.

Story-only, **Tier D**:
- **drops from above, plants his sword in the ground, pulls it free** (bandit rescue);
- **throws his sword** into the sky beast (TW-089);
- **thrown into a wall** (Ogre 60% beat);
- sprint to the treeline (exists);
- eat / complain at the tavern table;
- walk out of the tavern;
- pay the fine (hand over coins);
- getting the **Sword of Calamity** (TW-336: draw, first swing);
- carrying someone (the medical rush).

After Floor 2: **Sword of Calamity** versions of his attacks, special and heavy art [canon: the sword's abilities].
- What the sword does is not yet defined. I need the roster or your description.

### AERYS: Light user, flyer (hunted for her blood)

Basic attacks, **Tier B**:
- **Light** [canon]. A light bolt from the hand, ranged. You said the current one looks good; keep its feel.
- **Light strike** [working name]. A short-range light palm for when enemies get close.

Heavy art, **Tier C**:
- **Spear of Light** [author's design]:
  1. She closes her hands.
  2. She spreads them apart; a spear of light forms between them.
  3. She grabs it.
  4. She throws it.
  - Two parts help most: (a) form-and-grab, then (b) the throw. I'll draw the flying spear in code.

Movement and status:
- **hover idle** and **flying move** [canon: she lifts off the ground].
- **take off / land**.

Story-only, **Tier D**:
- the sky-beast chase in the air;
- **countered and knocked out of the air** (TW-089 onward);
- recruitment;
- **stabbed** (Labyrinth) and **treated in the clinic**: lying, wounded;
- **abducted** (Beast Folk arc);
- the **Nox shields her** moment (TW-333): her side of it.

### NOX: assassin, Shadow Step

Basic attacks, **Tier B**:
- **Twin-blade combo** [canon kind: daggers], 3 fast pieces.

Special, **Tier C**:
- **Shadow Step** [canon]: short-range teleport.
  - Frames: vanish (smear or dissolve), then reappear with a strike.
  - Two sheets: `vanish` and `appear_strike`. I place the reappearance anywhere in code.

Heavy art, **Tier C**:
- **One Step — A Thousand Wounds** [canon, rare, costs him lifespan]:
  - stance → vanish → (code: slashes everywhere) → reappear → **a cost reaction** (coughing, a hand to his chest).
  - The cost reaction should exist as its own animation.

Movement:
- **chained Shadow Steps** [canon TW-215]: reuses the vanish and appear sheets.
- A **landing from above** (the drop on Braxen).

Story-only, **Tier D**:
- **the Guild Hall execution** (his first appearance, TW-108 onward): a blade at the throat, the kill. One angle, directed.
- **blade at Kael's throat from behind**;
- **catching Eloryn with Shadow Step** (TW-326);
- **shielding Aerys bodily** (TW-333): a deliberate stand under falling skyfire;
- **Nightcrawler finisher**: teleporting strike into the creature's eye (game-approved).

### BRAXEN: hybrid, altered arms (strength)

Basic attacks, **Tier B**:
- **Altered-fist combo** [canon kind], 2–3 heavy punches.
  - The bone ridges in his arms shift during the punches [canon description].

Special, **Tier C**:
- **Guard** [working name; protector role]. Arms raised; takes the hit for an ally.
  - This is the natural party-protection move: he steps in front of an ally.
  - Rule proposal: draws enemy attacks for a few seconds.

Heavy art, **Tier C**:
- **Ground smash** [working name, current code calls it "Bone Breaker"]. Both fists into the ground; a shockwave.

Equipment variant [from the handoff example]:
- **Dragon hand**: his arm becomes a dragon claw, the fist ignites, flame punch.
- Needs: an arm-transform clip and a flame-punch attack.

Story-only, **Tier D**:
- standing among dead beasts, wounded, then healed by Eloryn (sitting, braced);
- the hybrid reveal (TW-172);
- the **frost trial** and his **permanent frost injury** (TW-309–310).
  - After that, his idle and walk need a **frost-scarred version**: a different arm, or the scar drawn on.
- **his death in the Guardian fight** (canon, permanent).

### ELORYN: healer (powerful, dangerous)

Basic attacks, **Tier B**:
- **Push of Light** [working name]: a weak ranged push. She rarely fights.

Special, **Tier C**:
- **Heal** [canon]: hands glow green-white over an ally.
  - Frames: start → hold loop → end.

Heavy art, **Tier C**:
- **Overhealing / aging technique** [canon TW-152; the cost shows on her body].
  - Needed: the cast, then **a cost reaction** (she shakes and weakens).
  - The exact look of the aging cost isn't described. Describe it, or I'll show it as tremble and fade only.

Story-only, **Tier D**:
- clinic work: bandaging; kneeling over a patient (Aerys);
- heals Braxen in the field;
- **her death in the Hall of Offering**: taken as the fifth sacrifice, permanent, TW-341–355.

### ALRIC (prologue only, Tier D unless noted)
- rooftop run and leap (Tier A run, 2–3 directions);
- crouch and **vampiric leap**;
- catching Eiryn, then the hug;
- the street stroll;
- **orders the preservation spell**: urgent gestures;
- **transforms into the vampiric beast** and **shields her** with his body as the fire comes down.
  - **The beast form's design is still needed: a description or a reference image.**

### THE UNKNOWN CLIMBER (prologue fight, playable)
- **Tier A–B set:** idle, walk, run, a broken-blade combo, hit, stagger, knockdown.
- **Story:**
  - entrance;
  - kills an underling with one strike;
  - the last-stand transformation (dark magic);
  - the **Dark Legion** heavy art. The name is OPEN: whether to use it is your call.

---

## 3. Cutscene needs, in story order

What each moment needs. Everything else in these scenes (camera, slow motion, light, effects, falling debris) I do in code.

| TW | Moment | Animation needed | Angle |
|---|---|---|---|
| 001–010 | Rooftop run | Eiryn and Alric run, leap roof to roof; Eiryn feet close-up; Pressure launch; Alric catch; hug | E and SE; the feet close-up from the side |
| 011–018 | Street | Both walk and talk; react to the Tower horn | SE |
| 019 | Climber | Entrance, underling kill, transformation | S, E |
| 024–033 | The Reset | Eiryn Pressure to protect people; Negation; Alric's orders; **beast transformation**; shielding; preservation cast | S, SE |
| 035–043 | Tavern | Kael eats, talks, walks out, looks up; patrons sit and murmur | S, SE |
| 045–047 | Bandits | Eiryn fizzle and backing away; **Kael drop, plant, draw** | S, E |
| 055–057 | Fine | Tea glyph; guard writes; Kael pays | S |
| 060 | Guild test | Eiryn lifts a block, holds a floating counter | SE |
| 074–078 | Ogre | Kael thrown; Eiryn charging loop; Force Lance; (Ogre rig) | E |
| 083–107 | Sky beast | Aerys flying fight; **Kael sword throw**; Kael unarmed brawl and being thrown; Aerys countered; Eiryn finishing spell | E, SE |
| 108–130 | Nox | **Guild Hall execution**; Shadow Step; Nightcrawler eye strike | S, E |
| 152 | Eloryn overhealing | Cast and cost | S |
| 172 | Braxen reveal | Arms transform | S |
| 215–220 | Nox vs frost assassin | Chained Shadow Steps; exhausted-cost reaction | E |
| 309–312 | Floor 1 trials | Braxen frost injury; Eloryn healer-cost trial | S |
| 333 | Nox shields Aerys | Shielding stand | SE |
| 336 | Sword of Calamity | Kael draws it | S |
| 341–355 | Eloryn's sacrifice | Taken, death; party reactions (kneel, reach, scream) | S, SE |
| 395 | Eiryn overload | Full release | S |
| Guardian | Braxen's death | OPEN choreography; nothing drawn until you decide | n/a |

**Shared acting set for the whole cast**
- Big story moments use the same few reactions. If each main character has these once, from the front, most scenes can be staged from them:
  - shocked step back;
  - run to someone;
  - kneel beside someone;
  - cry;
  - shout;
  - embrace;
  - reach out;
  - collapse from exhaustion;
  - carry / be carried.

---

## 4. Equipment variants
Gear that changes the look needs either separate weapon layers (then the body animations are drawn once) or new sheets per weapon.

- **Layers are much cheaper:** body sheets without the weapon, plus a weapon sheet that follows the hand. I can combine them in code if each frame's hand position is marked.
- **Weapons that need their own look:** Kael's sword, unarmed Kael, the Sword of Calamity, Nox's daggers, Braxen's dragon hand.
- **Waiting on the equipment roster** for the rest.

## 5. What I can do without new art
- **In code:** camera moves, slow motion, screen shake, light flashes, glyphs, slashes, projectiles, the Spear of Light's flight, the Shadow Step blur, the Force Lance beam, dust, debris, the formation in the sky, fire and flood, and the protected Reset painting.
- **Effects need body art behind them:** any pose a character holds while an effect plays still needs that pose drawn. Section 3 lists them.

## 6. Totals and suggested order

**Totals**
- About 55 sheets per main hero (3 directions for fight reactions, 5 for movement), about 330 for all six.
- Plus about 40 story-only clips across the cast, mostly one angle.

**Order**
1. Eiryn's walk and run in the missing directions, plus her idle.
2. Kael's move set and fight set.
3. Eiryn's fight set.
4. The P1 cutscene clips in section 3 (up to the Ogre): Kael's drop and plant, Eiryn's fizzle, Kael thrown, Force Lance.
5. Aerys's set, and the sky-beast clips.
6. Nox's set.
7. Braxen.
8. Eloryn.

## 7. Decisions needed from you
1. **Kael's special:** what does it look like?
2. **Negation:** confirm it's Eiryn's special, and that it blocks one heavy attack for the party.
3. **Braxen's special:** confirm a protect-an-ally guard.
4. **Eloryn's aging cost:** what does it look like?
5. **Alric's beast form:** a description or a reference image.
6. **The climber's attack name:** keep "Dark Legion", or leave it unnamed?
7. **Weapons:** separate weapon layers, or a sheet per weapon?
