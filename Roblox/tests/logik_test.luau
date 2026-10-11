-- Test der reinen Logik mit Lune: lune run tests/logik_test.luau
-- Color3 gibt es nur in Roblox: kleine Attrappe für die Config
_G.Color3 = { fromRGB = function(r, g, b) return { r, g, b } end }
Color3 = _G.Color3

local Config = require("../src/shared/Config")
local Logik = require("../src/shared/Logik")

local fehler = 0
local function pruefe(bedingung, text)
	if not bedingung then
		fehler += 1
		print("FEHLER: " .. text)
	end
end

-- Chancen: Summe 100, nur bekannte Haustiere, Liste sortiert
for name, ei in Config.Eier do
	pruefe(Logik.chancenSumme(name) == 100, name .. ": Chancen ergeben nicht 100")
	for art in ei.Chancen do
		pruefe(Config.Haustiere[art] ~= nil, name .. ": unbekanntes Haustier " .. art)
	end
	local liste = Logik.chancenListe(name)
	for i = 2, #liste do
		pruefe(liste[i - 1].Prozent >= liste[i].Prozent, name .. ": Liste nicht sortiert")
	end
end

-- Ziehen: Grenzen und Häufigkeit
pruefe(Logik.waehleHaustier("Wiesenei", function() return 0 end) == "Flauschhase", "Wurf 0")
pruefe(Logik.waehleHaustier("Wiesenei", function() return 0.9999 end) == "Glitzerkatze", "Wurf fast 1")
local zaehler, n = {}, 100000
math.randomseed(42)
for _ = 1, n do
	local art = Logik.waehleHaustier("Kristallei", math.random)
	zaehler[art] = (zaehler[art] or 0) + 1
end
for art, prozent in Config.Eier.Kristallei.Chancen do
	local ist = (zaehler[art] or 0) / n * 100
	pruefe(math.abs(ist - prozent) < 0.6, "Häufigkeit " .. art .. ": " .. ist .. " statt " .. prozent)
end

-- Zusammenlegen
local tiere = {
	a1 = { Art = "Zimtfuchs" }, a2 = { Art = "Zimtfuchs" }, a3 = { Art = "Zimtfuchs" },
	a4 = { Art = "Zimtfuchs", Gold = true }, b1 = { Art = "Flauschhase" },
}
local ids = Logik.zusammenlegenWahl(tiere, "Zimtfuchs", {})
pruefe(ids and #ids == 3, "3 Zimtfüchse legen zusammen")
local keine, grund = Logik.zusammenlegenWahl(tiere, "Flauschhase", {})
pruefe(keine == nil and grund ~= nil, "1 Hase reicht nicht")
tiere.a5 = { Art = "Zimtfuchs" }
ids = Logik.zusammenlegenWahl(tiere, "Zimtfuchs", { "a1" })
local nimmtA1 = false
for _, id in ids do
	nimmtA1 = nimmtA1 or id == "a1"
	pruefe(id ~= "a4", "goldenes wird nicht verbraucht")
end
pruefe(not nimmtA1, "ausgerüstetes nur, wenn nötig")
pruefe(Logik.zusammenlegenWahl(tiere, "Quatsch", {}) == nil, "unbekannte Art")

-- Einkommen und Pässe
pruefe(Logik.einkommensFaktor({}, false) == 1, "ohne Haustier Faktor 1")
local f = Logik.einkommensFaktor({ { Art = "Zimtfuchs" }, { Art = "Zimtfuchs", Gold = true } }, true)
pruefe(math.abs(f - (1 + 0.3 + 0.9) * 2) < 1e-9, "Faktor mit Gold und 2x: " .. f)
pruefe(Logik.muenzWert(2, 2) == 50, "Münzwert Gebiet 2")
pruefe(Logik.maxAusruestung({}) == 3 and Logik.maxAusruestung({ MehrAusruestung = true }) == 5, "Ausrüstung 3/5")
pruefe(Logik.maxInventar({ MehrInventar = true }) == 100, "Inventar mit Pass")
pruefe(Logik.brueteZeit({ SchnellBrueten = true }) < Logik.brueteZeit({}), "Pass brütet schneller")

-- Preise
pruefe(Logik.kannKaufen(100, 100), "genau genug Geld")
pruefe(not Logik.kannKaufen(99, 100), "zu wenig Geld")
pruefe(not Logik.kannKaufen(100, -5), "negativer Preis")
pruefe(not Logik.kannKaufen("100" :: any, 5), "Text statt Zahl")
for i = 2, #Config.Gebiete do
	pruefe(Config.Gebiete[i].Preis > Config.Gebiete[i - 1].Preis, "Tore werden teurer")
end

-- Tägliche Belohnung
local b, s = Logik.tagesBelohnung(0, 0, 1000000)
pruefe(b == 150 and s == 1, "erste Belohnung")
local warte = select(2, Logik.tagesBelohnung(1000000, 1, 1000000 + 3600))
pruefe(warte == 19 * 3600, "zu früh: Wartezeit")
b, s = Logik.tagesBelohnung(1000000, 1, 1000000 + 21 * 3600)
pruefe(b == 300 and s == 2, "Serie Tag 2")
b, s = Logik.tagesBelohnung(1000000, 7, 1000000 + 21 * 3600)
pruefe(s == 1, "nach Tag 7 wieder Tag 1")
b, s = Logik.tagesBelohnung(1000000, 4, 1000000 + 50 * 3600)
pruefe(s == 1, "Serie verfällt nach 48 h")

pruefe(Logik.kurzZahl(1234) == "1.234" and Logik.kurzZahl(12500) == "12,5K" and Logik.kurzZahl(3400000) == "3,4M", "kurzZahl")

if fehler == 0 then
	print("ALLES OK")
else
	print(fehler .. " Fehler")
	error("Test rot")
end
