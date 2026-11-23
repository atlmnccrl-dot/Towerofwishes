#!/usr/bin/env python3
"""Build dist/index.html: the whole game in one file (every script inlined).

The published link serves this single page, so a phone can never mix a new page with old cached
scripts. Usage: python3 tools/build.py
"""
import os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
build = re.search(r"HL\.BUILD = '([^']+)'", open(os.path.join(root, 'js/util.js'), encoding='utf-8').read()).group(1)

def inline(m):
    src = m.group(1)
    code = open(os.path.join(root, src), encoding='utf-8').read()
    code = code.replace('</script', '<\\/script')
    return '<script>/* %s */\n%s\n</script>' % (src, code)

out = re.sub(r'<script src="([^"]+)"></script>', inline, html)
out = out.replace('<title>Hollowlands</title>', '<title>Hollowlands</title>\n<!-- build %s -->' % build)
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
path = os.path.join(root, 'dist', 'index.html')
open(path, 'w', encoding='utf-8').write(out)
print('built %s (%d KB, build %s)' % (path, len(out) // 1024, build))
