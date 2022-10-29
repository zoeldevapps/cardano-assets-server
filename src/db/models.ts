import {
  Sequelize,
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { options } from "../config";

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: options.db,
  logging: false,
});

/**
 * Block is used to track the synchronization status.
 */
export class Block extends Model<InferAttributes<Block>, InferCreationAttributes<Block>> {
  declare id: CreationOptional<number>;
  declare hash: string;
  declare slot: bigint;
}

Block.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    hash: DataTypes.STRING,
    slot: DataTypes.BIGINT,
  },
  {
    sequelize,
    indexes: [
      {
        fields: ["slot", "hash"],
        unique: true,
      },
    ],
  }
);

export class Asset extends Model<InferAttributes<Asset>, InferCreationAttributes<Asset>> {
  declare id: CreationOptional<number>;
  declare subject: string;
  declare policyId: string;
  declare assetName: string;
}

Asset.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    subject: DataTypes.STRING,
    policyId: DataTypes.STRING,
    assetName: DataTypes.STRING,
  },
  {
    sequelize,
    indexes: [
      {
        fields: ["policyId", "assetName"],
        unique: true,
      },
      {
        fields: ["subject"],
        unique: true,
      },
    ],
  }
);

export class Forge extends Model<InferAttributes<Forge>, InferCreationAttributes<Forge>> {
  declare quantity: bigint;
}

Forge.init(
  {
    quantity: DataTypes.BIGINT,
  },
  { sequelize }
);

Forge.belongsTo(Asset, { onDelete: "CASCADE", onUpdate: "CASCADE" });
Asset.hasMany(Forge);

Forge.belongsTo(Block, { onDelete: "CASCADE", onUpdate: "CASCADE" });
Block.hasMany(Forge);

export class OffchainMetadata extends Model<
  InferAttributes<OffchainMetadata>,
  InferCreationAttributes<OffchainMetadata>
> {
  declare subject: string;
  declare hash: string; // hash of the file to detect changes
  declare name: string;
  declare description: string;
  declare policy?: string;
  declare ticker?: string;
  declare url?: string;
  declare logo?: string;
  declare decimals?: number;
}

// only store the last version
OffchainMetadata.init(
  {
    subject: {
      type: DataTypes.STRING,
      unique: true,
    },
    hash: DataTypes.STRING, // hash of the file to detect changes
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    policy: DataTypes.STRING,
    ticker: DataTypes.STRING,
    url: DataTypes.STRING(1024),
    logo: DataTypes.TEXT,
    decimals: DataTypes.TINYINT,
  },
  {
    sequelize,
  }
);

export const OffchainMetadataAsset = OffchainMetadata.belongsTo(Asset, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
export const AssetOffchainMetadata = Asset.hasOne(OffchainMetadata);

export class CIP25Metadata extends Model<
  InferAttributes<CIP25Metadata>,
  InferCreationAttributes<CIP25Metadata>
> {
  declare subject: string;
  declare name: string;
  declare image: string;
  declare description?: string;
  declare mediaType?: string;
  declare otherProperties?: string;
}

// only store the last version, since the token needs to be minted in the same tx
CIP25Metadata.init(
  {
    subject: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING, // hash of the file to detect changes
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING(4096),
      allowNull: false,
    },
    description: DataTypes.STRING,
    mediaType: DataTypes.STRING,
    otherProperties: DataTypes.TEXT,
  },
  {
    sequelize,
  }
);

export const CIP25MetadataAsset = CIP25Metadata.belongsTo(Asset, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
export const AssetCIP25Metadata = Asset.hasOne(CIP25Metadata);

export const CIP25MetadataBlock = CIP25Metadata.belongsTo(Block, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Block.hasOne(CIP25Metadata);

/**
 * CIP 68 is annoying as there is no way to differentiate between different
 * metadata
 */
export class CIP68Metadata extends Model<
  InferAttributes<CIP68Metadata>,
  InferCreationAttributes<CIP68Metadata>
> {
  declare subject: string;
  declare name: string;
  declare description?: string;
  declare otherProperties?: string;
}

// store the whole history of a token
CIP68Metadata.init(
  {
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING, // hash of the file to detect changes
      allowNull: false,
    },
    description: DataTypes.STRING,
    otherProperties: DataTypes.TEXT, // jsonb
  },
  {
    sequelize,
    //indexes: [{ fields: ["subject", "BlockId"], unique: true }],
  }
);

export const CIP68MetadataAsset = CIP68Metadata.belongsTo(Asset, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
export const AssetCIP68Metadata = Asset.hasOne(CIP68Metadata);

export const CIP68MetadataBlock = CIP68Metadata.belongsTo(Block, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Block.hasOne(CIP68Metadata);
