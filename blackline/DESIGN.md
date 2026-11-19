# BLACKLINE: FRONTLINES — design

Working title. A side-on, real-time tactical battle game for phones (landscape) and desktop.
It stands on its own: it shares no code, art, names or rules with Tower of Wishes, Emberfall or
any other project in this repository, and it uses no files from `assets/`. Everything you see is
drawn by code at run time.

## 1. What the reference video teaches (rendering principles)

The reference is a 24-second night clip: a utility helicopter in a rainstorm lowers soldiers on a
rope onto a ridge; a funnel of wind gathers; there's a burst of fire and red; the camera sweeps
down over the hills. These are the principles the game copies (not the frames themselves):

| Principle | In the reference | In BLACKLINE |
|---|---|---|
| Black ground | Sky and land are both near-black; shapes come from light, not fill | `#050505` field; the terrain is black on black, drawn only by its edge and its stipple |
| Dotted ridgelines | Each hill is a broken line of bright dots, thicker on the crest | The ground's top is a jittered chain of dots, denser and brighter on crests, thinner in hollows |
| Halftone depth | Under each crest, sparse dots fade with depth; distant layers are dimmer dot bands | Precomputed stipple under the surface (density falls with depth); two parallax layers of dimmer dotted hills; dithered cloud bands |
| Thin, imperfect lines | Rain, wind loops and rope are 1 px strokes that wobble | All strokes are about 1 device pixel; outlines carry a small seeded jitter that "boils" (switches variant) a few times a second |
| Cream-filled vehicles | The helicopter is a cream silhouette with black detail lines | Friendly vehicles: cream fill, black inner lines. Enemy vehicles: hollow off-white outline with a muted red mark |
| Tiny people | Soldiers are a few pixels: a head, a body, legs | Soldiers are 9 world units tall: head, torso, two animated legs, a weapon line |
| Red as the only colour | Small red flecks: hits, a marking on the helicopter | Muted red (`#b8433a`) only for hits, blood, enemy tracers, enemy markings, threats (artillery warnings) and fire |
| Weather is the set | Slanted rain at many lengths; wind loops; a storm funnel; drifting cloud bands | Screen-space rain that slants with gusting wind; drifting dithered clouds; lightning that lights the hills; wind loops in the storm |
| Debris as squares | Explosions throw small white squares | Explosions throw square debris, a thin shock ring, a brief flash, a red core and long stippled smoke |
| Moving camera | Slow pans, tilts and a dive along a slope | Smooth pan and zoom with inertia, unit tracking, restrained shake on big blasts |
| Grain | Faint noise over everything | A tiled grain texture at low opacity and a vignette |

What is left out on purpose: the TikTok marks and the caption in the clip, colour, cartoon shapes,
pixel-art sprites, and any screenshot of the video.

## 2. Game design proposal

You are a commander, not a soldier. A long battlefield runs west to east. Each side has a base at
its end and three sectors (A, B, C) between them. You deploy squads and vehicles, give them
orders, take sectors, and earn reinforcement points (RP) from what you hold. The side that holds
more sectors drains the other's **frontline strength**; losses drain it too. At zero, that line
breaks.

Decisions that matter:

- **Ground and sight.** Hills block line of sight and fire. A squad behind a crest can't be shot
  and can't shoot. Scouts see farther; units you can't see can't be targeted, by either side.
- **Cover and suppression.** Infantry in trenches, behind rocks, walls or wrecks are much harder to
  hit. Heavy fire pins soldiers: they crouch, then go prone and stop advancing. Machine guns
  exist to pin; riflemen and vehicles exploit it.
- **Counters.** Rifles carry one AT rocket. MGs shred infantry but must set up. The APC is fast and
  kills infantry but dies to rockets and tanks. The tank beats vehicles and holds ground but is
  slow and can't hit aircraft. The helicopter hits anything on the ground but bleeds to
  autocannon and massed fire.
- **Support.** Artillery hits everyone in its area, friends too, after a red warning both sides can
  see. Air insertion drops a rifle squad by rope anywhere you can see.
- **Tempo.** Held sectors are forward deploy points for infantry; vehicles come from the base.
  Retreating to base refills squads and repairs vehicles, at the cost of time.

## 3. Core loop

1. Read the field: what's seen, what's held, where the enemy masses.
2. Spend RP: deploy a unit or call support.
3. Order: move, attack-move, hold, retreat.
4. Fight: units act on their own (targeting, cover, suppression); you redirect them.
5. Take and hold sectors, earning RP and draining the enemy line.
6. Repeat until a line breaks (about 8–12 minutes).

## 4. Unit and combat architecture

- `js/data.js`: unit and weapon tables (cost, men, loadout, speed, sight, armour class, damage
  multipliers per armour class). New units are new table entries; behaviour is chosen by `kind`
  (`inf`, `veh`, `air`).
- `js/terrain.js`: the battlefield as a height field (4-unit samples, deformable by craters),
  cover objects, trenches, structures, sectors, deploy points, and line of sight. Pure.
- `js/sim.js`: the fight. A unit (squad or vehicle) carries an order; members act on their own.
  Every shot is a projectile in a pooled array. Hit or miss is rolled at the trigger from range,
  stance, cover, suppression and movement; the projectile then flies to the target (hit) or past
  it (miss, which suppresses whoever it passes). Rockets, shells and artillery are ballistic and
  explode on contact: radius damage with falloff by armour class, wider suppression, craters,
  wrecks that become cover. Sight is shared per team and refreshed five times a second. The sim
  emits events (`shot`, `boom`, `hit`, `die`, ...) that the renderer turns into effects. No DOM;
  runs in Node.
- `js/ai.js`: the commander (the enemy, or both sides in the title screen and the tests): RP
  spending against the opponent's composition, sector priorities, garrisons, retreats, artillery
  on clusters. Squad-level behaviour (target choice, cover seeking, pinning) lives in the sim, so
  your units use it too.

## 5. Rendering and animation

Canvas 2D at device pixel ratio (capped at 2). Order per frame: sky and cloud bands → distant
hills → lightning → terrain (black fill, dotted crest, stipple, structures, cover) → units →
projectiles and effects → rain → grain and vignette → HUD. Everything is culled to the camera.
Detail drops with zoom: below a threshold, soldiers become ticks and units become markers;
stipple strides widen. Particles live in fixed pools with caps. Clouds, grain and vignette are
pre-rendered once.

## 6. First playable milestone (this build)

One skirmish, Black Rain: a 4,800-unit battlefield at night in a storm; two armies; rifle, MG and
scout squads; APC and tank; attack helicopter; artillery and rope insertion as support; enemy AI;
selection (tap, box, all) and orders (move, attack, hold, retreat); projectiles, damage, cover,
suppression, effects; three sectors; reinforcements; win and loss; the HUD; rain, wind, clouds and
lightning; synthesised sound.

## 7. Expansion roadmap

1. **Feel pass on device:** tune on real phones; haptics; difficulty levels beyond the two here.
2. **More units:** medic (heals in field), engineer (builds sandbags, repairs, mines), sniper,
   mortar team (indirect fire with spotter), towed artillery, troop transport (carries a squad),
   paratroopers, recon drone (temporary sight).
3. **Battle Sandbox:** place units on both sides, pick weather and time, watch or take over.
4. **Survival:** hold one sector against escalating waves; between waves, spend on fortifications.
5. **Campaign:** a chain of missions with changing ground (forest, city ruins, coast, snow),
   objectives (escort, destroy, hold until dawn) and unlocks of units and support.
6. **Skirmish options:** map seeds, sector counts, AI personalities.
7. **Polish:** a hand-picked CC0 score, more voices of wind and rain, replays from the
   deterministic sim.
