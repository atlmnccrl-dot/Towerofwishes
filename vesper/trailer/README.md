# The trailer

`node`/Playwright capture of the game on a paused clock (exactly 30 fps of game time), edited and scored by
`build.py`. Frames, the score and `trailer.mp4` are written here and are not committed.

    python3 -m http.server 8765            # from the repository root
    node trailer/filmsfx2.js trailer/opening_sfx.json          # the opening's sound schedule
    for f in trailer/clips/*.json; do node trailer/capture.js $f trailer/frames; done
    python3 trailer/build.py               # writes trailer/trailer.mp4

Each clip spec names a page (`?intro`, `?node=...`), what to set up, and parts (`skip` seconds, then `dur`
seconds captured; `before`/`after`/`during` run in the page). The edit (`EDIT` in build.py) lists the clips,
the title cards and the end card in order. The score: wind under the story, Heartfelt Battle (CC0) from the
first card, and every sound the game played at its frame (the opening's from its own schedule).
