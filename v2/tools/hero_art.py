#!/usr/bin/env python3
"""Packs the menus' hero art: every sprite set's calm idle (Idle3, facing south-east) into one small
atlas, so the screens can show big animated characters without loading the full sheets.

  python3 tools/hero_art.py        ->  assets/heroes/heroes.json + heroes.webp

A frame is [x, y, w, h, ox, oy]: its rectangle in the atlas and its offset inside the set's cell,
whose anchor (the feet) is the set's 'anchor'.
"""
import json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'assets', 'sprites')
OUT = os.path.join(ROOT, 'assets', 'heroes')
CLIPS = ['Idle3', 'Idle']
DIR = 'SE'


def main():
    os.makedirs(OUT, exist_ok=True)
    pieces, meta = [], {}
    for name in sorted(f[:-5] for f in os.listdir(SRC) if f.endswith('.json')):
        d = json.load(open(os.path.join(SRC, name + '.json')))
        clip = next((c for c in CLIPS if c in d['anims']), None)
        if not clip:
            continue
        frames = [f for f in (d['anims'][clip].get(DIR) or d['anims'][clip].get('S') or []) if f]
        if not frames:
            continue
        pages = [Image.open(os.path.join(SRC, p)).convert('RGBA') for p in d['pages']]
        meta[name] = {'anchor': d['anchor'], 'frames': []}
        for pg, x, y, w, h, ox, oy in frames:
            pieces.append((name, pages[pg].crop((x, y, x + w, y + h)), ox, oy))
    # shelf packing, tallest first
    order = sorted(range(len(pieces)), key=lambda i: -pieces[i][1].height)
    W, x, y, shelf, place = 1024, 0, 0, 0, {}
    for i in order:
        im = pieces[i][1]
        if x + im.width > W:
            x, y, shelf = 0, y + shelf + 1, 0
        place[i] = (x, y)
        x += im.width + 1
        shelf = max(shelf, im.height)
    atlas = Image.new('RGBA', (W, y + shelf + 1), (0, 0, 0, 0))
    for i, (name, im, ox, oy) in enumerate(pieces):
        px, py = place[i]
        atlas.paste(im, (px, py))
        meta[name]['frames'].append([px, py, im.width, im.height, ox, oy])
    atlas.save(os.path.join(OUT, 'heroes.webp'), lossless=True, quality=100, method=6)
    json.dump({'page': 'heroes.webp', 'sets': meta}, open(os.path.join(OUT, 'heroes.json'), 'w'), separators=(',', ':'))
    print(len(meta), 'sets', len(pieces), 'frames', atlas.size, os.path.getsize(os.path.join(OUT, 'heroes.webp')) // 1024, 'KB')


if __name__ == '__main__':
    main()
