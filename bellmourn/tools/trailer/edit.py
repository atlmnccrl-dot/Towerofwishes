#!/usr/bin/env python3
"""Cut a trailer from captured takes: clips (with fades / white flashes), title cards, letterbox, the game's own
sound under a synthesised score, loudness-normalised, H.264 MP4 at 60 fps.
    python3 edit.py <edl.json> <takes_dir> <cards_dir> <out.mp4>
edl: { "w", "h", "fps": 60, "bars": 0.0-0.15, "sfx": 0.8, "music": "score.wav", "musicGain": 1.0,
       "clips": [ { "take", "in", "dur", "fi": 0, "fo": 0, "flash": 0, "black": false } | { "black": 1.5 } ],
       "cards": [ { "card", "t", "dur", "fade": 0.35 } ] }"""
import json, os, subprocess, sys, tempfile
edl = json.load(open(sys.argv[1])); TAKES, CARDS, OUT = sys.argv[2], sys.argv[3], sys.argv[4]
W, H, FPS = edl['w'], edl['h'], edl.get('fps', 60)
tmp = tempfile.mkdtemp(prefix='edit_', dir=os.path.dirname(os.path.abspath(OUT)))
def run(args): subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
segs = []; t = 0.0
for i, c in enumerate(edl['clips']):
    seg = os.path.join(tmp, f'{i:03d}.mkv')
    if 'take' not in c:  # a black slate with silence
        d = c['black']
        run(['ffmpeg', '-y', '-f', 'lavfi', '-i', f'color=black:s={W}x{H}:r={FPS}:d={d}', '-f', 'lavfi', '-i', f'anullsrc=r=48000:cl=stereo', '-t', str(d),
             '-c:v', 'libx264', '-crf', '8', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', seg])
    else:
        d = c['dur']; start = round(c.get('in', 0) * FPS); n = round(d * FPS); src = os.path.join(TAKES, c['take'])
        vf = [f'scale={W}:{H}:flags=neighbor', 'setsar=1']
        if c.get('fi'): vf.append(f"fade=t=in:st=0:d={c['fi']}")
        if c.get('flash'): vf.append(f"fade=t=in:st=0:d={c['flash']}:color=white")
        if c.get('fo'): vf.append(f"fade=t=out:st={d - c['fo']:.3f}:d={c['fo']}")
        af = [f"afade=t=in:st=0:d={max(0.02, c.get('fi', 0) or 0.02)}", f"afade=t=out:st={d - max(0.04, c.get('fo', 0) or 0.04):.3f}:d={max(0.04, c.get('fo', 0) or 0.04)}"]
        run(['ffmpeg', '-y', '-framerate', str(FPS), '-start_number', str(start), '-i', os.path.join(src, '%05d.jpg'), '-ss', f"{c.get('in', 0):.4f}", '-t', f'{d:.4f}', '-i', os.path.join(src, 'audio.wav'),
             '-frames:v', str(n), '-vf', ','.join(vf), '-af', ','.join(af) + ',apad', '-t', f'{d:.4f}', '-r', str(FPS),
             '-c:v', 'libx264', '-crf', '8', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', seg])
    segs.append(seg); t += d
total = t
lst = os.path.join(tmp, 'list.txt'); open(lst, 'w').write(''.join(f"file '{s}'\n" for s in segs))
cut = os.path.join(tmp, 'cut.mkv'); run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', cut])
# final pass: cards, bars, music, loudness
inputs = ['-i', cut]; fc = []; last = '0:v'; idx = 1
for k, cd in enumerate(edl.get('cards', [])):
    f = cd.get('fade', 0.35); inputs += ['-loop', '1', '-t', f"{cd['dur']:.3f}", '-i', os.path.join(CARDS, cd['card'] + '.png')]
    fc.append(f"[{idx}:v]format=rgba,fade=t=in:st=0:d={f}:alpha=1,fade=t=out:st={cd['dur'] - f:.3f}:d={f}:alpha=1,setpts=PTS+{cd['t']:.3f}/TB[c{k}]")
    fc.append(f"[{last}][c{k}]overlay=0:0:eof_action=pass:enable='between(t,{cd['t']:.3f},{cd['t'] + cd['dur']:.3f})'[v{k}]"); last = f'v{k}'; idx += 1
bars = edl.get('bars', 0)
if bars: bh = int(H * bars) // 2 * 2; fc.append(f"[{last}]drawbox=x=0:y=0:w={W}:h={bh}:color=black:t=fill,drawbox=x=0:y={H - bh}:w={W}:h={bh}:color=black:t=fill[vb]"); last = 'vb'
fc.append(f"[{last}]format=yuv420p[vout]")
if edl.get('music'):
    inputs += ['-i', edl['music']]; mi = idx; idx += 1
    fc.append(f"[0:a]volume={edl.get('sfx', 0.8)}[sa];[{mi}:a]volume={edl.get('musicGain', 1.0)},atrim=0:{total:.3f}[ma];[sa][ma]amix=inputs=2:normalize=0:duration=first,afade=t=out:st={total - 1.2:.3f}:d=1.2,loudnorm=I=-14:TP=-1.0:LRA=11[aout]")
else:
    fc.append(f"[0:a]volume={edl.get('sfx', 0.8)},loudnorm=I=-14:TP=-1.0:LRA=11[aout]")
run(['ffmpeg', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', '[aout]', '-t', f'{total:.3f}', '-r', str(FPS),
     '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
     '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', OUT])
subprocess.run(['rm', '-rf', tmp])
print(f'{OUT}: {total:.2f}s')
