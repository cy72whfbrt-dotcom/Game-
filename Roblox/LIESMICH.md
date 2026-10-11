# Ei-Insel (Roblox-Spiel)

Haustier-Sammelspiel: Münzen sammeln, Eier öffnen, Haustiere ausrüsten und zusammenlegen, Gebiete freischalten, Robux-Shop.
**Stand:** Rohfassung (Arbeit wurde gestoppt). Noch ungetestet in Roblox Studio.

## Einmalig installieren (Windows)
1. Git: https://git-scm.com/download/win
2. Rojo: https://github.com/rojo-rbx/rojo/releases → `rojo-…-windows-x86_64.zip` nach `C:\rojo` entpacken
3. Roblox Studio → Toolbox → Plugins → „Rojo“ installieren

## Spiel holen und starten
Eingabeaufforderung (`cmd`):
```
cd %USERPROFILE%\Desktop
git clone -b claude/sharp-mendel-dcdp8w https://github.com/cy72whfbrt-dotcom/Game-.git
cd Game-\Roblox
C:\rojo\rojo.exe serve
```
Fenster offen lassen. Roblox Studio → „Baseplate“ → Plugins → Rojo → **Connect** → **Play**.
Neue Version: `git pull` im Ordner `Game-` (Studio übernimmt es automatisch).

## Speichern aktivieren
Spiel veröffentlichen, dann Game Settings → Security → „Enable Studio Access to API Services“ an.

## Robux-Shop
Game Passes und Developer Products im Creator Hub (Monetization) anlegen, die IDs in
`src/shared/Config.lua` bei `Id = 0` eintragen.

## Eigene 3D-Modelle
Prompts: `doku/modell_prompts.md`. Modell in Studio importieren, in `ReplicatedStorage/Modelle` legen und
genau wie den Dateinamen nennen (ohne Endung) – dann ersetzt es den Platzhalter.

## Dateien
- `src/shared/Config.lua` – alle Zahlen (Preise, Chancen, Einkommen)
- `src/server/` – Regeln, Speichern, Shop, Welt
- `src/client/` – Oberfläche, Haustiere
