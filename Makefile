
# SSL certificate paths
SSL_DIR = ngnix
SSL_CERT = $(SSL_DIR)/cert.pem
SSL_KEY = $(SSL_DIR)/key.pem
SSL_DAYS = 365

# Check and create SSL certificates if they don't exist
ssl-certs:
	@if [ ! -f $(SSL_CERT) ] || [ ! -f $(SSL_KEY) ]; then \
		echo "Creating SSL certificates..."; \
		openssl req -x509 -nodes -days $(SSL_DAYS) -newkey rsa:2048 \
			-keyout $(SSL_KEY) -out $(SSL_CERT) \
			-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"; \
		echo "SSL certificates created successfully"; \
	fi

# Build Docker images
build: ssl-certs
	docker compose build

# Start services
up: ssl-certs
	docker compose up -d

# Stop services
down:
	docker compose down

# Force down - remove volumes and orphan containers
fdown:
	docker compose down -v --remove-orphans

# Show container status
ps:
	docker compose ps

# Clean SSL certificates
clean:
	rm -f $(SSL_CERT) $(SSL_KEY)
	@echo "SSL certificates removed"

.PHONY: up build down fdown ps ssl-certs clean
