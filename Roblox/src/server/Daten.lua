-- Spielerdaten: Laden/Speichern im DataStore mit Wiederholung, Sicherung beim Verlassen und bei BindToClose
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Daten = {}

local speicher = nil
do
	local ok, ergebnis = pcall(function()
		return DataStoreService:GetDataStore(Config.DatenSpeicherName)
	end)
	if ok then
		speicher = ergebnis
	else
		warn("DataStore nicht erreichbar (Studio: API-Zugriff einschalten) – Daten werden nicht gespeichert")
	end
end

local profile: { [Player]: any } = {}
local geaendert: { [Player]: boolean } = {}
local Ereignis = Instance.new("BindableEvent")
Daten.Geladen = Ereignis.Event -- (spieler, profil)

local function neuesProfil()
	return {
		Muenzen = 0,
		Haustiere = {}, -- [id] = { Art, Gold }
		Ausgeruestet = {}, -- Liste von IDs
		Gebiete = { 1 },
		NaechsteId = 1,
		EierGeoeffnet = 0,
		LetzteBelohnung = 0,
		Serie = 0,
		Kaeufe = {}, -- [PurchaseId] = Zeit (keine doppelte Gutschrift)
	}
end

-- Ruft fn bis zu SpeicherVersuche-mal auf, Wartezeit wächst (1, 2, 4, … s)
local function mitWiederholung(fn)
	local letzterFehler
	for versuch = 1, Config.SpeicherVersuche do
		local ok, ergebnis = pcall(fn)
		if ok then
			return true, ergebnis
		end
		letzterFehler = ergebnis
		if versuch < Config.SpeicherVersuche then
			task.wait(2 ^ (versuch - 1))
		end
	end
	return false, letzterFehler
end

local function schluessel(spieler: Player): string
	return "Spieler_" .. spieler.UserId
end

function Daten.laden(spieler: Player)
	local profil = neuesProfil()
	if speicher then
		local ok, gespeichert = mitWiederholung(function()
			return speicher:GetAsync(schluessel(spieler))
		end)
		if not ok then
			-- Nicht mit leeren Daten spielen lassen, sonst würde der alte Stand überschrieben
			spieler:Kick("Deine Daten konnten nicht geladen werden. Bitte gleich nochmal versuchen.")
			return nil
		end
		if type(gespeichert) == "table" then
			for k, v in gespeichert do
				profil[k] = v
			end
		end
	end
	if spieler.Parent ~= Players then
		return nil
	end
	profile[spieler] = profil
	Ereignis:Fire(spieler, profil)
	return profil
end

function Daten.holen(spieler: Player)
	return profile[spieler]
end

-- Wartet höchstens maxSekunden auf das Profil (z. B. für ProcessReceipt)
function Daten.warten(spieler: Player, maxSekunden: number)
	local ende = os.clock() + maxSekunden
	while not profile[spieler] and spieler.Parent == Players and os.clock() < ende do
		task.wait(0.2)
	end
	return profile[spieler]
end

function Daten.merken(spieler: Player)
	geaendert[spieler] = true
end

-- Speichert sofort; liefert true bei Erfolg
function Daten.speichern(spieler: Player): boolean
	local profil = profile[spieler]
	if not profil then
		return false
	end
	if not speicher then
		return RunService:IsStudio()
	end
	local ok, fehler = mitWiederholung(function()
		return speicher:UpdateAsync(schluessel(spieler), function()
			return profil
		end)
	end)
	if ok then
		geaendert[spieler] = nil
	else
		warn("Speichern fehlgeschlagen für " .. spieler.Name .. ": " .. tostring(fehler))
	end
	return ok
end

-- Alte Kauf-IDs abschneiden (die neuesten bleiben)
function Daten.kaufMerken(profil, kaufId: string)
	profil.Kaeufe[kaufId] = os.time()
	local liste = {}
	for id, zeit in profil.Kaeufe do
		table.insert(liste, { id, zeit })
	end
	if #liste > Config.MaxKaufIds then
		table.sort(liste, function(a, b) return a[2] > b[2] end)
		for i = Config.MaxKaufIds + 1, #liste do
			profil.Kaeufe[liste[i][1]] = nil
		end
	end
end

function Daten.start()
	Players.PlayerRemoving:Connect(function(spieler)
		if profile[spieler] then
			Daten.speichern(spieler)
			profile[spieler] = nil
			geaendert[spieler] = nil
		end
	end)

	game:BindToClose(function()
		local offen = 0
		for spieler in profile do
			offen += 1
			task.spawn(function()
				Daten.speichern(spieler)
				offen -= 1
			end)
		end
		local ende = os.clock() + 25
		while offen > 0 and os.clock() < ende do
			task.wait(0.1)
		end
	end)

	task.spawn(function()
		while true do
			task.wait(Config.AutoSpeichern)
			for spieler in geaendert do
				task.spawn(Daten.speichern, spieler)
			end
		end
	end)
end

return Daten
