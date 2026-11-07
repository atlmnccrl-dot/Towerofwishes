"""Drawing kit for the anime bust portraits: tapered hair locks, fringes, eyes, mouths.

Pure string building: every function returns SVG markup. Coordinates use one frame for all
heroes (the head sits around x 420-600, y 230-560; shoulders below), facing the viewer's left
with the key light from the upper left. tools/portraits/make.py mirrors the result so the
heroes face right, as their sprites do on the VS card.
"""
import math

INK = '#0c0808'


def bez(P, t):
    u = 1 - t
    return tuple(u**3*P[0][k] + 3*u*u*t*P[1][k] + 3*u*t*t*P[2][k] + t**3*P[3][k] for k in (0, 1))


def dbez(P, t):
    u = 1 - t
    return tuple(3*u*u*(P[1][k]-P[0][k]) + 6*u*t*(P[2][k]-P[1][k]) + 3*t*t*(P[3][k]-P[2][k]) for k in (0, 1))


def prof_default(t):
    return (1 - t) ** 0.9 * (1 + 0.35 * math.sin(math.pi * t))


def lock_path(P, w0, prof=prof_default, t0=0.0, t1=1.0, off=0.0, scale=1.0, n=40):
    L, R = [], []
    for i in range(n + 1):
        t = t0 + (t1 - t0) * i / n
        x, y = bez(P, t)
        dx, dy = dbez(P, t)
        l = math.hypot(dx, dy) or 1
        nx, ny = -dy / l, dx / l
        hw = w0 * prof(t) / 2
        cx, cy = x + nx * off * hw, y + ny * off * hw
        s = hw * scale
        L.append((cx + nx * s, cy + ny * s))
        R.append((cx - nx * s, cy - ny * s))
    pts = L + R[::-1]
    return 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + 'Z'


def lock(P, w0, pal, rim=0.0, prof=prof_default, hl=True, line=2.2):
    """One tapered lock of hair: base, cel shadow, deep shadow, gloss streak, rim light, ink line."""
    base, shade, deep, light, rimc = pal
    o = [f'<path d="{lock_path(P, w0, prof)}" fill="{base}"/>',
         f'<path d="{lock_path(P, w0, prof, off=-0.5, scale=0.55)}" fill="{shade}"/>',
         f'<path d="{lock_path(P, w0, prof, t0=0.35, off=-0.75, scale=0.3)}" fill="{deep}"/>']
    if hl:
        o.append(f'<path d="{lock_path(P, w0, prof, t0=0.10, t1=0.55, off=0.35, scale=0.16)}" fill="{light}" opacity=".9"/>')
    if rim > 0:
        o.append(f'<path d="{lock_path(P, w0, prof, t0=0.04, t1=0.92, off=-0.86, scale=0.13)}" fill="{rimc}" opacity="{rim}"/>')
    o.append(f'<path d="{lock_path(P, w0, prof)}" fill="none" stroke="{INK}" stroke-width="{line}" stroke-linejoin="round"/>')
    return '<g>' + ''.join(o) + '</g>'


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def bow(a, b, k, part_x):
    """Control point that bows a segment away from the parting line."""
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    dx, dy = b[0] - a[0], b[1] - a[1]
    l = math.hypot(dx, dy) or 1
    px, py = -dy / l, dx / l
    side = -1 if mx < part_x else 1
    if px * side < 0:
        px, py = -px, -py
    return (mx + px * k, my + py * k)


def fringe(FR, part):
    d = f'M{FR[0][1]} {FR[0][2]}'
    for a, b in zip(FR, FR[1:]):
        c = bow((a[1], a[2]), (b[1], b[2]), 7, part[0])
        d += f' Q{c[0]:.1f} {c[1]:.1f} {b[1]} {b[2]}'
    return d


def hair_front(FR, part, crown_top, pal, rng, uid, ring=True, strands=24, rim_x=626, ring_y=None):
    """The crown and fringe as one sculpted shape: cel shadow per lock, gloss band, strand lines.

    FR: [(kind, x, y)] along the fringe, left to right; kind 's' start, 't' tip, 'n' notch, 'e' end.
    Returns (svg, fringe_only_path) - the second casts the hair's shadow on the forehead.
    """
    base, shade, deep, light, rimc = pal
    FRG = fringe(FR, part)
    front = FRG + crown_top
    only = FRG + f' L{FR[-1][1]} {part[1] + 90} L{FR[0][1]} {part[1] + 90} Z'
    pts = [(x, y) for k, x, y in FR]
    kinds = [k for k, x, y in FR]
    o = [f'<clipPath id="hf{uid}"><path d="{front}"/></clipPath>', f'<path d="{front}" fill="{base}"/>',
         f'<g clip-path="url(#hf{uid})">']
    o.append(f'<path d="M{part[0]} {part[1]} C{part[0]+42} {part[1]+22} {part[0]+64} {part[1]+72} {part[0]+68} {part[1]+142} L700 520 L700 150 Z" fill="{shade}"/>')
    o.append(f'<path d="M{rim_x} {part[1]+42} C{rim_x+20} {part[1]+82} {rim_x+24} {part[1]+122} {rim_x+16} {part[1]+162} L700 {part[1]+162} L700 {part[1]+22} Z" fill="{rimc}" opacity=".95"/>')
    for i, k in enumerate(kinds):
        if k != 't':
            continue
        tip, nr = pts[i], pts[i + 1]
        a = lerp(nr, part, 0.55)
        b = lerp(tip, part, 0.42)
        b = (b[0] + 7, b[1])
        if tip[0] > part[0]:
            b = lerp(lerp(pts[i - 1], tip, 0.55), part, 0.4)
        c1 = bow(tip, nr, 4, part[0])
        o.append(f'<path d="M{tip[0]} {tip[1]} Q{c1[0]:.1f} {c1[1]:.1f} {nr[0]} {nr[1]} L{a[0]:.1f} {a[1]:.1f} Q{(a[0]+b[0])/2+4:.1f} {(a[1]+b[1])/2:.1f} {b[0]:.1f} {b[1]:.1f} Z" fill="{shade}"/>')
        m = lerp(tip, nr, .5)
        m2 = lerp(m, part, .18)
        o.append(f'<path d="M{tip[0]} {tip[1]} L{m[0]:.1f} {m[1]:.1f} L{m2[0]:.1f} {m2[1]:.1f} Z" fill="{deep}" opacity=".8"/>')
    if ring:
        o.append(f'<linearGradient id="rg{uid}" x1="0" x2="1"><stop offset="0" stop-color="{light}"/><stop offset=".5" stop-color="{light}"/><stop offset=".74" stop-color="{shade}" stop-opacity=".6"/><stop offset="1" stop-color="{shade}" stop-opacity=".6"/></linearGradient>')
        y0 = ring_y if ring_y is not None else part[1] + 70
        rd = f'M396 {y0+2} C440 {y0-38} 490 {y0-52} 540 {y0-50} C590 {y0-48} 630 {y0-32} 652 {y0-8} '
        rd += ' '.join(f'L{652 - j*13:.0f} {y0 - 2 + (8 if j % 2 else 0) + abs(652 - j*13 - 524) * 0.02:.0f}' for j in range(20))
        rd += f' L396 {y0+16} Z'
        o.append(f'<path d="{rd}" fill="url(#rg{uid})" opacity=".9"/>')
    for i, k in enumerate(kinds):
        if k != 'n':
            continue
        n = pts[i]
        s = lerp(n, part, 0.62)
        c = bow(s, n, 10, part[0])
        o.append(f'<path d="M{s[0]:.1f} {s[1]:.1f} Q{c[0]:.1f} {c[1]:.1f} {n[0]} {n[1]}" stroke="{INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
    tips = [q for q, k in zip(pts, kinds) if k == 't']
    for j in range(strands):
        tgt = rng.choice(tips)
        a = lerp(part, tgt, rng.uniform(0.15, 0.4))
        b = lerp(part, tgt, rng.uniform(0.6, 0.92))
        a = (a[0] + rng.uniform(-14, 14), a[1])
        b = (b[0] + rng.uniform(-10, 10), b[1])
        c = bow(a, b, rng.uniform(3, 9), part[0])
        lt = j % 3 != 0
        o.append(f'<path d="M{a[0]:.1f} {a[1]:.1f} Q{c[0]:.1f} {c[1]:.1f} {b[0]:.1f} {b[1]:.1f}" stroke="{light if lt else deep}" stroke-width="{1.2 if lt else 1}" fill="none" stroke-linecap="round" opacity="{.7 if lt else .6}"/>')
    o.append('</g>')
    o.append(f'<path d="{front}" fill="none" stroke="{INK}" stroke-width="4.2" stroke-linejoin="round"/>')
    return ''.join(o), only


def iris_grad(uid, stops):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in zip(('0', '.28', '.72', '1'), stops))
    return f'<radialGradient id="ir{uid}" cx="50%" cy="70%" r="70%">{s}</radialGradient>'


def eye(uid, sclera, lash, crease, lower, ic, rx, ry, glow, iris_id, pupil='#120206', ring_c='#ffffff'):
    cx, cy = ic
    return f'''<g>
 <clipPath id="sc{uid}"><path d="{sclera}"/></clipPath>
 <path d="{sclera}" fill="#f7eff1"/>
 <g clip-path="url(#sc{uid})">
  <path d="{sclera}" transform="translate(0 -7)" fill="#b7a2b2"/>
  <ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#{iris_id})"/>
  <ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="{pupil}" stroke-width="2.4"/>
  <path d="M{cx-rx} {cy-ry*0.15} C{cx-rx*0.5} {cy-ry*0.7} {cx+rx*0.5} {cy-ry*0.7} {cx+rx} {cy-ry*0.15} L{cx+rx} {cy-ry*1.1} L{cx-rx} {cy-ry*1.1} Z" fill="{pupil}" opacity=".75"/>
  <ellipse cx="{cx}" cy="{cy+1}" rx="{rx*0.26}" ry="{ry*0.58}" fill="{pupil}"/>
  <path d="M{cx-rx*0.75} {cy+ry*0.35} C{cx-rx*0.3} {cy+ry*0.8} {cx+rx*0.3} {cy+ry*0.8} {cx+rx*0.75} {cy+ry*0.35}" stroke="{glow}" stroke-width="1.6" fill="none" opacity=".85"/>
  <ellipse cx="{cx-rx*0.42}" cy="{cy-ry*0.28}" rx="{rx*0.26}" ry="{rx*0.3}" fill="{ring_c}"/>
  <circle cx="{cx+rx*0.45}" cy="{cy+ry*0.38}" r="{rx*0.12}" fill="#fff" opacity=".9"/>
 </g>
 <path d="{lower}" fill="none" stroke="#6a4552" stroke-width="1.6" stroke-linecap="round"/>
 <path d="{crease}" fill="none" stroke="#8a5a66" stroke-width="1.6" stroke-linecap="round"/>
 <path d="{lash}" fill="{INK}" stroke="{INK}" stroke-width="1" stroke-linejoin="round"/>
</g>'''


def eyes(uid, irises, male=False, glow='#ffffff', open_k=1.0, lash_k=1.0):
    """Both eyes. male: narrower, flatter lids, short flicks. open_k widens for a shout."""
    out = [iris_grad(uid, irises)]
    k = (0.78 if male else 1.0) * open_k
    def sy(y, cy):
        return cy + (y - cy) * k
    # far eye (outer corner on the left)
    cy = 449
    far = dict(
        sclera=f'M479 {sy(446,cy):.1f} C471 {sy(437,cy):.1f} 452 {sy(435,cy):.1f} 440 {sy(442,cy):.1f} C437 {sy(449,cy):.1f} 441 {sy(457,cy):.1f} 449 {sy(460,cy):.1f} C461 {sy(463,cy):.1f} 473 {sy(460,cy):.1f} 479 {sy(452,cy):.1f} Z',
        lash=(f'M483 {sy(448,cy):.1f} C475 {sy(431,cy):.1f} 452 {sy(428,cy):.1f} 436 {sy(437,cy):.1f} L{436-12*lash_k:.0f} {sy(446,cy):.1f} L436 {sy(443,cy):.1f} L{436-6*lash_k:.0f} {sy(452,cy):.1f} L441 {sy(446,cy):.1f} C454 {sy(437,cy):.1f} 471 {sy(439,cy):.1f} 480 {sy(451,cy):.1f} Z'),
        crease=f'M474 {sy(428,cy)-2:.1f} C464 {sy(423,cy)-2:.1f} 450 {sy(423,cy)-2:.1f} 440 {sy(428,cy)-2:.1f}',
        lower=f'M446 {sy(462,cy):.1f} C456 {sy(465,cy):.1f} 468 {sy(464,cy):.1f} 476 {sy(459,cy):.1f}',
    )
    cy2 = 450
    near = dict(
        sclera=f'M511 {sy(446,cy2):.1f} C521 {sy(436,cy2):.1f} 548 {sy(433,cy2):.1f} 568 {sy(441,cy2):.1f} C571 {sy(449,cy2):.1f} 566 {sy(459,cy2):.1f} 556 {sy(463,cy2):.1f} C540 {sy(467,cy2):.1f} 522 {sy(463,cy2):.1f} 514 {sy(456,cy2):.1f} Z',
        lash=(f'M507 {sy(449,cy2):.1f} C518 {sy(430,cy2):.1f} 550 {sy(426,cy2):.1f} 573 {sy(437,cy2):.1f} L{573+14*lash_k:.0f} {sy(446,cy2):.1f} L574 {sy(444,cy2):.1f} L{574+5*lash_k:.0f} {sy(454,cy2):.1f} L567 {sy(446,cy2):.1f} C549 {sy(437,cy2):.1f} 524 {sy(438,cy2):.1f} 511 {sy(452,cy2):.1f} Z'),
        crease=f'M518 {sy(428,cy2)-2:.1f} C536 {sy(420,cy2)-2:.1f} 558 {sy(421,cy2)-2:.1f} 572 {sy(429,cy2)-2:.1f}',
        lower=f'M520 {sy(464,cy2):.1f} C534 {sy(469,cy2):.1f} 550 {sy(468,cy2):.1f} 561 {sy(462,cy2):.1f}',
    )
    out.append(eye(uid + 'f', ic=(459, 449), rx=10, ry=14 * min(1, k + 0.12), glow=glow, iris_id='ir' + uid, **far))
    out.append(eye(uid + 'n', ic=(539, 450), rx=13.5, ry=16 * min(1, k + 0.12), glow=glow, iris_id='ir' + uid, **near))
    return ''.join(out)


def brows(color, male=False, anger=0.0):
    """anger lowers the inner ends (pixels)."""
    a = anger
    th = 2.2 if male else 1.0
    return (f'<g opacity=".95">'
            f'<path d="M434 {424-th} C450 {417-th} 466 {420+a*0.5} 483 {427+a} L481 {430+a+th} C466 {425+a*0.5+th} 452 {424} 438 {428} Z" fill="{color}" stroke="{INK}" stroke-width="1"/>'
            f'<path d="M509 {431+a} C530 {420+a*0.4-th} 552 {414-th} 578 {415-th} L577 {419+th*0.5} C553 {420} 532 {426+a*0.4+th} 512 {434+a+th*0.3} Z" fill="{color}" stroke="{INK}" stroke-width="1"/>'
            f'</g>')


def nose(shadow):
    return (f'<path d="M490 470 C489 480 486 489 483 495 C487 497 491 497 495 495" fill="none" stroke="#8a5a66" stroke-width="2" stroke-linecap="round"/>'
            f'<path d="M492 486 L501 491 L495 497 Z" fill="{shadow}" opacity=".8"/>')


def mouth(expr, shadow, male=False):
    if expr == 'cry':
        w = 6 if male else 0
        return (f'<path d="M{466-w} 512 C482 506 506 504 {522+w} 508 C{518+w} 528 506 544 493 546 C479 544 {469-w} 532 {466-w} 512 Z" fill="#3e0c14" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>'
                f'<path d="M{470-w} 513 C484 509 504 507 {518+w} 510 L{517+w} 516 C503 514 485 515 {471-w} 519 Z" fill="#f6eef0"/>'
                f'<path d="M482 541 C488 538 498 538 504 540 L502 544 C496 546 488 546 483 544 Z" fill="#f6eef0" opacity=".9"/>'
                f'<path d="M480 534 C488 528 500 528 508 533 C502 540 488 541 480 534 Z" fill="#c4475a"/>')
    if male:
        return (f'<path d="M474 521 C486 523 500 522 512 519" fill="none" stroke="#5a2a36" stroke-width="2.8" stroke-linecap="round"/>'
                f'<path d="M484 531 C490 533 496 533 501 531" fill="none" stroke="{shadow}" stroke-width="2" stroke-linecap="round"/>')
    return (f'<path d="M477 520 C486 522 497 521 507 518" fill="none" stroke="#5a2a36" stroke-width="2.6" stroke-linecap="round"/>'
            f'<path d="M484 529 C489 531 495 531 499 529" fill="none" stroke="{shadow}" stroke-width="2" stroke-linecap="round"/>')


FACE_F = 'M424 360 C417 410 419 462 438 502 C452 530 470 546 489 553 C522 546 560 516 581 472 C592 442 593 400 589 360 Z'
FACE_M = 'M420 356 C413 410 415 466 430 508 C444 538 466 556 492 562 C528 554 566 524 586 478 C597 446 597 400 593 356 Z'


def face(skin, male=False, rim='#ff4a5c', uid='x', fringe_shadow='', neck=None):
    base, sh, deep = skin
    F = FACE_M if male else FACE_F
    nl, nr = neck or ((482, 554) if male else (486, 548))
    return f'''<g>
 <path d="M{nl} 520 C{nl} 580 {nl-8} 622 {nl-18} 650 L{nr+18} 650 C{nr+8} 622 {nr} 580 {nr} 512 Z" fill="{base}" stroke="{INK}" stroke-width="3"/>
 <path d="M{nl} 528 C492 556 506 570 520 572 C536 570 548 556 {nr} 516 C{nr} 580 {nr+8} 622 {nr+18} 650 C540 640 500 636 {nl-12} 630 C{nl-4} 600 {nl} 570 {nl} 528 Z" fill="{sh}"/>
 <path d="M{nr-4} 530 C{nr-4} 580 {nr+4} 622 {nr+14} 650 L{nr+18} 650 C{nr+8} 622 {nr} 580 {nr} 516 Z" fill="{rim}" opacity=".85"/>
 <clipPath id="fc{uid}"><path d="{F}"/></clipPath>
 <path d="{F}" fill="{base}"/>
 <g clip-path="url(#fc{uid})">
  <path d="M600 340 L576 360 C580 400 576 440 564 472 C554 496 534 516 508 532 L496 570 L600 570 Z" fill="{sh}"/>
  <path d="M594 380 C592 430 582 470 562 505 L574 505 C592 470 600 430 600 380 Z" fill="{rim}" opacity=".9"/>
  <path d="M452 520 C470 540 485 546 492 548 C480 552 465 545 452 530 Z" fill="{sh}" opacity=".8"/>
  {fringe_shadow}
 </g>
 <path d="{F}" fill="none" stroke="{INK}" stroke-width="3.6" stroke-linejoin="round"/>
</g>'''


def ear(skin, rim, big=False):
    """The near ear, for short hair (drawn after the face, under the hair)."""
    base, sh, deep = skin
    s = 1.15 if big else 1.0
    return (f'<g transform="translate(590 458) scale({s}) translate(-590 -458)">'
            f'<path d="M584 432 C598 422 612 436 609 458 C606 480 596 494 584 490 Z" fill="{base}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
            f'<path d="M590 440 C600 438 604 450 600 464 C598 474 592 480 588 478" fill="none" stroke="{deep}" stroke-width="2" stroke-linecap="round"/>'
            f'<path d="M604 444 C608 456 606 472 598 486" fill="none" stroke="{rim}" stroke-width="3" stroke-linecap="round"/>'
            f'</g>')
