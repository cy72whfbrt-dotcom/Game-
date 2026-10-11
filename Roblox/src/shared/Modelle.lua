-- Modelle holen: liegt ein Modell mit dem Namen in ReplicatedStorage/Modelle, wird es genommen,
-- sonst ein bunter Platzhalter aus Parts
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(script.Parent.Config)
local Logik = require(script.Parent.Logik)

local Modelle = {}

local function teil(modell: Model, name: string, form: Enum.PartType, groesse: Vector3, farbe: Color3, versatz: CFrame)
	local p = Instance.new("Part")
	p.Name = name
	p.Shape = form
	p.Size = groesse
	p.Color = farbe
	p.Material = Enum.Material.SmoothPlastic
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p:SetAttribute("Versatz", versatz)
	p.Parent = modell
	return p
end

-- Setzt alle Teile relativ zum Hauptteil (Versatz-Attribut)
local function anordnen(modell: Model)
	local haupt = modell.PrimaryPart :: BasePart
	for _, p in modell:GetChildren() do
		if p:IsA("BasePart") and p ~= haupt then
			p.CFrame = haupt.CFrame * (p:GetAttribute("Versatz") or CFrame.new())
		end
	end
end

local function eigenes(name: string): Model?
	local ordner = ReplicatedStorage:FindFirstChild("Modelle")
	local m = ordner and ordner:FindFirstChild(name)
	if m and m:IsA("Model") then
		local kopie = m:Clone()
		for _, p in kopie:GetDescendants() do
			if p:IsA("BasePart") then
				p.Anchored = true
				p.CanCollide = false
			end
		end
		return kopie
	end
	return nil
end

-- Haustier: runder Körper, Ohren, Augen; Neon ab episch, golden glänzt
function Modelle.haustier(art: string, gold: boolean?): Model
	local info = Config.Haustiere[art]
	local seltenheit = Logik.seltenheitInfo(info.Seltenheit)
	local m = eigenes(info.Modell)
	if not m then
		m = Instance.new("Model")
		local farbe = if gold then Color3.fromRGB(255, 205, 50) else info.Farbe
		local koerper = teil(m, "Koerper", Enum.PartType.Ball, Vector3.new(2.2, 2.2, 2.2), farbe, CFrame.new())
		m.PrimaryPart = koerper
		teil(m, "OhrL", Enum.PartType.Ball, Vector3.new(0.7, 1.1, 0.7), farbe, CFrame.new(-0.6, 1.1, 0))
		teil(m, "OhrR", Enum.PartType.Ball, Vector3.new(0.7, 1.1, 0.7), farbe, CFrame.new(0.6, 1.1, 0))
		teil(m, "AugeL", Enum.PartType.Ball, Vector3.new(0.45, 0.45, 0.45), Color3.new(0.1, 0.1, 0.15), CFrame.new(-0.45, 0.3, -0.95))
		teil(m, "AugeR", Enum.PartType.Ball, Vector3.new(0.45, 0.45, 0.45), Color3.new(0.1, 0.1, 0.15), CFrame.new(0.45, 0.3, -0.95))
		if seltenheit.Neon then
			local ring = teil(m, "Ring", Enum.PartType.Cylinder, Vector3.new(0.2, 3, 3), seltenheit.Farbe, CFrame.new(0, -1.2, 0) * CFrame.Angles(0, 0, math.rad(90)))
			ring.Material = Enum.Material.Neon
			ring.Transparency = 0.3
		end
		if gold then
			koerper.Material = Enum.Material.Foil
			koerper.Reflectance = 0.3
			local glanz = Instance.new("Sparkles")
			glanz.SparkleColor = Color3.fromRGB(255, 230, 120)
			glanz.Parent = koerper
		end
		anordnen(m)
	end
	m.Name = art
	return m
end

-- Ei: gestrecktes Ei mit Punkten in der Ei-Farbe
function Modelle.ei(eiName: string): Model
	local info = Config.Eier[eiName]
	local m = eigenes(info.Modell)
	if not m then
		m = Instance.new("Model")
		local schale = teil(m, "Schale", Enum.PartType.Ball, Vector3.new(4, 5.2, 4), info.Farbe, CFrame.new())
		m.PrimaryPart = schale
		for i = 1, 5 do
			local winkel = i * math.pi * 2 / 5
			teil(m, "Punkt" .. i, Enum.PartType.Ball, Vector3.new(0.9, 0.9, 0.9), Color3.new(1, 1, 1),
				CFrame.new(math.cos(winkel) * 1.85, (i % 2) * 1.2 - 0.4, math.sin(winkel) * 1.85))
		end
		anordnen(m)
	end
	m.Name = eiName
	return m
end

-- Münze: flache goldene Scheibe (eigenes Modell: ein Part/MeshPart „Muenze“)
function Modelle.muenze(): BasePart
	local ordner = ReplicatedStorage:FindFirstChild("Modelle")
	local eigene = ordner and ordner:FindFirstChild("Muenze")
	if eigene and eigene:IsA("BasePart") then
		local kopie = eigene:Clone()
		kopie.Anchored = true
		kopie.CanCollide = false
		return kopie
	end
	local p = Instance.new("Part")
	p.Shape = Enum.PartType.Cylinder
	p.Size = Vector3.new(0.4, 2.4, 2.4)
	p.Color = Color3.fromRGB(255, 200, 40)
	p.Material = Enum.Material.Neon
	p.Anchored = true
	p.CanCollide = false
	return p
end

return Modelle
