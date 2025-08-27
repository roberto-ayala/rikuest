.PHONY: build dev clean frontend backend

# Build everything
build: frontend backend

# Build frontend
frontend:
	cd frontend && npm install && npm run build

# Build backend
backend:
	go build -o bin/rikuest ./cmd/server

# Development mode
dev:
	gow run ./cmd/server/main.go

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf frontend/dist/
	rm -f rikuest.db

# Install dependencies
deps:
	go mod download
	cd frontend && npm install

# Run the built binary
run:
	./bin/rikuest