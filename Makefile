install:
	@pnpm install

dev:
	@docker compose down
	@docker compose -f dev.compose.yml pull
	@docker compose -f dev.compose.yml up -d --wait
	@pnpm run migrate
	@pnpm run dev

prod:
	@docker compose -f dev.compose.yml down
	@docker compose pull
	@docker compose up -d --build --wait

migrate:
	@pnpm run migrate

migrate-down:
	@pnpm run migrate:down

migrate-create:
	@pnpm run migrate:create

migrate-list:
	@pnpm run migrate:list

seed-run:
	@pnpm run seed:run

seed-create:
	@pnpm run seed:make

sql:
	@pnpm run sql

test:
	@pnpm run test:db

reset:
	@echo "Suppression de toutes les tables..."
	@pnpm exec kysely sql "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "Exécution des migrations..."
	@pnpm run migrate
	@echo "Réinitialisation de la base de données terminée !"

fresh:
	@echo "Suppression de toutes les tables et réinsertion des seeds..."
	@pnpm exec kysely sql "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "Exécution des migrations..."
	@pnpm run migrate
	@echo "Exécution des seeds..."
	@pnpm run seed:run
	@echo "Base de données fraîche prête !"

status:
	@echo "Statut de connexion à la base de données :"
	@pnpm run test:db
