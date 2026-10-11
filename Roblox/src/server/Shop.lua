-- Robux-Shop: Game Passes prüfen, Developer Products sicher gutschreiben (ProcessReceipt)
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Daten = require(script.Parent.Daten)

local Shop = {}

local paesse: { [Player]: { [string]: boolean } } = {}

function Shop.paesse(spieler: Player)
	return paesse[spieler] or {}
end

local function passPruefen(spieler: Player, schluessel: string)
	local id = Config.Paesse[schluessel].Id
	if id == 0 then
		return false
	end
	local ok, hat = pcall(MarketplaceService.UserOwnsGamePassAsync, MarketplaceService, spieler.UserId, id)
	return ok and hat == true
end

-- Pässe eines neuen Spielers abfragen
function Shop.spielerDazu(spieler: Player)
	local stand = {}
	for schluessel in Config.Paesse do
		stand[schluessel] = passPruefen(spieler, schluessel)
	end
	paesse[spieler] = stand
end

-- gutschreiben(spieler, profil, produkt) macht die eigentliche Gutschrift; passGeaendert(spieler) nach Pass-Kauf
function Shop.start(gutschreiben, passGeaendert)
	Players.PlayerRemoving:Connect(function(spieler)
		paesse[spieler] = nil
	end)

	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(spieler, passId, gekauft)
		if not gekauft or not paesse[spieler] then
			return
		end
		for schluessel, pass in Config.Paesse do
			if pass.Id ~= 0 and pass.Id == passId then
				paesse[spieler][schluessel] = true
				passGeaendert(spieler)
			end
		end
	end)

	-- Kauf-ID wird im Profil gespeichert: derselbe Kauf wird nie zweimal gutgeschrieben.
	-- PurchaseGranted erst, wenn das Speichern geklappt hat; sonst versucht Roblox es später erneut.
	MarketplaceService.ProcessReceipt = function(beleg)
		local spieler = Players:GetPlayerByUserId(beleg.PlayerId)
		if not spieler then
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		local profil = Daten.warten(spieler, 15)
		if not profil then
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		local kaufId = tostring(beleg.PurchaseId)
		if profil.Kaeufe[kaufId] then
			return Enum.ProductPurchaseDecision.PurchaseGranted
		end
		local produkt
		for _, p in Config.Produkte do
			if p.Id ~= 0 and p.Id == beleg.ProductId then
				produkt = p
			end
		end
		if not produkt then
			warn("Unbekanntes Produkt " .. tostring(beleg.ProductId))
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		gutschreiben(spieler, profil, produkt)
		Daten.kaufMerken(profil, kaufId)
		if Daten.speichern(spieler) then
			return Enum.ProductPurchaseDecision.PurchaseGranted
		end
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
end

return Shop
