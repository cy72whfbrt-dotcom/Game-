-- Baut die Karte: 3 Gebiete nebeneinander, Tore dazwischen, Ei-Stände mit Chancen-Tafel, Münz-Plätze
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Logik = require(ReplicatedStorage.Shared.Logik)
local Modelle = require(ReplicatedStorage.Shared.Modelle)

local Welt = {}

Welt.GEBIET_GROESSE = 100
Welt.ABSTAND = 110 -- von Gebietsmitte zu Gebietsmitte (X-Richtung)

local function block(name: string, groesse: Vector3, cf: CFrame, farbe: Color3, eltern: Instance): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = groesse
	p.CFrame = cf
	p.Color = farbe
	p.Anchored = true
	p.Material = Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.Parent = eltern
	return p
end

function Welt.mitte(gebiet: number): Vector3
	return Vector3.new((gebiet - 1) * Welt.ABSTAND, 0, 0)
end

-- Welches Gebiet liegt an dieser Stelle? (nil = außerhalb)
function Welt.gebietBei(pos: Vector3): number?
	for i in Config.Gebiete do
		local d = pos - Welt.mitte(i)
		if math.abs(d.X) <= Welt.GEBIET_GROESSE / 2 + 5 and math.abs(d.Z) <= Welt.GEBIET_GROESSE / 2 + 5 then
			return i
		end
	end
	return nil
end

-- Schild mit Text über einem Teil (BillboardGui)
local function schild(teil: BasePart, zeilen: { { Text: string, Farbe: Color3 } }, hoehe: number)
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(240, 34 * #zeilen + 16)
	bb.StudsOffset = Vector3.new(0, hoehe, 0)
	bb.AlwaysOnTop = false
	bb.MaxDistance = 80
	local rahmen = Instance.new("Frame")
	rahmen.Size = UDim2.fromScale(1, 1)
	rahmen.BackgroundColor3 = Color3.fromRGB(30, 30, 50)
	rahmen.BackgroundTransparency = 0.2
	rahmen.Parent = bb
	Instance.new("UICorner", rahmen).CornerRadius = UDim.new(0, 14)
	local liste = Instance.new("UIListLayout", rahmen)
	liste.HorizontalAlignment = Enum.HorizontalAlignment.Center
	liste.VerticalAlignment = Enum.VerticalAlignment.Center
	for i, z in zeilen do
		local t = Instance.new("TextLabel")
		t.LayoutOrder = i
		t.Size = UDim2.new(1, -12, 0, 32)
		t.BackgroundTransparency = 1
		t.Font = Enum.Font.FredokaOne
		t.TextScaled = true
		t.Text = z.Text
		t.TextColor3 = z.Farbe
		t.Parent = rahmen
	end
	bb.Parent = teil
end

-- Baut alles; liefert Tore, Ei-Stände und Münz-Plätze
function Welt.bauen()
	local ordner = Instance.new("Folder")
	ordner.Name = "Welt"
	ordner.Parent = workspace

	local tore, staende, plaetze = {}, {}, {}
	local g = Welt.GEBIET_GROESSE
	for i, gebiet in Config.Gebiete do
		local mitte = Welt.mitte(i)
		block("Boden_" .. gebiet.Name, Vector3.new(g, 2, g), CFrame.new(mitte - Vector3.new(0, 1, 0)), gebiet.Farbe, ordner)
		-- Rand, damit niemand herunterfällt
		block("RandN", Vector3.new(g, 6, 2), CFrame.new(mitte + Vector3.new(0, 3, g / 2)), gebiet.Farbe:Lerp(Color3.new(1, 1, 1), 0.4), ordner)
		block("RandS", Vector3.new(g, 6, 2), CFrame.new(mitte + Vector3.new(0, 3, -g / 2)), gebiet.Farbe:Lerp(Color3.new(1, 1, 1), 0.4), ordner)
		-- Brücke zum nächsten Gebiet
		if i < #Config.Gebiete then
			block("Bruecke", Vector3.new(Welt.ABSTAND - g, 2, 20), CFrame.new(mitte + Vector3.new(Welt.ABSTAND / 2, -1, 0)), Color3.fromRGB(200, 160, 110), ordner)
		end
		if i == 1 then
			local spawn = Instance.new("SpawnLocation")
			spawn.Size = Vector3.new(10, 1, 10)
			spawn.CFrame = CFrame.new(mitte + Vector3.new(-30, 0.5, 0))
			spawn.Anchored = true
			spawn.Color = Color3.fromRGB(255, 255, 255)
			spawn.Parent = ordner
		else
			-- Tor auf der Brücke vor dem Gebiet: der Server lässt es stehen, der Client öffnet es für Besitzer
			local tor = block("Tor_" .. i, Vector3.new(2, 14, 20), CFrame.new(mitte - Vector3.new(g / 2 + 2, -6, 0)), gebiet.Farbe, ordner)
			tor.Material = Enum.Material.ForceField
			tor:SetAttribute("Gebiet", i)
			schild(tor, {
				{ Text = gebiet.Name, Farbe = Color3.new(1, 1, 1) },
				{ Text = "🪙 " .. Logik.kurzZahl(gebiet.Preis), Farbe = Color3.fromRGB(255, 215, 60) },
			}, 9)
			local prompt = Instance.new("ProximityPrompt")
			prompt.ActionText = "Freischalten"
			prompt.ObjectText = gebiet.Name
			prompt.HoldDuration = 0.3
			prompt.MaxActivationDistance = 14
			prompt.RequiresLineOfSight = false
			prompt.Parent = tor
			tore[i] = { Teil = tor, Prompt = prompt }
		end
		-- Münz-Plätze im Raster
		for x = -40, 40, 16 do
			for z = -40, 40, 16 do
				if math.abs(x) > 12 or math.abs(z) > 12 then
					table.insert(plaetze, { Gebiet = i, Pos = mitte + Vector3.new(x, 1.6, z) })
				end
			end
		end
	end

	-- Ei-Stände mit Chancen-Tafel
	for eiName, ei in Config.Eier do
		if not ei.NurRobux then
			local mitte = Welt.mitte(ei.Gebiet)
			local sockel = block("Stand_" .. eiName, Vector3.new(8, 2, 8), CFrame.new(mitte + Vector3.new(0, 1, 0)), Color3.fromRGB(255, 255, 255), ordner)
			local modell = Modelle.ei(eiName)
			modell:PivotTo(CFrame.new(mitte + Vector3.new(0, 5, 0)))
			modell.Parent = ordner
			local zeilen = {
				{ Text = ei.Name, Farbe = Color3.new(1, 1, 1) },
				{ Text = "🪙 " .. Logik.kurzZahl(ei.Preis), Farbe = Color3.fromRGB(255, 215, 60) },
			}
			for _, c in Logik.chancenListe(eiName) do
				table.insert(zeilen, { Text = c.Art .. "  " .. c.Prozent .. " %", Farbe = Logik.seltenheitInfo(c.Seltenheit).Farbe })
			end
			schild(sockel, zeilen, 12)
			local prompt = Instance.new("ProximityPrompt")
			prompt.ActionText = "Öffnen (" .. Logik.kurzZahl(ei.Preis) .. ")"
			prompt.ObjectText = ei.Name
			prompt.MaxActivationDistance = 12
			prompt.RequiresLineOfSight = false
			prompt.Parent = sockel
			staende[eiName] = { Teil = sockel, Prompt = prompt }
		end
	end
	return tore, staende, plaetze
end

return Welt
