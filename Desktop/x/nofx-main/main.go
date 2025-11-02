package main

import (
	"fmt"
	"log"
	"danto/api"
	"danto/config"
	"danto/manager"
	"danto/pool"
	"os"
	"os/signal"
	"strings"
	"syscall"
)

func main() {
	fmt.Println("╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║    🏆 AI模型交易竞赛系统 - Qwen vs DeepSeek               ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	fmt.Println()

	// 加载配置文件
	configFile := "config.json"
	if len(os.Args) > 1 {
		configFile = os.Args[1]
	}

	log.Printf("📋 加载配置文件: %s", configFile)
	cfg, err := config.LoadConfig(configFile)
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	log.Printf("✓ Configuration loaded successfully, %d traders participating", len(cfg.Traders))
	fmt.Println()

	// Set default mainstream coin list
	pool.SetDefaultCoins(cfg.DefaultCoins)

	// Set whether to use default mainstream coins
	pool.SetUseDefaultCoins(cfg.UseDefaultCoins)
	if cfg.UseDefaultCoins {
		log.Printf("✓ Default mainstream coin list enabled (%d coins): %v", len(cfg.DefaultCoins), cfg.DefaultCoins)
	}

	// Set coin pool API URL
	if cfg.CoinPoolAPIURL != "" {
		pool.SetCoinPoolAPI(cfg.CoinPoolAPIURL)
		log.Printf("✓ AI500 coin pool API configured")
	}
	if cfg.OITopAPIURL != "" {
		pool.SetOITopAPI(cfg.OITopAPIURL)
		log.Printf("✓ OI Top API configured")
	}

	// Create TraderManager
	traderManager := manager.NewTraderManager()

	// Add all enabled traders
	enabledCount := 0
	for i, traderCfg := range cfg.Traders {
		// Skip disabled traders
		if !traderCfg.Enabled {
			log.Printf("⏭️  [%d/%d] Skipping disabled trader %s", i+1, len(cfg.Traders), traderCfg.Name)
			continue
		}

		enabledCount++
		log.Printf("📦 [%d/%d] Initializing %s (%s model)...",
			i+1, len(cfg.Traders), traderCfg.Name, strings.ToUpper(traderCfg.AIModel))

		err := traderManager.AddTrader(
			traderCfg,
			cfg.CoinPoolAPIURL,
			cfg.MaxDailyLoss,
			cfg.MaxDrawdown,
			cfg.StopTradingMinutes,
			cfg.Leverage, // Pass leverage configuration
		)
		if err != nil {
			log.Fatalf("❌ Failed to initialize trader: %v", err)
		}
	}

	// Check if at least one trader is enabled
	if enabledCount == 0 {
		log.Fatalf("❌ No enabled traders found, please set at least one trader's enabled=true in config.json")
	}

	fmt.Println()
	fmt.Println("🏁 Competition Participants:")
	for _, traderCfg := range cfg.Traders {
		// Only show enabled traders
		if !traderCfg.Enabled {
			continue
		}
		fmt.Printf("  • %s (%s) - Initial Balance: %.0f USDT\n",
			traderCfg.Name, strings.ToUpper(traderCfg.AIModel), traderCfg.InitialBalance)
	}

	fmt.Println()
	fmt.Println("🤖 AI Full Decision Mode:")
	fmt.Printf("  • AI will autonomously decide leverage for each trade (Altcoins max %dx, BTC/ETH max %dx)\n",
		cfg.Leverage.AltcoinLeverage, cfg.Leverage.BTCETHLeverage)
	fmt.Println("  • AI will autonomously decide position size for each trade")
	fmt.Println("  • AI will autonomously set stop-loss and take-profit prices")
	fmt.Println("  • AI will make comprehensive analysis based on market data, technical indicators, and account status")
	fmt.Println()
	fmt.Println("⚠️  Risk Warning: AI auto-trading carries risks, recommended for small amounts testing!")
	fmt.Println()
	fmt.Println("Press Ctrl+C to stop")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println()

	// Create and start API server
	apiServer := api.NewServer(traderManager, cfg.APIServerPort)
	go func() {
		if err := apiServer.Start(); err != nil {
			log.Printf("❌ API server error: %v", err)
		}
	}()

	// Set up graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Start all traders
	traderManager.StartAll()

	// Wait for exit signal
	<-sigChan
	fmt.Println()
	fmt.Println()
	log.Println("📛 Received exit signal, stopping all traders...")
	traderManager.StopAll()

	fmt.Println()
	fmt.Println("👋 Thank you for using DANTO AI Trading System!")
}
