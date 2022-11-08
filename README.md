# Cardano assets server

Cardano has several different sources for metadata:

- [off-chain registry](https://github.com/cardano-foundation/cardano-token-registry)
- [NFT metadata](https://cips.cardano.org/cips/cip25/)
- [royalty tokens for NFTs](https://cips.cardano.org/cips/cip27/)
- Drafts [on-chain token metadata](https://cips.cardano.org/cips/cip68/) in the future with [special encoding](https://github.com/cardano-foundation/CIPs/pull/298)

## API

The server exposes a graphql API. The schema is available [here](src/graphql/schema.ts).

## Setup

### DB and Migrations

The app is using postgres as a database server. For migrations it uses `@slonik/migrator`
internally (which uses `umzug` in the background). To run migrations in production run:

```sh
node migrate up
```

before anything else.

### Offchain metadata

Offchain metadata are fetched from directly from github and is periodically checked
for any addition entries. Github has very strict rate limiting on their API.
It's recommended to first use the `scripts/loadOffchain.ts` script to fill the DB with
assets by cloning the offchain repository.

## Existing solutions

There are currently aggregator solutions that allow fetching metadata:

- blockfrost - require a separate subscription with no self-host options
- koios - built on top of db-sync and postgrest
- offchain-metadata-sever - which only handles the off-chain part

The aim of this project was to provide a relatively lighter-weight solution,
only focusing on tokens on Cardano.
