export interface Asset {
  readonly id: number
  readonly name: string
  readonly tag: string
  readonly location: string | null
  readonly manufacturer: string | null
  readonly model: string | null
  readonly serialNumber: string | null
  readonly installDate: string | null
  readonly createdAt: string
}

export interface AssetDetail extends Asset {
  readonly updatedAt: string
  readonly deletedAt: string | null
}

export interface GetAssetsData {
  readonly assets: readonly Asset[]
}

export interface GetAssetData {
  readonly asset: AssetDetail
}

export interface CreateAssetData {
  readonly createAsset: AssetDetail
}

export interface UpdateAssetData {
  readonly updateAsset: AssetDetail
}

export interface DeleteAssetData {
  readonly deleteAsset: AssetDetail
}
