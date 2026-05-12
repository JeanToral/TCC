export interface Asset {
  readonly id: number
  readonly name: string
  readonly tag: string
  readonly location: string | null
}

export interface GetAssetsData {
  readonly assets: readonly Asset[]
}
