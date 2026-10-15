# Tower of Wishes — Art Direction

Status: approved direction (2026-10-15). The author chose an **anime / manhwa webtoon**
look from a reference illustration. The reference image is not stored in this repository
(unknown rights); this page describes it.

## The reference, described

A dramatic low-angle character illustration: near-black charcoal background, a pale
long-haired figure with sharp, clean linework, hard-edged cel shadows in cool mauve-grey,
bone-white highlights with a faint warm tint, glowing red eyes, and **crimson energy
wisps** drifting like ink smoke. Contrast is high; colour is almost monochrome except for
one saturated red accent.

## Palette (sampled from the reference)

| Token | Hex | Use |
|---|---|---|
| ink | `#0c0808` | Deepest shadow, outlines |
| night | `#161212` | Backgrounds |
| charcoal | `#1d1718` | Panels, dark cloth |
| slate | `#2d292b` | Mid-dark surfaces |
| ash | `#3d3337` | Shadow side of light surfaces |
| dusk | `#4f4449` | Mid-tones |
| mauve | `#6e5353` | Warm mid-tones, skin shadow |
| rose | `#997d7b` | Lit skin / stone mid |
| bone | `#edcac0` | Highlights, warm light |
| white | `#f6f0ec` | Hair and rim highlights |
| crimson | `#8e1621` | Accent: enemy threat, All Out |
| blood | `#43171b` | Dark red shadow |
| glow | `#e3263a` | Hot red light, VS, impacts |

Story colours keep their meaning: **Eiryn's magic is violet** (the book's purple formation
and violet glyph lines): `glyph #a98bff`. **Allies read cool** (steel/ice `#9cc3dd`),
**enemies read red**. These tokens live in `js/render/core.js` (`PAL`).

## Rendering rules

1. **Ink first.** Every figure and prop has a dark outline that varies in weight: heavier
   on the silhouette, lighter inside.
2. **Cel shading, two tones.** Base colour plus one hard-edged shadow shape on the side
   away from the light (upper left of screen). No soft gradients on bodies.
3. **Rim light** on the lit edge of characters in bone/white.
4. **Mostly desaturated world, one accent.** The forest is a dusky, cool, low-saturation
   green-grey; red and violet are reserved for meaning.
5. **Anime proportions.** Taller figures (about 7–7.5 heads), long legs, tapered limbs,
   sharp hands; hair and cloth with flowing strands that react to motion.
6. **Readable first.** Telegraphs, team colours and reaction icons must stay instantly
   readable at phone size. Style never hides gameplay.
7. **Manhwa staging for big moments.** Heavy arts, the face-off and the countdown use
   slanted panels, speed lines, impact frames (brief inverted or monochrome flash), and
   bold lettering.
8. **Performance.** Must hold 60 fps on a recent iPhone. No `ctx.filter`, no heavy
   `shadowBlur` per frame; cache textures (grain, vignette, fog) in offscreen canvases.

## Characters (only what the book states is fixed)

| Character | Canon from the manuscript | Placeholder choices (Proposals) |
|---|---|---|
| Eiryn | Long silver-white hair; dark, travel-worn outfit with green ornamentation at the collar; a green ornament at her collar; torn sleeve, mud on the hem; violet glyphs | Face, exact cut of clothes |
| Kael | Swordsman; armour with a shoulder plate and strap; sword carried on a strap; bruised shoulder | Hair colour, face, armour colours |
| Broad Bandit | Broad-shouldered; fights with his fists | Everything else |
| Knife Bandit | Short knife | Everything else |
| Flanking Bandit | Goes round the trunk, reaches for Eiryn; no weapon stated | Everything else |
| Lookout | Hangs back by the path, runs | Everything else |
| Ogre (Ch. 5) | Stone-coloured weathered skin; must stoop; carries a beam from the loading frame with iron brackets | Everything else |

Final character designs need the author's approval before they replace placeholders.

## The real-art path

Procedural drawing can reach a clean, stylised webtoon look. Matching the reference
illustration closely needs real art: character turnarounds, animation frames, portraits
for face-off cards and heavy arts. When that art exists, the renderer will load it per
character (sprite sheets with pivots) and the procedural figures become fallbacks.
