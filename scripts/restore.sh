#!/bin/bash
source .env

# Assumes that the docker compose was used to spin up
# run as scripts/restore.sh dump_2022-11-21_16_28_16.sql.gz

gunzip < $1 | docker exec -i assets-db psql -U $DB_USER -d $DB_DATABASE