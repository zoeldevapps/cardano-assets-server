import { Op } from "sequelize";
import { Asset } from "./models";

export async function createOrFindAssets(assets: { subject: string; policyId: string; assetName: string }[]) {
  await Asset.bulkCreate(
    assets.map(({ subject, policyId, assetName }) => ({
      subject,
      policyId,
      assetName,
    })),
    {
      ignoreDuplicates: true,
    }
  );

  const assetMapping = Object.fromEntries(
    (
      await Asset.findAll({
        where: {
          subject: {
            [Op.in]: assets.map(({ subject }) => subject),
          },
        },
      })
    ).map((asset) => [asset.subject, asset.id])
  );

  return assetMapping;
}
