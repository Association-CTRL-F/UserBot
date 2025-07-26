install:
	@pnpm install

dev:
	@docker compose -f dev.compose.yml up -d --wait
	@pnpm run migrate
	@pnpm run dev

db-migrate:
	@pnpm run migrate

db-test:
	@pnpm run test:db

db-reset:
	@echo "Dropping all tables..."
	@psql $(DATABASE_URL) -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "Running migrations..."
	@pnpm run migrate
	@echo "Database reset complete!"

db-seed:
	@echo "Seeding database..."
	@ts-node --project tsconfig.json -r tsconfig-paths/register src/database/seed.ts

db-status:
	@echo "Database connection status:"
	@pnpm run test:db
