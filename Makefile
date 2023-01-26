EXTERNAL_PORT := 8080
GPROJECT_ID := chronopin-209507
GRELEASE := latest

grun:
	docker run --rm -p $(EXTERNAL_PORT):9000 us-west1-docker.pkg.dev/$(GPROJECT_ID)/chronopin-web/chronopin:$(GRELEASE)