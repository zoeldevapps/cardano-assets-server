#!/bin/bash
source .env

# Assumes that the docker compose was used to spin up

# docker exec -t assets-db pg_dump -c -U $DB_USER $DB_DATABASE > dump_$(date +%Y-%m-%d_%H_%M_%S).sql
docker exec -t assets-db pg_dump -c -U $DB_USER $DB_DATABASE | gzip > dump_$(date +%Y-%m-%d_%H_%M_%S).sql.gz