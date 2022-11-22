CREATE TABLE block (
  slot BIGINT NOT NULL PRIMARY KEY,
  hash BYTEA NOT NULL,
  -- constraints
  UNIQUE(slot, hash)
);

CREATE TABLE raw_asset (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject BYTEA NOT NULL,
  last_interacted BIGINT NOT NULL
);

CREATE UNIQUE INDEX idx_asset_subject ON raw_asset (subject);

-- due to the upserts
ALTER TABLE raw_asset
SET (fillfactor = 90);

CREATE VIEW asset AS
SELECT id,
  subject AS raw_subject,
  ENCODE(subject, 'hex') AS subject,
  ENCODE(
    substring(
      subject
      from 1 for 28
    ),
    'hex'
  ) AS policy_id,
  ENCODE(
    substring(
      subject
      from 29 for 32
    ),
    'hex'
  ) AS asset_name
FROM raw_asset;

CREATE TABLE forge (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- block_id, asset_id are not necesasrily unique
  asset_id INT NOT NULL,
  block_id BIGINT NOT NULL,
  tx_index INT NOT NULL,
  supply BIGINT NOT NULL,
  qty BIGINT NOT NULL,
  -- constraints
  CONSTRAINT fk_forge_block FOREIGN KEY (block_id) REFERENCES block(slot) ON DELETE CASCADE,
  CONSTRAINT fk_forge_asset FOREIGN KEY (asset_id) REFERENCES raw_asset(id) ON DELETE CASCADE
);

CREATE INDEX idx_forge_asset_id ON forge (asset_id, block_id);
CREATE INDEX idx_forge_block_id on forge (block_id);

CREATE TABLE offchain (
  asset_id INT NOT NULL PRIMARY KEY,
  hash VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  policy BYTEA,
  logo TEXT,
  ticker VARCHAR(16),
  url VARCHAR(1024),
  decimals SMALLINT,
  -- constraints
  CONSTRAINT fk_offchain_asset FOREIGN KEY (asset_id) REFERENCES raw_asset(id) ON DELETE CASCADE
);

CREATE TABLE cip25_metadata (
  -- there might be multiple metadata in the same block (although there shouldn't)
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id INT NOT NULL,
  block_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  image TEXT NOT NULL,
  description TEXT,
  media_type VARCHAR(255),
  properties JSONB,
  -- constraints
  CONSTRAINT fk_cip25_block FOREIGN KEY (block_id) REFERENCES block(slot) ON DELETE CASCADE,
  CONSTRAINT fk_cip25_asset FOREIGN KEY (asset_id) REFERENCES raw_asset(id) ON DELETE CASCADE
);

CREATE INDEX idx_cip25_asset_id ON cip25_metadata USING HASH (asset_id);
CREATE INDEX idx_cip25_block_id ON cip25_metadata (block_id);

CREATE TABLE cip27_royalty (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  block_id BIGINT NOT NULL,
  policy_id BYTEA NOT NULL,
  rate VARCHAR(32) NOT NULL,
  addr VARCHAR(255) NOT NULL,
  -- constraints
  CONSTRAINT fk_cip27_block FOREIGN KEY (block_id) REFERENCES block(slot) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_cip27_policy_id ON cip27_royalty (policy_id);
CREATE INDEX idx_cip27_block_id ON cip27_royalty (block_id);

CREATE TABLE cip68_metadata (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id INT NOT NULL,
  block_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  properties JSONB,
  -- constraints
  CONSTRAINT fk_cip_block FOREIGN KEY (block_id) REFERENCES block(slot) ON DELETE CASCADE,
  CONSTRAINT fk_cip68_asset FOREIGN KEY (asset_id) REFERENCES raw_asset(id) ON DELETE CASCADE
);

CREATE INDEX idx_cip68_asset_id ON cip68_metadata USING HASH (asset_id);
CREATE INDEX idx_cip68_block_id ON cip68_metadata (block_id);