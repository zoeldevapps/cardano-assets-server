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

export class Mint extends Model<InferAttributes<Mint>, InferCreationAttributes<Mint>> {
  declare block: bigint;
  declare quantity: bigint;
}

Mint.init(
  {
    block: DataTypes.BIGINT,
    quantity: DataTypes.BIGINT,
  },
  { sequelize }
);

Mint.belongsTo(Asset, { onDelete: "CASCADE", onUpdate: "CASCADE" });
Asset.hasMany(Mint);

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

// only store the last version
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

export const CIP25MetadataBlock = CIP25Metadata.belongsTo(Asset, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Block.hasOne(CIP25Metadata);
