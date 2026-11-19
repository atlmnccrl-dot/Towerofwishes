# HOLLOWLANDS (working title)

A mobile-first, single-character dark fantasy survival and exploration RPG. One Wayfarer, a ruined
kingdom, a very high overhead camera over a pale ash world. This folder holds the first playable
vertical slice: the village of Ashwick, the Crowshade Trail and the two-floor Bellroot Underchapel
with the Bellworn Keeper.

It is a separate game: it shares no code, art or content with anything else in this repository.
Every image, sound and the font are generated from original code; there are no asset files.

Design, the reading of the reference video, architecture and open decisions: [docs/DESIGN.md](docs/DESIGN.md).

## Play

Serve this folder and open `index.html`, for example:

```sh
cd hollowlands && python3 -m http.server 8000   # then open http://localhost:8000
```

On a phone, open the same address in landscape (or publish the folder to any static host).

- **Phone:** left thumb anywhere = move. Right side: big button = strike (hold for a heavy blow),
  small buttons = roll, quick item, ultimate (after the Bell Shard). A labelled button appears when
  something can be used. Top right: pack and map.
- **Keyboard:** WASD move · J strike (hold: heavy) · Space roll · E use · Q quick item · R ultimate ·
  C swap weapon · Tab pack · M map · Esc close.


## Tests

```sh
NODE_PATH=$(npm root -g) node test/play.js     # bot plays the whole slice + lock checks + save reload
NODE_PATH=$(npm root -g) node test/touch.js    # on-screen controls at iPhone size
NODE_PATH=$(npm root -g) node test/shots.js /tmp/hl-shots   # screenshots of every area
```
