-- Alle Zahlen des Spiels: Preise, Chancen, Einkommen, Robux-IDs
local Config = {}

-- Seltenheiten (Reihenfolge = Rang), Farbe für Rahmen und Leuchten
Config.Seltenheiten = {
	{ Name = "gewöhnlich", Farbe = Color3.fromRGB(180, 190, 200), Neon = false },
	{ Name = "selten", Farbe = Color3.fromRGB(70, 160, 255), Neon = false },
	{ Name = "episch", Farbe = Color3.fromRGB(170, 80, 255), Neon = true },
	{ Name = "legendär", Farbe = Color3.fromRGB(255, 170, 30), Neon = true },
	{ Name = "mythisch", Farbe = Color3.fromRGB(255, 60, 120), Neon = true },
}

-- Haustiere: Kraft = Zuschlag aufs Einkommen (0.2 = +20 %), Modell = Name in ReplicatedStorage/Modelle
Config.Haustiere = {
	Flauschhase = { Seltenheit = "gewöhnlich", Kraft = 0.10, Farbe = Color3.fromRGB(245, 235, 225), Modell = "Flauschhase" },
	Kieselkroete = { Seltenheit = "gewöhnlich", Kraft = 0.12, Farbe = Color3.fromRGB(120, 200, 110), Modell = "Kieselkroete" },
	Wolkenwelpe = { Seltenheit = "selten", Kraft = 0.25, Farbe = Color3.fromRGB(200, 230, 255), Modell = "Wolkenwelpe" },
	Zimtfuchs = { Seltenheit = "selten", Kraft = 0.30, Farbe = Color3.fromRGB(230, 130, 60), Modell = "Zimtfuchs" },
	Glitzerkatze = { Seltenheit = "episch", Kraft = 0.60, Farbe = Color3.fromRGB(190, 120, 255), Modell = "Glitzerkatze" },
	Lavaferkel = { Seltenheit = "episch", Kraft = 0.75, Farbe = Color3.fromRGB(255, 90, 60), Modell = "Lavaferkel" },
	Sternendrache = { Seltenheit = "legendär", Kraft = 1.50, Farbe = Color3.fromRGB(255, 200, 60), Modell = "Sternendrache" },
	Mondeule = { Seltenheit = "legendär", Kraft = 1.80, Farbe = Color3.fromRGB(150, 170, 255), Modell = "Mondeule" },
	Regenbogeneinhorn = { Seltenheit = "mythisch", Kraft = 4.00, Farbe = Color3.fromRGB(255, 120, 200), Modell = "Regenbogeneinhorn" },
}
Config.GoldFaktor = 3 -- goldenes Haustier hat die dreifache Kraft
Config.ZusammenlegenAnzahl = 3

-- Gebiete: Preis = Münzen fürs Tor, MuenzWert = Wert einer Münze dort
Config.Gebiete = {
	{ Name = "Wiesental", Preis = 0, MuenzWert = 5, Farbe = Color3.fromRGB(110, 200, 90) },
	{ Name = "Zuckerstrand", Preis = 2500, MuenzWert = 25, Farbe = Color3.fromRGB(250, 220, 140) },
	{ Name = "Kristallhöhle", Preis = 40000, MuenzWert = 120, Farbe = Color3.fromRGB(140, 120, 230) },
}

-- Eier: Chancen in Prozent (Summe 100), Gebiet = Nummer in Config.Gebiete
Config.Eier = {
	Wiesenei = {
		Name = "Wiesen-Ei", Preis = 100, Gebiet = 1, Modell = "Wiesenei", Farbe = Color3.fromRGB(150, 230, 120),
		Chancen = { Flauschhase = 45, Kieselkroete = 35, Wolkenwelpe = 12, Zimtfuchs = 6, Glitzerkatze = 2 },
	},
	Strandei = {
		Name = "Strand-Ei", Preis = 1200, Gebiet = 2, Modell = "Strandei", Farbe = Color3.fromRGB(255, 210, 120),
		Chancen = { Wolkenwelpe = 40, Zimtfuchs = 35, Glitzerkatze = 15, Lavaferkel = 8, Sternendrache = 2 },
	},
	Kristallei = {
		Name = "Kristall-Ei", Preis = 15000, Gebiet = 3, Modell = "Kristallei", Farbe = Color3.fromRGB(170, 140, 255),
		Chancen = { Glitzerkatze = 40, Lavaferkel = 32, Sternendrache = 17, Mondeule = 10, Regenbogeneinhorn = 1 },
	},
	-- Nur über Robux (Developer Product), steht nicht auf der Karte
	Gluecksei = {
		Name = "Glücksei", Preis = 0, NurRobux = true, Modell = "Gluecksei", Farbe = Color3.fromRGB(255, 120, 200),
		Chancen = { Glitzerkatze = 35, Lavaferkel = 30, Sternendrache = 20, Mondeule = 12, Regenbogeneinhorn = 3 },
	},
}

-- Münzen auf der Karte
Config.MuenzenJeGebiet = 25
Config.MuenzNachwachsen = 4 -- Sekunden bis eine eingesammelte Münze wieder erscheint
Config.SammelAbstand = 14 -- Studs: weiter weg = Schummeln
Config.SammelAbkuehlung = 0.12 -- Sekunden zwischen zwei Münzen eines Spielers
Config.HaustierRadius = 30 -- Haustiere sammeln Münzen in diesem Umkreis
Config.HaustierTakt = 1.5 -- Sekunden: jedes ausgerüstete Haustier holt eine Münze

-- Ausrüstung, Inventar, Ausbrüten
Config.Ausruestung = 3
Config.Inventar = 50
Config.AusbrueteZeit = 3 -- Sekunden zwischen zwei Eiern
Config.EiAbstand = 15

-- Tägliche Belohnung: Grundbetrag * Tag der Serie (Tag 1..7)
Config.TagesBelohnung = { Grund = 150, MaxSerie = 7, WarteStunden = 20, VerfallStunden = 48 }

-- Robux: Platzhalter-IDs (0 = noch nicht eingetragen) – in Roblox unter Monetization anlegen und hier eintragen
Config.Paesse = {
	DoppelMuenzen = { Id = 0, Name = "2x Münzen", Preis = 199 },
	SchnellBrueten = { Id = 0, Name = "Schneller ausbrüten", Preis = 149 },
	MehrInventar = { Id = 0, Name = "+50 Inventarplätze", Preis = 99 },
	MehrAusruestung = { Id = 0, Name = "+2 Ausrüstungsplätze", Preis = 249 },
}
Config.PassWerte = { MuenzFaktor = 2, BrueteFaktor = 0.5, ExtraInventar = 50, ExtraAusruestung = 2 }

Config.Produkte = {
	{ Id = 0, Name = "Münzbeutel", Art = "Muenzen", Menge = 5000, Preis = 49 },
	{ Id = 0, Name = "Münztruhe", Art = "Muenzen", Menge = 30000, Preis = 199 },
	{ Id = 0, Name = "Münzberg", Art = "Muenzen", Menge = 150000, Preis = 799 },
	{ Id = 0, Name = "Glücksei", Art = "Ei", Ei = "Gluecksei", Preis = 99 },
}

-- Speichern
Config.DatenSpeicherName = "EiInsel_Spieler_v1"
Config.SpeicherVersuche = 5
Config.AutoSpeichern = 120 -- Sekunden
Config.MaxKaufIds = 200 -- so viele Kauf-IDs bleiben gespeichert

return Config
