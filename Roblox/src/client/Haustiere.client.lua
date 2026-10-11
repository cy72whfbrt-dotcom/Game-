-- Zeigt die ausgerüsteten Haustiere aller Spieler: sie hüpfen hinter ihrem Besitzer her (nur Anzeige)
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Modelle = require(ReplicatedStorage.Shared.Modelle)

local ordner = Instance.new("Folder")
ordner.Name = "HaustierAnzeige"
ordner.Parent = workspace

local anzeigen: { [Player]: { Model } } = {}

local function wegraeumen(spieler: Player)
	local alt = anzeigen[spieler]
	if alt then
		for _, m in alt do
			m:Destroy()
		end
	end
	anzeigen[spieler] = nil
end

local function neuAufbauen(spieler: Player)
	wegraeumen(spieler)
	local liste = {}
	local ok, tiere = pcall(HttpService.JSONDecode, HttpService, spieler:GetAttribute("Haustiere") or "[]")
	if ok then
		for _, h in tiere do
			local m = Modelle.haustier(h.Art, h.Gold)
			m.Parent = ordner
			table.insert(liste, m)
		end
	end
	anzeigen[spieler] = liste
end

local function beobachten(spieler: Player)
	neuAufbauen(spieler)
	spieler:GetAttributeChangedSignal("Haustiere"):Connect(function()
		neuAufbauen(spieler)
	end)
end

Players.PlayerAdded:Connect(beobachten)
for _, s in Players:GetPlayers() do
	beobachten(s)
end
Players.PlayerRemoving:Connect(wegraeumen)

-- Haustiere im Halbkreis hinter dem Spieler, weich nachziehen und leicht hüpfen
RunService.RenderStepped:Connect(function(dt)
	local t = os.clock()
	for spieler, liste in anzeigen do
		local figur = spieler.Character
		local root = figur and figur:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			for i, m in liste do
				local winkel = (i - (#liste + 1) / 2) * 0.7
				local ziel = root.CFrame * CFrame.new(math.sin(winkel) * 6, -1.2 + math.abs(math.sin(t * 4 + i)) * 0.8, math.cos(winkel) * 6)
				local jetzt = m:GetPivot()
				m:PivotTo(jetzt:Lerp(ziel, math.min(1, dt * 8)))
			end
		end
	end
end)
