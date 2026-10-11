#!/bin/bash
# Prüft das Roblox-Projekt: Logik-Test (Lune), Syntax aller Dateien (luau-compile), Typen mit Roblox-Definitionen (luau-lsp, falls da)
# Werkzeuge über PATH oder Umgebung: LUNE, LUAU_COMPILE, LUAU_LSP, LUAU_DEFS (globalTypes.d.luau)
set -u
cd "$(dirname "$0")/.." || exit 1
LUNE=${LUNE:-lune}; LUAU_COMPILE=${LUAU_COMPILE:-luau-compile}; LUAU_LSP=${LUAU_LSP:-luau-lsp}
fehler=0

echo "== Syntax"
for f in $(find src tests -name '*.lua' -o -name '*.luau'); do
	"$LUAU_COMPILE" --null "$f" >/dev/null || fehler=1
done

echo "== Logik-Test"
"$LUNE" run tests/logik_test.luau || fehler=1

if command -v "$LUAU_LSP" >/dev/null && [ -n "${LUAU_DEFS:-}" ]; then
	echo "== Typen"
	karte=$(mktemp)
	python3 - "$karte" <<'PY'
import json, os, sys
def kinder(d):
    out = []
    for f in sorted(os.listdir(d)):
        n, cls = f.rsplit('.', 1)[0], 'ModuleScript'
        if n.endswith('.server'): n, cls = n[:-7], 'Script'
        if n.endswith('.client'): n, cls = n[:-7], 'LocalScript'
        out.append({"name": n, "className": cls, "filePaths": [os.path.join(d, f)]})
    return out
ordner = lambda n, d: {"name": n, "className": "Folder", "children": kinder(d)}
karte = {"name": "Ei-Insel", "className": "DataModel", "children": [
    {"name": "ReplicatedStorage", "className": "ReplicatedStorage", "children": [ordner("Shared", "src/shared"), {"name": "Modelle", "className": "Folder"}]},
    {"name": "ServerScriptService", "className": "ServerScriptService", "children": [ordner("Server", "src/server")]},
    {"name": "StarterPlayer", "className": "StarterPlayer", "children": [{"name": "StarterPlayerScripts", "className": "StarterPlayerScripts", "children": [ordner("Client", "src/client")]}]}]}
json.dump(karte, open(sys.argv[1], "w"))
PY
	ausgabe=$("$LUAU_LSP" analyze --sourcemap="$karte" --definitions="$LUAU_DEFS" src 2>&1 | grep -v '^\[INFO\]\|^\[WARN\]')
	rm -f "$karte"
	if [ -n "$ausgabe" ]; then echo "$ausgabe"; fehler=1; fi
fi

if [ $fehler = 0 ]; then echo "ALLES OK"; else echo "FEHLER"; exit 1; fi
