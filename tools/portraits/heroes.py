"""The six heroes as anime bust portraits (Proposal art; the author approves each one).

Each hero follows their delivered Character Creator set (hair and outfit colours) and the cast
list in docs/FULL_GAME_CAST_LIST.md (eyes, build, details). build(hero, expr) returns an SVG
string; expr is 'calm' (the VS card and the HUD chip) or 'cry' (the combat cut-ins).
"""
import random
from kit import (INK, lock, hair_front, eyes, brows, nose, mouth, face, ear, lerp)

P = lambda a, b, c, d: (a, b, c, d)

# ------------------------------------------------------------------ shared body helpers

def shaded(uid, d, base, shade, lit, rim, line=4):
    """A cloth or skin silhouette with a cel shadow on the right, a lit plane on the left and a rim light."""
    return f'''<g>
 <clipPath id="b{uid}"><path d="{d}"/></clipPath>
 <path d="{d}" fill="{base}"/>
 <g clip-path="url(#b{uid})">
  <path d="M556 600 C600 700 616 780 630 900 L960 900 L960 560 Z" fill="{shade}"/>
  <path d="M200 650 C300 655 400 650 462 646 C420 700 370 770 330 900 L200 900 Z" fill="{lit}" opacity=".9"/>
  <path d="{d}" fill="none" stroke="{rim}" stroke-width="14" clip-path="url(#rr{uid})"/>
 </g>
 <clipPath id="rr{uid}"><rect x="640" y="600" width="400" height="320"/></clipPath>
 <path d="{d}" fill="none" stroke="{INK}" stroke-width="{line}" stroke-linejoin="round"/>
</g>'''


def back_long(pal, rng, rim, lo=840, hi=900, left=(330, 430), right=(600, 720), n=14, w=(64, 88)):
    """Long hair hanging behind the shoulders on both sides, drifting a little to the right."""
    o = [f'<path d="M418 320 C380 420 350 600 330 {hi} L720 {hi} C700 600 660 420 612 320 Z" fill="{pal[2]}" stroke="{INK}" stroke-width="3"/>']
    locks = []
    for i in range(n):
        f = i / (n - 1)
        rx = 420 + f * 190 + rng.uniform(-6, 6)
        ry = 320 + rng.uniform(-8, 8)
        side = -1 if f < 0.5 else 1
        lo_x, hi_x = left if side < 0 else right
        tx = rng.uniform(lo_x, hi_x) + 12
        ty = rng.uniform(lo, hi)
        p1 = (rx + side * 40, ry + 180)
        p2 = (tx - side * 10, ty - 240)
        locks.append((rng.random(), P((rx, ry), p1, p2, (tx, ty)), rng.uniform(*w), f))
    locks.sort(key=lambda l: l[0])
    for _, Pp, ww, f in locks:
        o.append(lock(Pp, ww, pal, rim=rim if f > 0.5 else 0))
    return ''.join(o)


def back_short(pal, rng, rim, spikes):
    o = []
    for (r, c1, c2, t, w) in spikes:
        o.append(lock(P(r, c1, c2, t), w, pal, rim=rim if t[0] > 520 else 0))
    return ''.join(o)


def braid(x0, y0, x1, y1, pal, band):
    """A small braid: alternating tilted segments from (x0, y0) to (x1, y1), tied with a band."""
    base, shade, deep, light, rimc = pal
    o, n = [], 11
    for i in range(n):
        t = i / (n - 1)
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        a = 28 if i % 2 else -28
        r = 7 - 2.5 * t
        o.append(f'<g transform="translate({x:.1f} {y:.1f}) rotate({a})"><ellipse rx="{r:.1f}" ry="{r*1.5:.1f}" fill="{base}" stroke="{INK}" stroke-width="1.6"/>'
                 f'<ellipse cx="{r*0.3:.1f}" rx="{r*0.45:.1f}" ry="{r*1.2:.1f}" fill="{shade}"/></g>')
    o.append(f'<rect x="{x1-6}" y="{y1+6}" width="12" height="6" rx="2" fill="{band}" stroke="{INK}" stroke-width="1.5"/>')
    o.append(lock(P((x1, y1 + 10), (x1 - 2, y1 + 24), (x1 + 4, y1 + 34), (x1 + 2, y1 + 46)), 14, pal, hl=False, line=1.4))
    return ''.join(o)


def B(svg):
    """Shoulder-level pieces sit a little higher, for a shorter neck."""
    return f'<g transform="translate(0 -24)">{svg}</g>'


def M(svg):
    """Mirror about the centre line. The portraits are flipped at export so the heroes face right;
    a detail drawn mirrored here lands on the canon side (Kael's left shoulder, Braxen's right arm)."""
    return f'<g transform="translate(1024 0) scale(-1 1)">{svg}</g>'


# ------------------------------------------------------------------ the heroes

SPECS = {}


def kael(expr, rng):
    rim = '#9cc3dd'
    hair = ('#9a5636', '#6a3422', '#40200f', '#e6a274', rim)
    skin = ('#f1d3c2', '#c9988f', '#8a5a5e')
    FR = [('s', 398, 425), ('t', 404, 468), ('n', 424, 400), ('t', 440, 450), ('n', 458, 394), ('t', 472, 446),
          ('n', 490, 402), ('t', 502, 464), ('n', 516, 398), ('t', 534, 444), ('n', 552, 396), ('t', 572, 440),
          ('n', 588, 398), ('t', 606, 452), ('n', 618, 404), ('t', 634, 470), ('e', 644, 410)]
    crown = (' C660 360 672 330 662 304 L694 292 L658 276 L680 248 L638 256 L644 222 L606 242 L598 206 L568 236'
             ' L546 200 L528 236 L500 208 L490 242 L460 222 L460 256 L428 250 L436 278 L402 286 L414 306 C394 336 388 370 398 425 Z')
    hf, only = hair_front(FR, (548, 262), crown, hair, rng, 'kael', ring_y=318, rim_x=640)
    o = []
    # sword on his back: the hilt rises over his right shoulder
    o.append(M('<g><rect x="-9" y="-80" width="18" height="96" rx="4" fill="#2a1f1a" stroke="#0c0808" stroke-width="3" transform="translate(356 600) rotate(-24)"/>'
             '<path d="M-9 -70 L9 -58 M9 -70 L-9 -58 M-9 -46 L9 -34 M9 -46 L-9 -34 M-9 -22 L9 -10 M9 -22 L-9 -10" stroke="#6a3b22" stroke-width="3" transform="translate(356 600) rotate(-24)"/>'
             '<rect x="-34" y="14" width="68" height="12" rx="4" fill="#8a94a6" stroke="#0c0808" stroke-width="3" transform="translate(356 600) rotate(-24)"/>'
             '<circle cx="0" cy="-86" r="10" fill="#8a94a6" stroke="#0c0808" stroke-width="3" transform="translate(356 600) rotate(-24)"/></g>'))
    body = 'M450 640 C390 650 330 664 290 700 C262 730 250 790 246 900 L770 900 C766 790 756 730 730 700 C696 664 630 650 572 640 Z'
    o.append(B(shaded('kael', body, '#2b3242', '#1a1f2c', '#3e4862', rim)))
    o.append(face(skin, male=True, rim=rim, uid='kael', fringe_shadow=f'<path d="{only}" transform="translate(6 15)" fill="{skin[1]}"/>'))
    o.append(eyes('kael', ('#eaf7ff', '#7cc4f0', '#2d6fa8', '#0e2238'), male=True, glow='#bfe6ff', open_k=1.12 if expr == 'cry' else 1, lash_k=0.4))
    o.append(nose(skin[1]) + mouth(expr, skin[1], male=True))
    o.append(ear(skin, rim, big=False))
    # armour in the open coat, the collar, the strap and the left shoulder plate
    o.append(B('''<path d="M478 640 L516 770 L556 640 Z" fill="#8a94a6" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M478 640 L497 705 L516 700 L508 640 Z" fill="#c4ccd8"/>
 <path d="M440 612 C452 600 466 600 478 640 L516 770 L470 760 C440 720 430 660 440 612 Z" fill="#232a38" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M590 600 C578 600 566 610 556 640 L516 770 L566 760 C596 720 604 660 590 600 Z" fill="#161a24" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M590 600 C604 660 596 720 566 760 L560 752 C588 714 594 660 584 606 Z" fill="#9cc3dd" opacity=".9"/>
 ''') + B(M('''<path d="M720 690 L300 900 L340 900 L740 712 Z" fill="#6a3b22" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M716 696 L310 900" stroke="#a0643a" stroke-width="2"/>
 <g transform="translate(470 808) rotate(-27)"><rect x="-20" y="-18" width="40" height="36" rx="4" fill="#2b2420" stroke="#c4ccd8" stroke-width="4"/><rect x="-6" y="-18" width="5" height="36" fill="#c4ccd8"/></g>
 <path d="M562 652 C624 630 702 640 748 690 C760 720 756 752 742 776 C700 762 650 742 602 722 C580 702 566 678 562 652 Z" fill="#7c8696" stroke="#0c0808" stroke-width="4" stroke-linejoin="round"/>
 <path d="M572 660 C626 642 690 650 730 688 C690 676 640 672 600 690 Z" fill="#c4ccd8"/>
 <path d="M742 776 C756 752 760 720 748 690 C746 720 738 750 724 770 Z" fill="#e8eef6"/>
 <path d="M600 724 C650 746 700 764 742 778 L736 804 C690 792 640 776 594 750 Z" fill="#5d6676" stroke="#0c0808" stroke-width="3.5" stroke-linejoin="round"/>
 <circle cx="664" cy="684" r="6" fill="#2b3242" stroke="#0c0808" stroke-width="2"/><circle cx="706" cy="700" r="6" fill="#2b3242" stroke="#0c0808" stroke-width="2"/>''')))
    o.append(hf)
    o.append(brows('#3e1d10', male=True, anger=9 if expr == 'cry' else 4))
    return ''.join(o)


def eiryn(expr, rng):
    rim = '#a98bff'
    hair = ('#eceaf0', '#a3a0b8', '#62607a', '#ffffff', rim)
    skin = ('#f6e3dc', '#cfa0a6', '#8a5a66')
    FR = [('s', 400, 440), ('t', 404, 500), ('n', 420, 416), ('t', 432, 450), ('n', 446, 390), ('n', 474, 348),
          ('n', 506, 330), ('n', 540, 348), ('n', 566, 388), ('t', 584, 450), ('n', 598, 414), ('t', 612, 502), ('e', 616, 440)]
    crown = ' C640 360 638 290 604 258 C572 232 540 226 506 226 C468 226 436 238 414 266 C392 300 388 360 400 440 Z'
    hf, only = hair_front(FR, (506, 330), crown, hair, rng, 'eiryn', ring_y=284, rim_x=612)
    o = [back_long(hair, rng, 1, lo=860, hi=905, n=16)]
    body = 'M460 640 C410 650 360 662 328 690 C304 716 296 780 292 900 L728 900 C724 780 716 716 692 690 C660 662 610 650 560 640 Z'
    o.append(B(shaded('eiryn', body, '#1d1c22', '#111015', '#2e2c36', rim)))
    o.append(B('''<path d="M466 646 C470 700 452 790 440 900 L600 900 C590 790 560 700 560 646 Z" fill="#3f7a52" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M520 646 C540 700 560 790 572 900 L600 900 C590 790 560 700 560 646 Z" fill="#2a5a3a"/>
 <path d="M470 660 C468 720 456 800 448 900" stroke="#6fae80" stroke-width="2" fill="none" opacity=".7"/>
 <path d="M330 700 C346 690 366 690 380 700 L376 744 C362 750 346 748 334 740 Z" fill="#3f7a52" stroke="#0c0808" stroke-width="2.5"/>
 <path d="M690 700 C676 690 656 690 642 700 L646 744 C660 750 676 748 688 740 Z" fill="#2a5a3a" stroke="#0c0808" stroke-width="2.5"/>'''))
    o.append(face(skin, rim=rim, uid='eiryn', fringe_shadow=f'<path d="M410 380 C420 420 430 450 440 470 L420 480 L400 420 Z M600 380 C592 420 586 450 578 470 L600 480 L612 420 Z" fill="{skin[1]}"/>'))
    o.append(eyes('eiryn', ('#eaffee', '#5fcf8a', '#1f7a4a', '#0b2a1a'), glow='#b8f5cf', open_k=1.12 if expr == 'cry' else 1))
    o.append(nose(skin[1]) + mouth(expr, skin[1]))
    # the high mandarin collar, the silver clasp, the green ornament
    o.append('''<path d="M462 578 C488 592 540 592 566 576 L568 646 C540 656 488 656 462 648 Z" fill="#1d1c22" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M540 588 C552 586 560 582 566 576 L568 646 C560 650 552 652 542 652 Z" fill="#111015"/>
 <path d="M462 578 C488 592 540 592 566 576" stroke="#3f7a52" stroke-width="3" fill="none"/>
 <path d="M566 578 L568 646" stroke="#a98bff" stroke-width="3" opacity=".85"/>
 <path d="M512 590 L514 650" stroke="#0c0808" stroke-width="2"/>
 <rect x="498" y="606" width="32" height="7" rx="3" fill="#d8d6e0" stroke="#0c0808" stroke-width="2"/>
 <path d="M514 626 C522 634 524 644 514 654 C504 644 506 634 514 626 Z" fill="#4fbf7a" stroke="#0c0808" stroke-width="2"/>
 <path d="M512 632 L516 640" stroke="#eaffee" stroke-width="2" stroke-linecap="round"/>''')
    o.append(lock(P((428, 350), (390, 450), (404, 600), (392, 760)), 40, hair, rim=0))
    o.append(lock(P((598, 346), (636, 450), (620, 620), (640, 780)), 44, hair, rim=1))
    braid_pal = ('#d6d3e0', '#9692ab', '#5c5a72', '#ffffff', rim)
    o.append(braid(424, 420, 418, 610, braid_pal, '#3f7a52'))
    o.append(braid(600, 420, 608, 616, braid_pal, '#3f7a52'))
    o.append(hf)
    o.append(brows('#8a86a0', anger=7 if expr == 'cry' else 0))
    return ''.join(o)


def eloryn(expr, rng):
    rim = '#f3a58c'
    hair = ('#8f5236', '#603222', '#3a1c12', '#dc9a78', rim)
    skin = ('#f5dfd2', '#d3a394', '#8f5f58')
    FR = [('s', 402, 428), ('t', 410, 470), ('n', 428, 404), ('t', 448, 444), ('n', 462, 400), ('t', 486, 450),
          ('n', 500, 404), ('t', 522, 458), ('n', 540, 400), ('t', 566, 452), ('n', 584, 402), ('t', 606, 466),
          ('n', 618, 408), ('t', 632, 486), ('e', 642, 420)]
    crown = ' C656 350 650 296 626 268 C600 240 566 230 528 230 C486 230 450 244 428 270 C400 300 392 360 402 428 Z'
    hf, only = hair_front(FR, (470, 262), crown, hair, rng, 'eloryn', ring_y=316)
    o = []
    # the messy ponytail, tied high at the back
    o.append(lock(P((610, 290), (740, 280), (790, 470), (740, 660)), 96, hair, rim=1))
    o.append(lock(P((620, 300), (720, 320), (740, 480), (790, 600)), 40, hair, rim=1, line=1.8))
    o.append(lock(P((616, 300), (700, 340), (700, 520), (660, 620)), 34, hair, rim=0.6, line=1.8))
    body = 'M460 640 C410 650 360 662 328 690 C304 716 296 780 292 900 L728 900 C724 780 716 716 692 690 C660 662 610 650 560 640 Z'
    o.append(B(shaded('eloryn', body, '#e7dcc4', '#bfae92', '#f6eedc', rim)))
    o.append(B('''<path d="M330 696 C360 680 420 670 470 664 L500 900 L300 900 C300 800 310 730 330 696 Z" fill="#5e6a40" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M330 696 C360 680 400 672 440 668 C400 700 360 760 330 860 Z" fill="#76844f"/>
 <path d="M690 696 C660 680 604 670 556 664 L532 900 L728 900 C728 800 716 730 690 696 Z" fill="#434d2c" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M690 696 C716 730 728 800 728 900 L716 900 C716 800 704 736 682 702 Z" fill="#f3a58c" opacity=".85"/>
 <path d="M300 760 L700 900 L640 900 L292 790 Z" fill="#6a4026" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M300 768 L680 900" stroke="#9a643e" stroke-width="2"/>'''))
    o.append(face(skin, rim=rim, uid='eloryn', fringe_shadow=f'<path d="{only}" transform="translate(6 15)" fill="{skin[1]}"/>'))
    o.append(eyes('eloryn', ('#f1f7ec', '#9bb79a', '#4f6b55', '#1d2a20'), glow='#e3f0dc', open_k=1.14 if expr == 'cry' else 1))
    o.append(nose(skin[1]) + mouth(expr, skin[1]))
    # shirt collar points
    o.append('''<path d="M470 612 L512 660 L486 690 L452 640 Z" fill="#f2e8d2" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M562 610 L516 660 L544 690 L580 640 Z" fill="#cdbd9f" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M512 660 L514 740" stroke="#0c0808" stroke-width="2"/>''')
    o.append(lock(P((430, 360), (404, 430), (406, 520), (418, 600)), 26, hair, rim=0, line=1.8))
    o.append(lock(P((598, 350), (626, 430), (624, 520), (640, 610)), 30, hair, rim=1, line=1.8))
    o.append(hf)
    o.append(lock(P((530, 236), (548, 206), (570, 200), (588, 212)), 14, hair, rim=1, line=2))
    o.append(brows('#5a2c1c', anger=7 if expr == 'cry' else -2))
    return ''.join(o)


def braxen(expr, rng):
    rim = '#ffb24a'
    hair = ('#2f2a30', '#1a171a', '#0e0c0e', '#6e6676', rim)
    skin = ('#d39b74', '#a26c4e', '#6a4030')
    bone = ('#ddd6ca', '#aaa296', '#6e675e')
    FR = [('s', 402, 410), ('t', 410, 440), ('n', 426, 380), ('t', 444, 398), ('n', 462, 366), ('t', 480, 394),
          ('n', 498, 362), ('t', 516, 390), ('n', 534, 362), ('t', 552, 394), ('n', 570, 366), ('t', 590, 398),
          ('n', 606, 374), ('t', 622, 420), ('e', 634, 400)]
    crown = (' C650 340 656 300 640 276 L662 258 L630 252 L642 224 L606 236 L602 208 L572 228 L556 200 L540 226'
             ' L516 202 L506 230 L478 212 L476 240 L446 232 L452 258 L420 258 L430 282 C398 310 392 350 402 410 Z')
    hf, only = hair_front(FR, (548, 250), crown, hair, rng, 'braxen', ring_y=296, strands=16)
    o = []
    body = 'M452 606 C428 640 340 652 262 680 C206 702 182 770 176 900 L848 900 C842 770 818 702 762 680 C684 652 596 640 572 606 Z'
    o.append(B(shaded('braxen', body, skin[0], skin[1], '#dfa880', rim)))
    # his right arm (screen left) is altered: pale, with bone ridges along the shoulder
    o.append(B(M(f'''<clipPath id="arm"><path d="{body}"/></clipPath>
 <g clip-path="url(#arm)"><path d="M150 640 L400 650 C380 710 350 780 330 900 L150 900 Z" fill="{bone[0]}"/>
 <path d="M150 700 C220 690 300 700 360 720 C330 780 320 840 316 900 L150 900 Z" fill="{bone[1]}" opacity=".7"/>
 <path d="M200 760 C230 750 270 756 300 770 M190 820 C230 806 270 812 304 830 M240 700 C260 720 270 740 270 770" stroke="{bone[2]}" stroke-width="3" fill="none"/></g>
 <g fill="{bone[0]}" stroke="#0c0808" stroke-width="3" stroke-linejoin="round">
  <path d="M224 704 L234 666 L256 694 Z"/><path d="M270 684 L284 644 L304 674 Z"/><path d="M318 668 L334 628 L352 660 Z"/><path d="M368 654 L384 620 L398 650 Z"/>
 </g>
 <g fill="{bone[1]}"><path d="M240 700 L234 676 L250 696 Z"/><path d="M288 680 L284 654 L298 676 Z"/><path d="M338 664 L334 638 L346 660 Z"/></g>
 <path d="M176 900 C182 770 206 702 262 680 C340 652 428 640 452 606" fill="none" stroke="#0c0808" stroke-width="4"/>''')))
    o.append(B('''<path d="M300 760 C340 720 380 700 430 690 M724 760 C684 720 644 700 594 690" stroke="#8a5238" stroke-width="3" fill="none"/>
 <path d="M440 668 C470 680 500 684 512 684 M584 668 C554 680 524 684 512 684" stroke="#8a5238" stroke-width="2.5" fill="none"/>
 <path d="M760 700 C790 740 806 800 812 870" stroke="#ffb24a" stroke-width="3" fill="none" opacity=".8"/>
 <path d="M432 650 C444 700 424 790 414 900 L628 900 C618 790 598 700 604 650 C560 672 470 672 432 650 Z" fill="#4a4a50" stroke="#0c0808" stroke-width="3.5" stroke-linejoin="round"/>
 <path d="M520 668 C560 700 600 790 612 900 L628 900 C618 790 598 700 604 650 C580 662 550 668 520 668 Z" fill="#323236"/>
 <path d="M440 660 C452 720 440 800 432 900" stroke="#6a6a72" stroke-width="2.5" fill="none"/>
 <path d="M470 760 C500 776 540 776 570 760" stroke="#0c0808" stroke-width="2" fill="none" opacity=".7"/>
 <path d="M384 700 C344 712 304 740 284 780 M364 760 C334 770 312 790 300 820" stroke="#7a4a32" stroke-width="3" fill="none"/>'''))
    o.append(face(skin, male=True, rim=rim, uid='braxen', fringe_shadow=f'<path d="{only}" transform="translate(6 15)" fill="{skin[1]}"/>', neck=(468, 568)))
    o.append(eyes('braxen', ('#fff6d6', '#f5c04a', '#a8711a', '#3a2408'), male=True, glow='#ffe39a', open_k=1.12 if expr == 'cry' else 0.94, lash_k=0.3))
    o.append(nose(skin[1]) + mouth(expr, skin[1], male=True))
    o.append(ear(skin, rim, big=True))
    o.append(hf)
    o.append(brows('#1a1416', male=True, anger=11 if expr == 'cry' else 6))
    return ''.join(o)


def aerys(expr, rng):
    rim = '#ffcf5a'
    hair = ('#f3e1a6', '#c8a35e', '#8a6a30', '#fffbea', rim)
    skin = ('#f8e6dc', '#d8aaa8', '#94606a')
    FR = [('s', 402, 420), ('t', 408, 470), ('n', 430, 404), ('t', 444, 434), ('n', 462, 396), ('t', 474, 440),
          ('n', 488, 406), ('t', 495, 486), ('n', 503, 410), ('t', 520, 436), ('n', 538, 398), ('t', 556, 440),
          ('n', 572, 402), ('t', 590, 428), ('n', 605, 398), ('t', 626, 478), ('e', 640, 412)]
    crown = ' C652 352 648 302 632 278 C620 252 592 234 558 228 C530 224 500 225 476 234 C440 248 400 290 402 420 Z'
    hf, only = hair_front(FR, (548, 258), crown, hair, rng, 'aerys', ring_y=318)
    o = [back_long(hair, rng, 1, lo=860, hi=905, n=16)]
    body = 'M460 640 C410 650 360 662 328 690 C304 716 296 780 292 900 L728 900 C724 780 716 716 692 690 C660 662 610 650 560 640 Z'
    o.append(B(shaded('aerys', body, '#f1e9d6', '#c9bda4', '#fffaf0', rim)))
    o.append(B('''<path d="M470 640 L514 780 L558 640 Z" fill="#8fb6d8" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M514 640 L514 780 L558 640 Z" fill="#6e93b8"/>
 <path d="M446 630 C458 620 470 624 478 642 L514 780 L476 790 C446 740 436 680 446 630 Z" fill="#f6efe0" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M584 628 C570 620 558 626 552 642 L514 780 L552 790 C582 740 594 680 584 628 Z" fill="#cdbfa2" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M478 642 L514 780 M552 642 L514 780" stroke="#d8a845" stroke-width="4" fill="none"/>
 <path d="M300 820 C380 800 440 798 476 790 M728 820 C650 800 590 798 552 790" stroke="#d8a845" stroke-width="3" fill="none"/>
 <g transform="translate(514 772)"><circle r="16" fill="#d8a845" stroke="#0c0808" stroke-width="3"/><circle r="7" fill="#fff4c8"/>
 <path d="M0 -26 L4 -16 L0 -12 L-4 -16 Z M0 26 L4 16 L0 12 L-4 16 Z M-26 0 L-16 4 L-12 0 L-16 -4 Z M26 0 L16 4 L12 0 L16 -4 Z" fill="#d8a845" stroke="#0c0808" stroke-width="1.5"/></g>'''))
    o.append(face(skin, rim=rim, uid='aerys', fringe_shadow=f'<path d="{only}" transform="translate(6 15)" fill="{skin[1]}"/>'))
    o.append(eyes('aerys', ('#fffbe6', '#ffd96a', '#c08a1e', '#46300a'), glow='#fff1b8', open_k=1.12 if expr == 'cry' else 1))
    o.append(nose(skin[1]) + mouth(expr, skin[1]))
    o.append(lock(P((428, 350), (388, 450), (404, 610), (396, 780)), 36, hair, rim=0))
    o.append(lock(P((604, 340), (644, 450), (626, 620), (664, 790)), 40, hair, rim=1))
    o.append(lock(P((592, 370), (622, 480), (610, 590), (640, 700)), 28, hair, rim=1, line=1.8))
    o.append(hf)
    o.append(brows('#b08a4a', anger=7 if expr == 'cry' else 0))
    return ''.join(o)


def nox(expr, rng):
    rim = '#9a6bff'
    hair = ('#2c2933', '#18161d', '#0b0a0e', '#7a72a0', rim)
    skin = ('#efd8d0', '#c49a9c', '#7f5660')
    FR = [('s', 398, 430), ('t', 404, 482), ('n', 420, 412), ('t', 438, 436), ('n', 452, 402), ('t', 466, 432),
          ('n', 484, 404), ('t', 492, 488), ('n', 500, 406), ('t', 520, 432), ('n', 536, 400), ('t', 556, 430),
          ('n', 572, 402), ('t', 579, 476), ('n', 586, 406), ('t', 604, 440), ('n', 616, 408), ('t', 634, 498), ('e', 646, 422)]
    crown = (' C664 362 676 330 664 300 L702 298 L664 272 L692 252 L640 252 L652 222 L612 238 L604 212 L578 236'
             ' L556 212 L536 238 L510 220 L494 248 L466 234 L462 262 L430 260 L440 286 L406 296 L420 312 C396 340 390 380 398 430 Z')
    hf, only = hair_front(FR, (548, 256), crown, hair, rng, 'nox', ring_y=312)
    o = [back_short(hair, rng, 1, [((440, 330), (400, 390), (384, 460), (370, 540), 56), ((600, 330), (650, 380), (690, 420), (734, 452), 50),
                                   ((612, 350), (660, 410), (676, 470), (716, 530), 40)])]
    body = 'M450 640 C396 650 340 664 300 700 C272 730 262 790 258 900 L762 900 C758 790 748 730 722 700 C688 664 630 650 574 640 Z'
    o.append(B(shaded('nox', body, '#1f1e26', '#121117', '#302e3c', rim)))
    o.append(B('''<path d="M300 760 L520 900 L470 900 L294 790 Z" fill="#3a2a2a" stroke="#0c0808" stroke-width="3"/>
 <g transform="translate(372 800) rotate(32)"><rect x="-7" y="-40" width="14" height="40" rx="3" fill="#2a2730" stroke="#0c0808" stroke-width="2.5"/><rect x="-16" y="-4" width="32" height="8" rx="3" fill="#7a72a0" stroke="#0c0808" stroke-width="2"/></g>'''))
    o.append(face(skin, male=True, rim=rim, uid='nox', fringe_shadow=f'<path d="{only}" transform="translate(6 15)" fill="{skin[1]}"/>'))
    o.append(eyes('nox', ('#f4eaff', '#a77bff', '#5a2fb0', '#1c0b3a'), male=True, glow='#d9c4ff', open_k=1.1 if expr == 'cry' else 0.84, lash_k=0.5))
    o.append(nose(skin[1]) + mouth(expr, skin[1], male=True))
    o.append(ear(skin, rim, big=False))
    # the scarf wound high round the neck, one end trailing
    o.append('''<path d="M452 570 C480 590 548 590 578 566 C596 600 600 640 590 676 C560 694 470 694 440 676 C430 640 436 600 452 570 Z" fill="#2c2a36" stroke="#0c0808" stroke-width="3.5" stroke-linejoin="round"/>
 <path d="M540 588 C560 582 572 574 578 566 C596 600 600 640 590 676 C576 684 560 688 540 690 Z" fill="#1a1922"/>
 <path d="M456 604 C490 620 550 618 588 600 M446 640 C490 660 550 656 594 638" stroke="#0c0808" stroke-width="2.5" fill="none"/>
 <path d="M460 612 C500 626 540 624 570 612" stroke="#4a4658" stroke-width="2" fill="none"/>
 <path d="M590 676 C600 660 598 620 578 566" stroke="#9a6bff" stroke-width="3" fill="none" opacity=".9"/>
 <path d="M560 680 C600 700 640 760 700 800 C690 820 680 840 690 870 C630 840 590 780 548 690 Z" fill="#2c2a36" stroke="#0c0808" stroke-width="3" stroke-linejoin="round"/>
 <path d="M600 720 C630 760 660 790 690 810" stroke="#9a6bff" stroke-width="2.5" fill="none" opacity=".8"/>''')
    o.append(hf)
    o.append(brows('#16141a', male=True, anger=10 if expr == 'cry' else 5))
    return ''.join(o)


HEROES = {'kael': kael, 'eiryn': eiryn, 'eloryn': eloryn, 'braxen': braxen, 'aerys': aerys, 'nox': nox}
ACCENT = {'kael': '#9cc3dd', 'eiryn': '#a98bff', 'eloryn': '#f3a58c', 'braxen': '#ffb24a', 'aerys': '#ffcf5a', 'nox': '#9a6bff'}


def build(hero, expr='calm'):
    rng = random.Random(hero)
    inner = HEROES[hero](expr, rng)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="160 170 700 700" width="700" height="700">'
            f'<g>{inner}</g></svg>')
