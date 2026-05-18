export interface SparePart {
  readonly id: number
  readonly name: string
  readonly partNumber: string
  readonly description: string | null
  readonly quantity: number
  readonly minimumStock: number
  readonly unitCost: number | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorkOrderPart {
  readonly id: number
  readonly workOrderId: number
  readonly sparePartId: number
  readonly sparePart: { readonly id: number; readonly name: string; readonly partNumber: string }
  readonly quantityUsed: number
  readonly createdAt: string
}

export interface GetSparePartsData {
  readonly spareParts: readonly SparePart[]
}

export interface GetSparePartData {
  readonly sparePart: SparePart
}

export interface GetWorkOrderPartsData {
  readonly workOrderParts: readonly WorkOrderPart[]
}

export interface CreateSparePartData {
  readonly createSparePart: SparePart
}

export interface UpdateSparePartData {
  readonly updateSparePart: SparePart
}

export interface DeleteSparePartData {
  readonly deleteSparePart: SparePart
}

export interface AddWorkOrderPartData {
  readonly addWorkOrderPart: WorkOrderPart
}
