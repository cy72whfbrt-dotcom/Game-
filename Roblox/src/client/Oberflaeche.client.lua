-- Oberfläche für Handy und PC: Münzen, Inventar, Shop, Geschenk, Ei-Animation, Münzen einsammeln, Tore
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local MarketplaceService = game:GetService("MarketplaceService")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage.Shared.Config)
local Logik = require(ReplicatedStorage.Shared.Logik)
local Modelle = require(ReplicatedStorage.Shared.Modelle)

local spieler = Players.LocalPlayer
local remotes = ReplicatedStorage:WaitForChild("Remotes")

local stand = nil -- letzter Stand vom Server
local GOLD = Color3.fromRGB(255, 205, 50)
local SCHRIFT = Enum.Font.FredokaOne

-- Bausteine ------------------------------------------------------------

local gui = Instance.new("ScreenGui")
gui.Name = "Oberflaeche"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = spieler:WaitForChild("PlayerGui")

-- Größe passt sich an: kleiner Bildschirm (Handy) → alles etwas kleiner, aber Knöpfe bleiben groß
local skala = Instance.new("UIScale")
skala.Parent = gui
local function skalaSetzen()
	local groesse = workspace.CurrentCamera.ViewportSize
	skala.Scale = math.clamp(math.min(groesse.X / 1100, groesse.Y / 650), 0.6, 1.4)
end
workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(skalaSetzen)
skalaSetzen()

local function ecke(obj: GuiObject, radius: number)
	Instance.new("UICorner", obj).CornerRadius = UDim.new(0, radius)
end

local function rand(obj: GuiObject, farbe: Color3, dicke: number)
	local s = Instance.new("UIStroke")
	s.Color = farbe
	s.Thickness = dicke
	s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	s.Parent = obj
	return s
end

local function text(eltern: Instance, inhalt: string, groesse: UDim2, pos: UDim2, farbe: Color3?): TextLabel
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Size = groesse
	t.Position = pos
	t.Font = SCHRIFT
	t.TextScaled = true
	t.Text = inhalt
	t.TextColor3 = farbe or Color3.new(1, 1, 1)
	local s = Instance.new("UIStroke")
	s.Thickness = 2
	s.Color = Color3.fromRGB(40, 30, 60)
	s.Parent = t
	t.Parent = eltern
	return t
end

local function knopf(eltern: Instance, inhalt: string, farbe: Color3, groesse: UDim2, pos: UDim2): TextButton
	local k = Instance.new("TextButton")
	k.Size = groesse
	k.Position = pos
	k.BackgroundColor3 = farbe
	k.Font = SCHRIFT
	k.TextScaled = true
	k.Text = inhalt
	k.TextColor3 = Color3.new(1, 1, 1)
	k.AutoButtonColor = true
	ecke(k, 16)
	rand(k, Color3.new(1, 1, 1), 3)
	local p = Instance.new("UIPadding")
	p.PaddingLeft = UDim.new(0, 8)
	p.PaddingRight = UDim.new(0, 8)
	p.PaddingTop = UDim.new(0, 6)
	p.PaddingBottom = UDim.new(0, 6)
	p.Parent = k
	k.Parent = eltern
	return k
end

-- Bild eines Modells (ViewportFrame) – für Haustier- und Ei-Kacheln
local function modellBild(eltern: Instance, modell: Model, groesse: UDim2, pos: UDim2): ViewportFrame
	local vf = Instance.new("ViewportFrame")
	vf.BackgroundTransparency = 1
	vf.Size = groesse
	vf.Position = pos
	vf.Ambient = Color3.fromRGB(200, 200, 200)
	vf.LightDirection = Vector3.new(-1, -1, -1)
	modell:PivotTo(CFrame.new())
	modell.Parent = vf
	local kamera = Instance.new("Camera")
	local _, ausmass = modell:GetBoundingBox()
	local abstand = ausmass.Magnitude * 1.1
	kamera.CFrame = CFrame.lookAt(Vector3.new(abstand * 0.35, abstand * 0.25, -abstand), Vector3.zero)
	kamera.Parent = vf
	vf.CurrentCamera = kamera
	vf.Parent = eltern
	return vf
end

-- Münz-Symbol aus einem runden Frame
local function muenzSymbol(eltern: Instance, groesse: UDim2, pos: UDim2): Frame
	local f = Instance.new("Frame")
	f.Size = groesse
	f.Position = pos
	f.BackgroundColor3 = GOLD
	ecke(f, 999)
	rand(f, Color3.fromRGB(200, 140, 20), 3)
	local t = text(f, "$", UDim2.fromScale(0.7, 0.7), UDim2.fromScale(0.15, 0.15), Color3.fromRGB(150, 90, 0))
	t.UIStroke.Thickness = 0
	f.Parent = eltern
	return f
end

-- Belohnungs-Kachel: Bild + Zahl, Rahmen in der Seltenheitsfarbe
local function kachel(eltern: Instance, farbe: Color3, zahl: string, oben: string?): Frame
	local k = Instance.new("Frame")
	k.Size = UDim2.fromOffset(150, 170)
	k.BackgroundColor3 = farbe:Lerp(Color3.fromRGB(30, 30, 50), 0.55)
	ecke(k, 20)
	rand(k, farbe, 5)
	local g = Instance.new("UIGradient")
	g.Color = ColorSequence.new(farbe:Lerp(Color3.new(1, 1, 1), 0.3), farbe:Lerp(Color3.new(0, 0, 0), 0.4))
	g.Rotation = 90
	g.Parent = k
	text(k, zahl, UDim2.new(1, -10, 0, 34), UDim2.new(0, 5, 1, -40))
	if oben then
		text(k, oben, UDim2.new(1, -10, 0, 22), UDim2.new(0, 5, 0, 6))
	end
	k.Parent = eltern
	return k
end

local function zentriert(obj: GuiObject)
	obj.AnchorPoint = Vector2.new(0.5, 0.5)
	obj.Position = UDim2.fromScale(0.5, 0.5)
end

-- Kurzer Hinweis oben in der Mitte
local hinweis = text(gui, "", UDim2.fromOffset(600, 44), UDim2.new(0.5, -300, 0, 70), Color3.fromRGB(255, 240, 150))
hinweis.Visible = false
local hinweisNr = 0
local function zeigeHinweis(inhalt: string)
	hinweisNr += 1
	local nr = hinweisNr
	hinweis.Text = inhalt
	hinweis.Visible = true
	task.delay(2.5, function()
		if nr == hinweisNr then
			hinweis.Visible = false
		end
	end)
end
remotes.Meldung.OnClientEvent:Connect(zeigeHinweis)

-- Kopfleiste: Münzen ---------------------------------------------------

local muenzLeiste = Instance.new("Frame")
muenzLeiste.Size = UDim2.fromOffset(260, 64)
muenzLeiste.Position = UDim2.fromOffset(16, 16)
muenzLeiste.BackgroundColor3 = Color3.fromRGB(40, 30, 70)
muenzLeiste.BackgroundTransparency = 0.15
ecke(muenzLeiste, 32)
rand(muenzLeiste, GOLD, 3)
muenzLeiste.Parent = gui
muenzSymbol(muenzLeiste, UDim2.fromOffset(52, 52), UDim2.fromOffset(6, 6))
local muenzText = text(muenzLeiste, "0", UDim2.new(1, -76, 0, 44), UDim2.fromOffset(66, 10), GOLD)
muenzText.TextXAlignment = Enum.TextXAlignment.Left

-- Seitenknöpfe (groß für Handy) -----------------------------------------

local seite = Instance.new("Frame")
seite.BackgroundTransparency = 1
seite.Size = UDim2.fromOffset(130, 300)
seite.Position = UDim2.new(0, 16, 0.5, -150)
seite.Parent = gui
local seitenListe = Instance.new("UIListLayout", seite)
seitenListe.Padding = UDim.new(0, 12)

local knopfInventar = knopf(seite, "Haustiere", Color3.fromRGB(80, 170, 255), UDim2.fromOffset(130, 80), UDim2.new())
local knopfShop = knopf(seite, "Shop", Color3.fromRGB(255, 90, 150), UDim2.fromOffset(130, 80), UDim2.new())
local knopfGeschenk = knopf(seite, "Geschenk", Color3.fromRGB(90, 200, 110), UDim2.fromOffset(130, 80), UDim2.new())

-- Fenster-Rahmen
local function fenster(titel: string, farbe: Color3): (Frame, TextLabel)
	local f = Instance.new("Frame")
	f.Size = UDim2.fromOffset(760, 500)
	zentriert(f)
	f.BackgroundColor3 = Color3.fromRGB(250, 248, 255)
	f.Visible = false
	ecke(f, 26)
	rand(f, farbe, 6)
	local kopf = Instance.new("Frame")
	kopf.Size = UDim2.new(1, 0, 0, 70)
	kopf.BackgroundColor3 = farbe
	ecke(kopf, 26)
	kopf.Parent = f
	local t = text(kopf, titel, UDim2.new(1, -120, 0, 48), UDim2.fromOffset(24, 11))
	t.TextXAlignment = Enum.TextXAlignment.Left
	local zu = knopf(kopf, "X", Color3.fromRGB(240, 70, 70), UDim2.fromOffset(60, 60), UDim2.new(1, -66, 0, 5))
	zu.Activated:Connect(function()
		f.Visible = false
	end)
	f.Parent = gui
	return f, t
end

local function raster(eltern: Frame, zelle: Vector2, oben: number, unten: number): ScrollingFrame
	local sf = Instance.new("ScrollingFrame")
	sf.Size = UDim2.new(1, -32, 1, -(oben + unten))
	sf.Position = UDim2.fromOffset(16, oben)
	sf.BackgroundTransparency = 1
	sf.ScrollBarThickness = 10
	sf.AutomaticCanvasSize = Enum.AutomaticSize.Y
	sf.CanvasSize = UDim2.new()
	local g = Instance.new("UIGridLayout")
	g.CellSize = UDim2.fromOffset(zelle.X, zelle.Y)
	g.CellPadding = UDim2.fromOffset(12, 12)
	g.SortOrder = Enum.SortOrder.LayoutOrder
	g.Parent = sf
	sf.Parent = eltern
	return sf
end

-- Inventar -------------------------------------------------------------

local inventar, inventarTitel = fenster("Haustiere", Color3.fromRGB(80, 170, 255))
local inventarRaster = raster(inventar, Vector2.new(130, 150), 82, 100)
local auswahlLeiste = Instance.new("Frame")
auswahlLeiste.BackgroundTransparency = 1
auswahlLeiste.Size = UDim2.new(1, -32, 0, 76)
auswahlLeiste.Position = UDim2.new(0, 16, 1, -88)
auswahlLeiste.Parent = inventar
local auswahlText = text(auswahlLeiste, "Tippe auf ein Haustier", UDim2.new(0.34, 0, 1, -16), UDim2.fromOffset(0, 8), Color3.fromRGB(70, 60, 110))
auswahlText.UIStroke.Thickness = 0
local knopfAusruesten = knopf(auswahlLeiste, "Ausrüsten", Color3.fromRGB(90, 200, 110), UDim2.new(0.21, 0, 1, 0), UDim2.fromScale(0.35, 0))
local knopfGold = knopf(auswahlLeiste, "3 → Gold", GOLD, UDim2.new(0.21, 0, 1, 0), UDim2.fromScale(0.57, 0))
local knopfFrei = knopf(auswahlLeiste, "Freigeben", Color3.fromRGB(240, 110, 90), UDim2.new(0.21, 0, 1, 0), UDim2.fromScale(0.79, 0))

local gewaehlt: string? = nil

local function inventarZeichnen()
	if not stand then
		return
	end
	for _, k in inventarRaster:GetChildren() do
		if k:IsA("GuiObject") then
			k:Destroy()
		end
	end
	local ids = {}
	for id in stand.Haustiere do
		table.insert(ids, id)
	end
	-- Ausgerüstete zuerst, dann nach Seltenheit und Gold
	local function wert(id)
		local h = stand.Haustiere[id]
		local aus = table.find(stand.Ausgeruestet, id) and 1000 or 0
		return aus + Logik.rang(Config.Haustiere[h.Art].Seltenheit) * 10 + (h.Gold and 5 or 0)
	end
	table.sort(ids, function(a, b)
		local wa, wb = wert(a), wert(b)
		if wa ~= wb then
			return wa > wb
		end
		return tonumber(a) < tonumber(b)
	end)
	for i, id in ids do
		local h = stand.Haustiere[id]
		local info = Config.Haustiere[h.Art]
		local farbe = if h.Gold then GOLD else Logik.seltenheitInfo(info.Seltenheit).Farbe
		local k = Instance.new("TextButton")
		k.LayoutOrder = i
		k.Text = ""
		k.BackgroundColor3 = farbe:Lerp(Color3.new(1, 1, 1), 0.6)
		ecke(k, 18)
		rand(k, if id == gewaehlt then Color3.fromRGB(40, 30, 70) else farbe, if id == gewaehlt then 6 else 4)
		modellBild(k, Modelle.haustier(h.Art, h.Gold), UDim2.new(1, -10, 1, -40), UDim2.fromOffset(5, 5))
		local kraft = "+" .. math.floor(Logik.kraft(h) * 100 + 0.5) .. " %"
		text(k, kraft, UDim2.new(1, -10, 0, 30), UDim2.new(0, 5, 1, -34))
		if table.find(stand.Ausgeruestet, id) then
			local haken = text(k, "✔", UDim2.fromOffset(34, 34), UDim2.new(1, -38, 0, 4), Color3.fromRGB(90, 220, 110))
			haken.ZIndex = 3
		end
		k.Activated:Connect(function()
			gewaehlt = id
			inventarZeichnen()
		end)
		k.Parent = inventarRaster
	end
	local anzahl = #ids
	inventarTitel.Text = "Haustiere " .. anzahl .. "/" .. stand.MaxInventar .. "   Ausgerüstet " .. #stand.Ausgeruestet .. "/" .. stand.MaxAusruestung
	local h = gewaehlt and stand.Haustiere[gewaehlt]
	if not h then
		gewaehlt = nil
		auswahlText.Text = "Tippe auf ein Haustier"
	else
		auswahlText.Text = (if h.Gold then "Goldenes " else "") .. h.Art .. " (" .. Config.Haustiere[h.Art].Seltenheit .. ")"
		knopfAusruesten.Text = if table.find(stand.Ausgeruestet, gewaehlt) then "Ablegen" else "Ausrüsten"
	end
	knopfAusruesten.Visible = h ~= nil
	knopfGold.Visible = h ~= nil and not h.Gold
	knopfFrei.Visible = h ~= nil
end

knopfAusruesten.Activated:Connect(function()
	if gewaehlt and stand then
		remotes.Ausruesten:InvokeServer(gewaehlt, table.find(stand.Ausgeruestet, gewaehlt) == nil)
	end
end)
knopfGold.Activated:Connect(function()
	local h = gewaehlt and stand and stand.Haustiere[gewaehlt]
	if h then
		local ok, neu = remotes.Zusammenlegen:InvokeServer(h.Art)
		if ok then
			gewaehlt = neu
			zeigeHinweis("Goldenes " .. h.Art .. "!")
		end
	end
end)
knopfFrei.Activated:Connect(function()
	if gewaehlt then
		remotes.Freigeben:InvokeServer(gewaehlt)
		gewaehlt = nil
	end
end)

-- Shop -----------------------------------------------------------------

local shop = fenster("Shop", Color3.fromRGB(255, 90, 150))
local shopRaster = raster(shop, Vector2.new(160, 200), 82, 16)

local function shopZeichnen()
	for _, k in shopRaster:GetChildren() do
		if k:IsA("GuiObject") then
			k:Destroy()
		end
	end
	local nr = 0
	for schluessel, pass in Config.Paesse do
		nr += 1
		local hat = stand and stand.Paesse[schluessel]
		local k = kachel(shopRaster, Color3.fromRGB(170, 80, 255), if hat then "Gekauft" else "R$ " .. pass.Preis, "Pass")
		k.LayoutOrder = nr
		text(k, pass.Name, UDim2.new(1, -16, 0, 70), UDim2.fromOffset(8, 40))
		local b = Instance.new("TextButton")
		b.BackgroundTransparency = 1
		b.Text = ""
		b.Size = UDim2.fromScale(1, 1)
		b.Parent = k
		b.Activated:Connect(function()
			if hat then
				return
			elseif pass.Id == 0 then
				zeigeHinweis("Pass-ID fehlt noch in Config.lua")
			else
				MarketplaceService:PromptGamePassPurchase(spieler, pass.Id)
			end
		end)
	end
	for _, produkt in Config.Produkte do
		nr += 1
		local k
		if produkt.Art == "Muenzen" then
			k = kachel(shopRaster, GOLD, "+" .. Logik.kurzZahl(produkt.Menge), "R$ " .. produkt.Preis)
			muenzSymbol(k, UDim2.fromOffset(80, 80), UDim2.new(0.5, -40, 0, 42))
		else
			local ei = Config.Eier[produkt.Ei]
			k = kachel(shopRaster, ei.Farbe, ei.Name, "R$ " .. produkt.Preis)
			modellBild(k, Modelle.ei(produkt.Ei), UDim2.fromOffset(100, 100), UDim2.new(0.5, -50, 0, 30))
		end
		k.LayoutOrder = nr
		local b = Instance.new("TextButton")
		b.BackgroundTransparency = 1
		b.Text = ""
		b.Size = UDim2.fromScale(1, 1)
		b.Parent = k
		b.Activated:Connect(function()
			if produkt.Id == 0 then
				zeigeHinweis("Produkt-ID fehlt noch in Config.lua")
			else
				MarketplaceService:PromptProductPurchase(spieler, produkt.Id)
			end
		end)
	end
end

-- Großes Bild in der Mitte (Belohnung oder Ei) --------------------------

local buehne = Instance.new("Frame")
buehne.Size = UDim2.fromScale(1, 1)
buehne.BackgroundColor3 = Color3.new(0, 0, 0)
buehne.BackgroundTransparency = 1
buehne.Visible = false
buehne.ZIndex = 10
buehne.Parent = gui

local function buehneLeeren()
	for _, k in buehne:GetChildren() do
		k:Destroy()
	end
end

-- Zeigt eine Belohnungs-Kachel groß in der Mitte
local function belohnungZeigen(farbe: Color3, zahl: string, oben: string?, bild: (Frame) -> ())
	buehneLeeren()
	buehne.Visible = true
	buehne.BackgroundTransparency = 0.5
	local k = kachel(buehne, farbe, zahl, oben)
	zentriert(k)
	bild(k)
	local ks = Instance.new("UIScale", k)
	ks.Scale = 0.2
	TweenService:Create(ks, TweenInfo.new(0.4, Enum.EasingStyle.Back), { Scale = 1.6 }):Play()
	task.delay(2.2, function()
		buehne.Visible = false
	end)
end

-- Ei-Animation: Ei wackelt, Leuchten in der Seltenheitsfarbe, dann das Haustier als Kachel
remotes.EiErgebnis.OnClientEvent:Connect(function(eiName, art, _id, dauer)
	buehneLeeren()
	buehne.Visible = true
	buehne.BackgroundTransparency = 0.4
	local farbe = Logik.seltenheitInfo(Config.Haustiere[art].Seltenheit).Farbe
	local eiBild = modellBild(buehne, Modelle.ei(eiName), UDim2.fromOffset(260, 260), UDim2.new())
	zentriert(eiBild)
	local wackelZeit = math.max(0.6, dauer * 0.5)
	local ende = os.clock() + wackelZeit
	while os.clock() < ende do
		local staerke = 1 - (ende - os.clock()) / wackelZeit
		eiBild.Rotation = math.sin(os.clock() * 30) * 25 * staerke
		RunService.RenderStepped:Wait()
	end
	-- Leuchten
	local licht = Instance.new("Frame")
	licht.BackgroundColor3 = farbe
	licht.Size = UDim2.fromOffset(40, 40)
	zentriert(licht)
	ecke(licht, 999)
	local lg = Instance.new("UIGradient")
	lg.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 1) })
	lg.Parent = licht
	licht.Parent = buehne
	TweenService:Create(licht, TweenInfo.new(0.5, Enum.EasingStyle.Quad), { Size = UDim2.fromOffset(1400, 1400) }):Play()
	TweenService:Create(buehne, TweenInfo.new(0.5), { BackgroundColor3 = farbe }):Play()
	task.wait(0.5)
	buehne.BackgroundColor3 = Color3.new(0, 0, 0)
	belohnungZeigen(farbe, art, Config.Haustiere[art].Seltenheit, function(k)
		modellBild(k, Modelle.haustier(art, false), UDim2.fromOffset(110, 110), UDim2.new(0.5, -55, 0, 28))
	end)
end)

-- Tägliches Geschenk
knopfGeschenk.Activated:Connect(function()
	local betrag, info = remotes.TagesBelohnung:InvokeServer()
	if betrag then
		belohnungZeigen(GOLD, "+" .. Logik.kurzZahl(betrag), "Tag " .. info, function(k)
			muenzSymbol(k, UDim2.fromOffset(80, 80), UDim2.new(0.5, -40, 0, 42))
		end)
	elseif info then
		zeigeHinweis("Nächstes Geschenk in " .. math.ceil(info / 3600) .. " Std.")
	end
end)

knopfInventar.Activated:Connect(function()
	shop.Visible = false
	inventar.Visible = not inventar.Visible
	inventarZeichnen()
end)
knopfShop.Activated:Connect(function()
	inventar.Visible = false
	shop.Visible = not shop.Visible
	shopZeichnen()
end)

-- Stand vom Server -----------------------------------------------------

-- Tore: für freigeschaltete Gebiete nur bei diesem Spieler durchlässig
local function toreSetzen()
	local welt = workspace:FindFirstChild("Welt")
	if not welt or not stand then
		return
	end
	for _, teil in welt:GetChildren() do
		local gebiet = teil:GetAttribute("Gebiet")
		if gebiet then
			local offen = table.find(stand.Gebiete, gebiet) ~= nil
			teil.CanCollide = not offen
			teil.Transparency = if offen then 0.85 else 0
			local prompt = teil:FindFirstChildOfClass("ProximityPrompt")
			if prompt then
				prompt.Enabled = not offen
			end
		end
	end
end

remotes.Stand.OnClientEvent:Connect(function(neu)
	stand = neu
	muenzText.Text = Logik.kurzZahl(neu.Muenzen)
	toreSetzen()
	if inventar.Visible then
		inventarZeichnen()
	end
	if shop.Visible then
		shopZeichnen()
	end
end)
remotes.StandAnfrage:FireServer()

-- Münzen einsammeln: nahe Münzen beim Server anfragen (der prüft Abstand und Abkühlzeit)
local muenzOrdner = workspace:WaitForChild("Muenzen")
local gefragt: { [number]: number } = {}
task.spawn(function()
	while true do
		task.wait(0.15)
		local figur = spieler.Character
		local root = figur and figur:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			for _, m in muenzOrdner:GetChildren() do
				local id = m:GetAttribute("Id")
				if id and m.Transparency < 1 and (m.Position - root.Position).Magnitude < 7 and os.clock() - (gefragt[id] or 0) > 1 then
					gefragt[id] = os.clock()
					remotes.Einsammeln:FireServer(id)
				end
			end
		end
	end
end)

-- Münzen drehen sich (nur Anzeige)
RunService.RenderStepped:Connect(function(dt)
	for _, m in muenzOrdner:GetChildren() do
		if m:IsA("BasePart") and m.Transparency < 1 then
			m.CFrame = CFrame.new(m.Position) * CFrame.Angles(0, dt * 2, 0) * m.CFrame.Rotation
		end
	end
end)
