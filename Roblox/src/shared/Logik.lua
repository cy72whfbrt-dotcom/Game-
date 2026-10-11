-- Reine Spiel-Logik ohne Roblox-Dienste (Chancen, Zusammenlegen, Preise) – auch mit Lune testbar
local Config = if script then require(script.Parent.Config) else require("./Config")

local Logik = {}

-- Rang einer Seltenheit (1 = gewöhnlich)
function Logik.rang(seltenheit: string): number
	for i, s in Config.Seltenheiten do
		if s.Name == seltenheit then
			return i
		end
	end
	return 1
end

function Logik.seltenheitInfo(seltenheit: string)
	return Config.Seltenheiten[Logik.rang(seltenheit)]
end

-- Chancen eines Eis als Liste, seltenste zuletzt (für die Tafel am Ei)
function Logik.chancenListe(eiName: string)
	local ei = Config.Eier[eiName]
	local liste = {}
	for art, prozent in ei.Chancen do
		table.insert(liste, { Art = art, Prozent = prozent, Seltenheit = Config.Haustiere[art].Seltenheit })
	end
	table.sort(liste, function(a, b)
		if a.Prozent ~= b.Prozent then
			return a.Prozent > b.Prozent
		end
		return a.Art < b.Art
	end)
	return liste
end

-- Summe der Chancen (muss 100 sein)
function Logik.chancenSumme(eiName: string): number
	local summe = 0
	for _, prozent in Config.Eier[eiName].Chancen do
		summe += prozent
	end
	return summe
end

-- Zieht ein Haustier; zufall() liefert eine Zahl in [0, 1)
function Logik.waehleHaustier(eiName: string, zufall: () -> number): string
	local liste = Logik.chancenListe(eiName)
	local wurf = zufall() * Logik.chancenSumme(eiName)
	local bisher = 0
	for _, eintrag in liste do
		bisher += eintrag.Prozent
		if wurf < bisher then
			return eintrag.Art
		end
	end
	return liste[#liste].Art
end

-- Kraft eines Haustiers (gold = GoldFaktor-fach)
function Logik.kraft(haustier): number
	local kraft = Config.Haustiere[haustier.Art].Kraft
	return if haustier.Gold then kraft * Config.GoldFaktor else kraft
end

-- Faktor für den Münzwert: 1 + Kraft aller ausgerüsteten Haustiere, mal 2 mit Pass
function Logik.einkommensFaktor(ausgeruestet, doppelMuenzen: boolean): number
	local faktor = 1
	for _, haustier in ausgeruestet do
		faktor += Logik.kraft(haustier)
	end
	if doppelMuenzen then
		faktor *= Config.PassWerte.MuenzFaktor
	end
	return faktor
end

function Logik.muenzWert(gebiet: number, faktor: number): number
	return math.floor(Config.Gebiete[gebiet].MuenzWert * faktor + 0.5)
end

function Logik.kannKaufen(muenzen: number, preis: number): boolean
	return type(muenzen) == "number" and type(preis) == "number" and preis >= 0 and muenzen >= preis
end

function Logik.maxAusruestung(paesse): number
	return Config.Ausruestung + (if paesse.MehrAusruestung then Config.PassWerte.ExtraAusruestung else 0)
end

function Logik.maxInventar(paesse): number
	return Config.Inventar + (if paesse.MehrInventar then Config.PassWerte.ExtraInventar else 0)
end

function Logik.brueteZeit(paesse): number
	return Config.AusbrueteZeit * (if paesse.SchnellBrueten then Config.PassWerte.BrueteFaktor else 1)
end

-- Sucht 3 gleiche, nicht goldene Haustiere; nicht ausgerüstete zuerst. Liefert die IDs oder nil + Grund
function Logik.zusammenlegenWahl(haustiere, art: string, ausgeruestet)
	if not Config.Haustiere[art] then
		return nil, "Unbekanntes Haustier"
	end
	local istAus = {}
	for _, id in ausgeruestet do
		istAus[id] = true
	end
	local frei, aus = {}, {}
	for id, h in haustiere do
		if h.Art == art and not h.Gold then
			table.insert(if istAus[id] then aus else frei, id)
		end
	end
	table.sort(frei)
	table.sort(aus)
	for _, id in aus do
		table.insert(frei, id)
	end
	if #frei < Config.ZusammenlegenAnzahl then
		return nil, "Du brauchst " .. Config.ZusammenlegenAnzahl .. " gleiche Haustiere"
	end
	return { table.unpack(frei, 1, Config.ZusammenlegenAnzahl) }
end

-- Tägliche Belohnung: liefert Betrag + neue Serie, oder nil + Sekunden bis zur nächsten
function Logik.tagesBelohnung(letzte: number, serie: number, jetzt: number)
	local tb = Config.TagesBelohnung
	local seit = jetzt - (letzte or 0)
	if letzte and letzte > 0 and seit < tb.WarteStunden * 3600 then
		return nil, tb.WarteStunden * 3600 - seit
	end
	local neueSerie = if letzte and letzte > 0 and seit < tb.VerfallStunden * 3600 then (serie or 0) % tb.MaxSerie + 1 else 1
	return tb.Grund * neueSerie, neueSerie
end

-- Zahl kurz und lesbar: 1.234 / 12,5K / 3,4M
function Logik.kurzZahl(n: number): string
	if n >= 1e6 then
		return (string.format("%.1fM", n / 1e6):gsub("%.", ","))
	elseif n >= 1e4 then
		return (string.format("%.1fK", n / 1e3):gsub("%.", ","))
	end
	local s = tostring(math.floor(n))
	local rest = #s % 3
	local teile = if rest > 0 then { s:sub(1, rest) } else {}
	for i = rest + 1, #s, 3 do
		table.insert(teile, s:sub(i, i + 2))
	end
	return table.concat(teile, ".")
end

return Logik
