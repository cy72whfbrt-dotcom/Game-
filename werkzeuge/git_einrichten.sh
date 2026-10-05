#!/bin/bash
# Git-Einstellungen, die .gitattributes braucht (gelten für das ganze Repo, also auch für jeden Worktree):
#   merge.ours.driver true   → „KARTE.md merge=ours“: bei einem Merge bleibt die eigene KARTE.md, kein Konflikt –
#                              sie wird beim Bauen ohnehin neu erzeugt (werkzeuge/spiel_bauen.sh bzw. karte.sh).
# Ruft werkzeuge/spiel_bauen.sh und werkzeuge/vor_commit.sh selbst auf (still, nur wenn noch nicht gesetzt).
cd "$(dirname "$0")/.." || exit 1
git rev-parse --git-dir >/dev/null 2>&1 || exit 0   # (Kopie ohne Git: nichts zu tun)
[ "$(git config --get merge.ours.driver)" = true ] || git config merge.ours.driver true
