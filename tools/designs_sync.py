#!/usr/bin/env python3
"""Keeps the design gallery (designs.html) and the game (index.html) in step.

  python3 tools/designs_sync.py pull   # copy the current painters from index.html into designs.html
  python3 tools/designs_sync.py push   # copy the (edited) painters from designs.html back into index.html

The painters live between the markers  /*<<DESIGN-CODE*/ ... /*DESIGN-CODE>>*/  in designs.html.
"""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME, GALLERY = ROOT / 'index.html', ROOT / 'designs.html'
NAMES = ['strokeBox', 'rr', 'towerTier', 'paintTowerTier', 'paintTemple', 'paintGuardianTemple', 'paintMegaTemple', 'drawGatehouse']
CONSTS = ['BAND']

def find_function(src, name):
    m = re.search(r'\n([ \t]*)function ' + name + r'\(', src)
    if not m: raise SystemExit('function not found: ' + name)
    start = m.start() + 1
    i = src.index('{', m.end()); depth = 0
    while True:
        c = src[i]
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return start, i + 1
        i += 1

def find_const(src, name):
    m = re.search(r'\n([ \t]*)const ' + name + r' = [^\n]*;', src)
    if not m: raise SystemExit('const not found: ' + name)
    return m.start() + 1, m.end()

def blocks(src):
    out = {}
    for n in NAMES: out[n] = find_function(src, n)
    for n in CONSTS: out[n] = find_const(src, n)
    return out

def dedent(block):
    lines = block.split('\n'); ind = min((len(l) - len(l.lstrip()) for l in lines if l.strip()), default=0)
    return '\n'.join(l[ind:] for l in lines)

def pull():
    src = GAME.read_text(); b = blocks(src)
    code = '\n\n'.join(dedent(src[s:e]) for n, (s, e) in sorted(b.items(), key=lambda kv: kv[1][0]))
    gal = GALLERY.read_text()
    new = re.sub(r'/\*<<DESIGN-CODE\*/.*?/\*DESIGN-CODE>>\*/', lambda m: '/*<<DESIGN-CODE*/\n' + code + '\n/*DESIGN-CODE>>*/', gal, flags=re.S)
    GALLERY.write_text(new); print('pulled', len(b), 'blocks into', GALLERY.name)

def push():
    gal = GALLERY.read_text(); code = re.search(r'/\*<<DESIGN-CODE\*/(.*?)/\*DESIGN-CODE>>\*/', gal, re.S).group(1)
    src = GAME.read_text(); tb = blocks(src); gb = blocks('\n' + code)
    for n, (s, e) in sorted(tb.items(), key=lambda kv: -kv[1][0]):   # replace from the end so offsets stay valid
        gs, ge = gb[n]; body = ('\n' + code)[gs:ge]
        indent = re.match(r'[ \t]*', src[s:e]).group(0)
        src = src[:s] + '\n'.join((indent + l if l.strip() else l) for l in body.split('\n')) + src[e:]
    GAME.write_text(src); print('pushed', len(tb), 'blocks into', GAME.name)

if __name__ == '__main__':
    {'pull': pull, 'push': push}[sys.argv[1] if len(sys.argv) > 1 else 'pull']()
