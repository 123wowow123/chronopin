EXTERNAL_PORT := 8080
GPROJECT_ID := chronopin-209507
GRELEASE := latest

pr:
	docker pull us-west1-docker.pkg.dev/chronopin-209507/chronopin-web/chronopin:latest
	docker run --rm -p $(EXTERNAL_PORT):9000 us-west1-docker.pkg.dev/$(GPROJECT_ID)/chronopin-web/chronopin:$(GRELEASE) --env ENV_VARS="$(cat ./Docker/env.dev.list)"

gpull:
	docker pull us-west1-docker.pkg.dev/chronopin-209507/chronopin-web/chronopin:latest

grun:
	docker run --rm -p $(EXTERNAL_PORT):9000 us-west1-docker.pkg.dev/$(GPROJECT_ID)/chronopin-web/chronopin:$(GRELEASE) --env ENV_VARS="$(cat ./Docker/env.dev.list)"

grefresh:
	gcloud builds submit --region=us-west2 --config cloudbuild.yaml

gupdate:
	kubectl set image deployment/chronopin chronopin=us-west1-docker.pkg.dev/chronopin-209507/chronopin-web/chronopin:latest