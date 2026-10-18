# Making scenes feel alive: what's needed

This covers two things:
1. How Eiryn and the other sprite characters stop looking stiff: walking and talking together, glancing, reacting.
2. Everything else that would make the heavy cutscene work as cinematic as possible.

Each item says whether it is **code** (I can do it) or **art / input** (needed from you).

---

## 1. Why her walk looks stiff now, and the fix

The drawn-in-code characters (Kael and the others) are posed every frame: their head turns toward whoever is talking, their arms gesture, they lean into turns. A sprite sheet is a fixed drawing, so Eiryn plays the same loop no matter what is happening around her.

The fix has two halves.

### A. Code: a "life layer" for sprite characters (no new art)
1. **Facing the conversation.**
   - When she walks beside someone who is talking, she uses the drawn view that turns her toward them.
   - Example: walking down-screen with Kael on her right, she uses the down-right walk instead of the straight-front one. This works best once more directions are drawn.
2. **Natural pace.**
   - Small speed changes; she slows when she speaks and drifts to keep a comfortable distance from her walking partner.
   - Not perfect lockstep.
3. **Start and stop.**
   - A short ease-in and ease-out of the walk cycle, instead of switching from the standing pose straight into full stride.
4. **Idle breathing and weight shift on still poses.**
   - A very slight, slow rise and fall while she stands, so a single frame isn't frozen.
5. **Listening beats.**
   - When someone finishes a line, the listener's view turns toward them for a moment.
6. **Staging rules in every scene.**
   - Pairs walking and talking stay side by side.
   - The speaker leads half a step.
   - The camera favours the speaker's face (over-the-shoulder, two-shots), as the code-drawn scenes already do.

### B. Art: clips that turn the head, gesture and react
Sprites can only look at someone if a drawing exists where they do. These clips give the most life per sheet. The scene code picks them automatically: who is speaking, and which side the partner is on.

| Clip | What | Directions |
|---|---|---|
| `walk_look_L`, `walk_look_R` | Walking with the head turned to her left / right, toward a companion | S, SE, E (3 each) |
| `walk_talk` | Walking while talking: small hand gesture, head toward the companion | S, SE, E |
| `idle_look_around` | Glances left, right, up; plays now and then while standing | S, SE |
| `idle_shift` | Weight shift, adjusts hair or belt; plays now and then | S, SE |
| `talk_idle` | Standing and speaking, with a hand gesture | S, SE |
| `listen` | A nod, a small head tilt | S, SE |
| `react_surprise`, `react_laugh`, `react_sigh` | Quick reactions, about 1 s each | S |
| `turn_S_E`, `turn_E_S` | (optional) Turning between front and side; smooths sudden direction changes | 1 each |

**Per main character:** about 20 more sheets.
**Eiryn and Kael first:** they share the most screen time, and they walk and talk the most (the road to Ashgate, town, the Guild).

---

## 2. Close-ups and faces: the biggest single upgrade for cutscenes
Full-body sprites are about 400 px tall, so in a close-up the face is tiny and has no expression. Cinematic scenes need **bust portraits** for close-ups and for the subtitle name plate.

**Per main character:**
- **Format:** transparent PNG, about **1024 px tall**, head and shoulders, front 3/4 view, matching the base design.
- **Expressions:** neutral, smile, laugh, angry, sad, crying, surprised, determined, hurt / pained, exhausted. That is 10.
- **For each expression:**
  - **eyes**: open, half, closed (blinking);
  - **mouth**: closed, mid, open (talking flaps).
  
  Either as separate layers (preferred: much less drawing) or as full images.
- **Optional:** a left-facing and a right-facing bust, so two characters can face each other in a two-shot.

Without these, close-ups stay on the full-body sprite or on the code-drawn faces.

---

## 3. References from you that make scenes faithful
- **Character reference sheets** (front, side, back, like Eiryn's base) for Kael, Aerys, Nox, Braxen, Eloryn, Alric (and his beast form), and the climber.
- **A height chart**: everyone side by side, to scale.
- **Comic panels** for the big moments, if they exist: the rooftop run, the Reset, Kael's drop, the sky-beast kill, Nox's Guild Hall execution, the Aerys stabbing, Nox shielding Aerys, Eloryn's sacrifice, the finale. With these I can match framing instead of guessing.
- **Personality notes for acting:**
  - how each character walks (Kael's swagger? Nox's prowl?);
  - how they stand when they're listening;
  - their habits (hair tuck, sword-hilt rest).
  
  One line each is enough.

---

## 4. Places (cutscene sets)
The current sets are drawn in code. Real background art makes cutscenes read like the comic.

- **Layered backgrounds** for the main locations:
  - far, mid and near layers as separate transparent PNGs (painted at 2560×1440);
  - the layers move at different speeds when the camera moves, which gives depth.
- **Lighting variants** where the story needs them: tavern at evening; Ashgate by day and by night; the cave by torchlight; the rooftops at dusk and during the Reset.
- **Props that act:**
  - the tavern door;
  - mugs and bowls;
  - the sacks;
  - the Guild contract board and its notices;
  - the stone block and counter for Eiryn's test;
  - Kael's sword stuck in the ground;
  - the beam the Ogre carries.
  
  Separate transparent PNGs.

Priorities and sizes are in `docs/ASSET_LIST.md`, section 3.

---

## 5. Sound: none in the game yet, and it changes cutscenes the most
- **Music:** a short cue for each big moment (the Reset, Kael's entrance, the Ogre, recruitment scenes, deaths), plus loops for places.
- **Ambience loops:** tavern murmur, street, forest, cave, wind on the rooftops.
- **Foley:** footsteps by surface, cloth, sword draw / sheathe, sword planted in earth, door, coins, glyph hum.
- **Voices:** none planned. Subtitles stay. Short non-word sounds (gasps, grunts, laughs) per character would help a lot even without voice acting.

Formats: `.m4a` + `.ogg` (see `docs/ASSET_LIST.md`).

---

## 6. What I build in code to direct cutscenes
- **Shot language:** two-shots, over-the-shoulder, push-ins, whip pans, low angles, slow motion, held frames, light flashes. Most exist already.
- **Walk-and-talk blocking** for any scene: pairs keep side-by-side spacing, turn toward the speaker, and the camera tracks alongside.
- **Bust close-up shots** as soon as the portraits exist: a cut-in panel or full-screen face with blink and mouth timing driven by the subtitle text.
- **Expression and reaction cues** in the scene script: a line can say who reacts and how, for example "Eiryn: react_laugh".
- **Transitions:** match cuts, wipes, title cards, time-skip cards.
- **The Director's Bible**, one part per story section: shot lists you can correct before I build each scene. Part 1 (TW-001–082) exists; next comes TW-083 onward.

---

## 7. Decisions needed from you
1. **Go on the code life layer (1A)** for Eiryn now? It works with the art she already has and gets better as clips arrive.
2. **Which art first:** Eiryn's missing walk/run/idle directions, the walk-and-talk clips (1B), or bust portraits (2)?
3. **Portraits:** layered (eyes and mouth separate) or full images per expression?
4. **Do comic panels exist** for the key scenes, and can you send them?
