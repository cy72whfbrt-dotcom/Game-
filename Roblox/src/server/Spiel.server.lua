-- Hauptskript des Servers: alle Regeln. Der Client fragt nur über Remotes oder ProximityPrompts.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local Config = require(ReplicatedStorage.Shared.Config)
local Logik = require(ReplicatedStorage.Shared.Logik)
local Modelle = require(ReplicatedStorage.Shared.Modelle)
local Daten = require(script.Parent.Daten)
local Shop = require(script.Parent.Shop)
local Welt = require(script.Parent.Welt)

local zufall = Random.new()

-- Remotes anlegen
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
local function remote(klasse: string, name: string)
	local r = Instance.new(klasse)
	r.Name = name
	r.Parent = remotes
	return r
end
local StandEvent = remote("RemoteEvent", "Stand") -- Server → Client: eigener Spielstand
local EiEvent = remote("RemoteEvent", "EiErgebnis") -- Server → Client: Ei-Animation
local MeldungEvent = remote("RemoteEvent", "Meldung") -- Server → Client: kurzer Hinweis
local SammelnEvent = remote("RemoteEvent", "Einsammeln") -- Client → Server: Münze berührt
local AnfrageEvent = remote("RemoteEvent", "StandAnfrage") -- Client → Server: Stand bitte schicken
local AusruestenFn = remote("RemoteFunction", "Ausruesten")
local ZusammenlegenFn = remote("RemoteFunction", "Zusammenlegen")
local FreigebenFn = remote("RemoteFunction", "Freigeben")
local BelohnungFn = remote("RemoteFunction", "TagesBelohnung")
remotes.Parent = ReplicatedStorage

local tore, staende, plaetze = Welt.bauen()

-- Hilfen ---------------------------------------------------------------

local function wurzel(spieler: Player): BasePart?
	local figur = spieler.Character
	return figur and figur:FindFirstChild("HumanoidRootPart") :: BasePart?
end

local function hatGebiet(profil, gebiet: number): boolean
	return table.find(profil.Gebiete, gebiet) ~= nil
end

local function anzahl(t): number
	local n = 0
	for _ in t do
		n += 1
	end
	return n
end

local function ausgeruesteteTiere(profil)
	local liste = {}
	for _, id in profil.Ausgeruestet do
		if profil.Haustiere[id] then
			table.insert(liste, profil.Haustiere[id])
		end
	end
	return liste
end

local function melden(spieler: Player, text: string)
	MeldungEvent:FireClient(spieler, text)
end

-- Schickt dem Spieler seinen Stand, aktualisiert Rangliste und sichtbare Haustiere
local function standSenden(spieler: Player)
	local profil = Daten.holen(spieler)
	if not profil then
		return
	end
	local paesse = Shop.paesse(spieler)
	local ls = spieler:FindFirstChild("leaderstats")
	if ls then
		ls["Münzen"].Value = profil.Muenzen
		ls.Eier.Value = profil.EierGeoeffnet
	end
	spieler:SetAttribute("Haustiere", HttpService:JSONEncode(ausgeruesteteTiere(profil)))
	StandEvent:FireClient(spieler, {
		Muenzen = profil.Muenzen,
		Haustiere = profil.Haustiere,
		Ausgeruestet = profil.Ausgeruestet,
		Gebiete = profil.Gebiete,
		MaxAusruestung = Logik.maxAusruestung(paesse),
		MaxInventar = Logik.maxInventar(paesse),
		Paesse = paesse,
		LetzteBelohnung = profil.LetzteBelohnung,
		Serie = profil.Serie,
	})
end

local function muenzenDazu(spieler: Player, profil, betrag: number)
	profil.Muenzen += betrag
	Daten.merken(spieler)
end

local function haustierDazu(profil, art: string, gold: boolean?)
	local id = tostring(profil.NaechsteId)
	profil.NaechsteId += 1
	profil.Haustiere[id] = { Art = art, Gold = gold or nil }
	return id
end

AnfrageEvent.OnServerEvent:Connect(standSenden)

-- Münzen ---------------------------------------------------------------

local muenzOrdner = Instance.new("Folder")
muenzOrdner.Name = "Muenzen"
muenzOrdner.Parent = workspace

local muenzen = {} -- [id] = { Teil, Gebiet, Aktiv }

local function muenzePlatzieren(m)
	local platz = plaetze[zufall:NextInteger(1, #plaetze)]
	while platz.Gebiet ~= m.Gebiet do
		platz = plaetze[zufall:NextInteger(1, #plaetze)]
	end
	local versatz = Vector3.new(zufall:NextNumber(-6, 6), 0, zufall:NextNumber(-6, 6))
	m.Teil.CFrame = CFrame.new(platz.Pos + versatz)
	m.Teil.Transparency = 0
	m.Aktiv = true
end

for gebiet in Config.Gebiete do
	for _ = 1, Config.MuenzenJeGebiet do
		local id = #muenzen + 1
		local teil = Modelle.muenze()
		teil.Name = "Muenze"
		teil:SetAttribute("Id", id)
		teil:SetAttribute("Gebiet", gebiet)
		teil.Parent = muenzOrdner
		muenzen[id] = { Teil = teil, Gebiet = gebiet, Aktiv = false }
		muenzePlatzieren(muenzen[id])
	end
end

-- Sammelt eine Münze für den Spieler; nur gültige Münzen in freigeschalteten Gebieten
local function muenzeNehmen(spieler: Player, profil, id: number): boolean
	local m = muenzen[id]
	if not m or not m.Aktiv or not hatGebiet(profil, m.Gebiet) then
		return false
	end
	m.Aktiv = false
	m.Teil.Transparency = 1
	local faktor = Logik.einkommensFaktor(ausgeruesteteTiere(profil), Shop.paesse(spieler).DoppelMuenzen == true)
	muenzenDazu(spieler, profil, Logik.muenzWert(m.Gebiet, faktor))
	task.delay(Config.MuenzNachwachsen, muenzePlatzieren, m)
	return true
end

local letztesSammeln: { [Player]: number } = {}

SammelnEvent.OnServerEvent:Connect(function(spieler, id)
	local profil = Daten.holen(spieler)
	local root = wurzel(spieler)
	if not profil or not root or type(id) ~= "number" or not muenzen[id] then
		return
	end
	local jetzt = os.clock()
	if jetzt - (letztesSammeln[spieler] or 0) < Config.SammelAbkuehlung then
		return
	end
	if (root.Position - muenzen[id].Teil.Position).Magnitude > Config.SammelAbstand then
		return
	end
	letztesSammeln[spieler] = jetzt
	if muenzeNehmen(spieler, profil, id) then
		standSenden(spieler)
	end
end)

-- Haustiere helfen: jedes ausgerüstete Haustier holt im Takt die nächste Münze im Umkreis
task.spawn(function()
	while true do
		task.wait(Config.HaustierTakt)
		for _, spieler in Players:GetPlayers() do
			local profil = Daten.holen(spieler)
			local root = wurzel(spieler)
			if profil and root and #profil.Ausgeruestet > 0 then
				local genommen = 0
				for _ = 1, #ausgeruesteteTiere(profil) do
					local beste, besterAbstand = nil, Config.HaustierRadius
					for id, m in muenzen do
						if m.Aktiv and hatGebiet(profil, m.Gebiet) then
							local d = (m.Teil.Position - root.Position).Magnitude
							if d < besterAbstand then
								beste, besterAbstand = id, d
							end
						end
					end
					if beste and muenzeNehmen(spieler, profil, beste) then
						genommen += 1
					end
				end
				if genommen > 0 then
					standSenden(spieler)
				end
			end
		end
	end
end)

-- Eier -----------------------------------------------------------------

local letztesEi: { [Player]: number } = {}

-- Gibt dem Spieler ein Haustier aus dem Ei und startet die Animation beim Client
local function eiOeffnen(spieler: Player, profil, eiName: string)
	local art = Logik.waehleHaustier(eiName, function()
		return zufall:NextNumber()
	end)
	local id = haustierDazu(profil, art)
	profil.EierGeoeffnet += 1
	Daten.merken(spieler)
	EiEvent:FireClient(spieler, eiName, art, id, Logik.brueteZeit(Shop.paesse(spieler)))
	standSenden(spieler)
end

for eiName, stand in staende do
	stand.Prompt.Triggered:Connect(function(spieler)
		local ei = Config.Eier[eiName]
		local profil = Daten.holen(spieler)
		local root = wurzel(spieler)
		if not profil or not root then
			return
		end
		if not hatGebiet(profil, ei.Gebiet) then
			melden(spieler, "Schalte zuerst das Gebiet frei!")
			return
		end
		if (root.Position - stand.Teil.Position).Magnitude > Config.EiAbstand then
			return
		end
		local paesse = Shop.paesse(spieler)
		local jetzt = os.clock()
		if jetzt - (letztesEi[spieler] or -math.huge) < Logik.brueteZeit(paesse) then
			melden(spieler, "Das Ei brütet noch …")
			return
		end
		if anzahl(profil.Haustiere) >= Logik.maxInventar(paesse) then
			melden(spieler, "Inventar voll! Lege Haustiere zusammen oder gib welche frei.")
			return
		end
		if not Logik.kannKaufen(profil.Muenzen, ei.Preis) then
			melden(spieler, "Nicht genug Münzen!")
			return
		end
		letztesEi[spieler] = jetzt
		profil.Muenzen -= ei.Preis
		eiOeffnen(spieler, profil, eiName)
	end)
end

-- Tore -----------------------------------------------------------------

for gebiet, tor in tore do
	tor.Prompt.Triggered:Connect(function(spieler)
		local profil = Daten.holen(spieler)
		local root = wurzel(spieler)
		if not profil or not root or hatGebiet(profil, gebiet) then
			return
		end
		if (root.Position - tor.Teil.Position).Magnitude > 20 then
			return
		end
		if not hatGebiet(profil, gebiet - 1) then
			melden(spieler, "Schalte zuerst das Gebiet davor frei!")
			return
		end
		local preis = Config.Gebiete[gebiet].Preis
		if not Logik.kannKaufen(profil.Muenzen, preis) then
			melden(spieler, "Du brauchst " .. Logik.kurzZahl(preis) .. " Münzen.")
			return
		end
		profil.Muenzen -= preis
		table.insert(profil.Gebiete, gebiet)
		Daten.merken(spieler)
		melden(spieler, Config.Gebiete[gebiet].Name .. " ist offen!")
		standSenden(spieler)
	end)
end

-- Inventar -------------------------------------------------------------

AusruestenFn.OnServerInvoke = function(spieler, id, an)
	local profil = Daten.holen(spieler)
	if not profil or type(id) ~= "string" or not profil.Haustiere[id] then
		return false
	end
	local stelle = table.find(profil.Ausgeruestet, id)
	if an == true and not stelle then
		if #profil.Ausgeruestet >= Logik.maxAusruestung(Shop.paesse(spieler)) then
			melden(spieler, "Alle Plätze belegt!")
			return false
		end
		table.insert(profil.Ausgeruestet, id)
	elseif an == false and stelle then
		table.remove(profil.Ausgeruestet, stelle)
	end
	Daten.merken(spieler)
	standSenden(spieler)
	return true
end

ZusammenlegenFn.OnServerInvoke = function(spieler, art)
	local profil = Daten.holen(spieler)
	if not profil or type(art) ~= "string" then
		return false
	end
	local ids, grund = Logik.zusammenlegenWahl(profil.Haustiere, art, profil.Ausgeruestet)
	if not ids then
		melden(spieler, grund)
		return false
	end
	local warAus = false
	for _, id in ids do
		profil.Haustiere[id] = nil
		local stelle = table.find(profil.Ausgeruestet, id)
		if stelle then
			warAus = true
			table.remove(profil.Ausgeruestet, stelle)
		end
	end
	local neu = haustierDazu(profil, art, true)
	if warAus then
		table.insert(profil.Ausgeruestet, neu)
	end
	Daten.merken(spieler)
	standSenden(spieler)
	return true, neu
end

FreigebenFn.OnServerInvoke = function(spieler, id)
	local profil = Daten.holen(spieler)
	if not profil or type(id) ~= "string" or not profil.Haustiere[id] then
		return false
	end
	profil.Haustiere[id] = nil
	local stelle = table.find(profil.Ausgeruestet, id)
	if stelle then
		table.remove(profil.Ausgeruestet, stelle)
	end
	Daten.merken(spieler)
	standSenden(spieler)
	return true
end

BelohnungFn.OnServerInvoke = function(spieler)
	local profil = Daten.holen(spieler)
	if not profil then
		return nil
	end
	local betrag, serieOderWarten = Logik.tagesBelohnung(profil.LetzteBelohnung, profil.Serie, os.time())
	if not betrag then
		return nil, serieOderWarten
	end
	profil.LetzteBelohnung = os.time()
	profil.Serie = serieOderWarten
	muenzenDazu(spieler, profil, betrag)
	standSenden(spieler)
	return betrag, serieOderWarten
end

-- Robux ----------------------------------------------------------------

Shop.start(function(spieler, profil, produkt)
	if produkt.Art == "Muenzen" then
		muenzenDazu(spieler, profil, produkt.Menge)
		standSenden(spieler)
	elseif produkt.Art == "Ei" then
		eiOeffnen(spieler, profil, produkt.Ei)
	end
end, standSenden)

-- Spieler --------------------------------------------------------------

local function spielerDazu(spieler: Player)
	local ls = Instance.new("Folder")
	ls.Name = "leaderstats"
	local m = Instance.new("IntValue")
	m.Name = "Münzen"
	m.Parent = ls
	local e = Instance.new("IntValue")
	e.Name = "Eier"
	e.Parent = ls
	ls.Parent = spieler
	Shop.spielerDazu(spieler)
	if Daten.laden(spieler) then
		standSenden(spieler)
	end
end

Players.PlayerRemoving:Connect(function(spieler)
	letztesSammeln[spieler] = nil
	letztesEi[spieler] = nil
end)

Daten.start()
Players.PlayerAdded:Connect(spielerDazu)
for _, spieler in Players:GetPlayers() do
	task.spawn(spielerDazu, spieler)
end
