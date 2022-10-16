# Cardano assets server

Cardano has several different sources for metadata:

- off-chain registry
- NFT metadata
- royalty tokens for NFTs
- ? on-chain token metadata in the future

## Setup

### Offchain metadata

Offchain metadata are fetched from directly from github and is periodically checked
for any addition entries. Github has very strict rate limiting on their API.
It's recommended to first use the `scripts/loadOffchain.ts` script to fill the DB with
assets by cloning the repository.

## Existing solutions

There are currently aggregator solutions that allow fetching metadata:

- blockfrost - require a separate subscription with no self-host options
- koios - built on top of db-sync and postgrest
- offchain-metadata-sever - which only handles the off-chain part

The aim of this project was to provide a relatively lighter-weight solution,
only focusing on tokens on Cardano.
