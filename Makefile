
# ──────────────────────────────────────────────────────────────
#  Andary — Project Makefile
# ──────────────────────────────────────────────────────────────

# ── Colors & Formatting ──────────────────────────────────────
BOLD    := \033[1m
DIM     := \033[2m
RESET   := \033[0m
GREEN   := \033[1;32m
YELLOW  := \033[1;33m
CYAN    := \033[1;36m
RED     := \033[1;31m
MAGENTA := \033[1;35m
CHECK   := $(GREEN)✔$(RESET)
ARROW   := $(CYAN)▸$(RESET)
WARN    := $(YELLOW)⚠$(RESET)
CROSS   := $(RED)✘$(RESET)

# ── Configuration ────────────────────────────────────────────
SSL_DIR   = nginx
SSL_CERT  = $(SSL_DIR)/cert.pem
SSL_KEY   = $(SSL_DIR)/key.pem
SSL_DAYS  = 365
HTTPS_URL = https://localhost:4443

.DEFAULT_GOAL := help

# ══════════════════════════════════════════════════════════════
#  Help
# ══════════════════════════════════════════════════════════════

help: ## Show available commands
	@echo ""
	@printf "  $(BOLD)$(CYAN)Andary$(RESET) $(DIM)— available commands$(RESET)\n"
	@echo ""
	@printf "  $(BOLD)Services$(RESET)\n"
	@printf "    $(GREEN)make up$(RESET)        Start all services\n"
	@printf "    $(GREEN)make down$(RESET)      Stop services\n"
	@printf "    $(GREEN)make fdown$(RESET)     Stop services + remove volumes & orphans\n"
	@printf "    $(GREEN)make ps$(RESET)        Show container status\n"
	@echo ""
	@printf "  $(BOLD)Build$(RESET)\n"
	@printf "    $(GREEN)make build$(RESET)     Build Docker images\n"
	@echo ""
	@printf "  $(BOLD)SSL$(RESET)\n"
	@printf "    $(GREEN)make ssl$(RESET)       Generate self-signed SSL certificates\n"
	@printf "    $(GREEN)make clean$(RESET)     Remove generated SSL certificates\n"
	@echo ""
	@printf "  $(DIM)After startup, open:$(RESET)\n"
	@printf "    $(CYAN)$(HTTPS_URL)$(RESET)  $(DIM)(browser may show self-signed warning)$(RESET)\n"
	@echo ""

# ══════════════════════════════════════════════════════════════
#  SSL Certificates
# ══════════════════════════════════════════════════════════════

ssl-certs: ## Generate self-signed SSL certificates (if missing)
	@if [ ! -f $(SSL_CERT) ] || [ ! -f $(SSL_KEY) ]; then \
		printf "  $(ARROW) Generating SSL certificates…\n"; \
		openssl req -x509 -nodes -days $(SSL_DAYS) -newkey rsa:2048 \
			-keyout $(SSL_KEY) -out $(SSL_CERT) \
			-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
			> /dev/null 2>&1; \
		if [ $$? -eq 0 ]; then \
			printf "  $(CHECK) SSL certificates created  $(DIM)($(SSL_CERT), $(SSL_KEY))$(RESET)\n"; \
		else \
			printf "  $(CROSS) Failed to create SSL certificates\n"; \
			exit 1; \
		fi \
	else \
		printf "  $(CHECK) SSL certificates already exist\n"; \
	fi

ssl: ssl-certs ## Alias for ssl-certs

# ══════════════════════════════════════════════════════════════
#  Build
# ══════════════════════════════════════════════════════════════

build: ssl-certs ## Build Docker images
	@echo ""
	@printf "  $(ARROW) Building Docker images…\n"
	@echo ""
	@docker compose build \
		&& printf "\n  $(CHECK) Build completed successfully\n\n" \
		|| (printf "\n  $(CROSS) Build failed\n\n" && exit 1)

# ══════════════════════════════════════════════════════════════
#  Services
# ══════════════════════════════════════════════════════════════

up: ssl-certs ## Start all services
	@echo ""
	@printf "  $(ARROW) Starting services…\n"
	@echo ""
	@docker compose up -d \
		&& ( \
			printf "\n  $(CHECK) All services are running\n"; \
			echo ""; \
			printf "  $(DIM)Open in browser:$(RESET)\n"; \
			printf "    $(CYAN)$(HTTPS_URL)$(RESET)  $(DIM)(may show self-signed warning)$(RESET)\n"; \
			echo "" \
		) \
		|| (printf "\n  $(CROSS) Failed to start services\n\n" && exit 1)

down: ## Stop services
	@echo ""
	@printf "  $(ARROW) Stopping services…\n"
	@echo ""
	@docker compose down \
		&& printf "\n  $(CHECK) Services stopped\n\n" \
		|| (printf "\n  $(CROSS) Failed to stop services\n\n" && exit 1)

fdown: ## Stop services and remove volumes/orphans
	@echo ""
	@printf "  $(WARN) Stopping services and removing volumes & orphans…\n"
	@echo ""
	@docker compose down -v --remove-orphans \
		&& printf "\n  $(CHECK) Services stopped, volumes & orphans removed\n\n" \
		|| (printf "\n  $(CROSS) Failed to tear down services\n\n" && exit 1)

# ══════════════════════════════════════════════════════════════
#  Status & Cleanup
# ══════════════════════════════════════════════════════════════

ps: ## Show container status
	@echo ""
	@printf "  $(ARROW) Container status\n"
	@echo ""
	@docker compose ps
	@echo ""

clean: ## Remove generated SSL certificates
	@rm -f $(SSL_CERT) $(SSL_KEY)
	@printf "  $(CHECK) SSL certificates removed\n"

# ── Phony targets ────────────────────────────────────────────
.PHONY: help up build down fdown ps ssl-certs ssl clean
