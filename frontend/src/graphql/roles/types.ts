export interface RoleItem {
  readonly id: number
  readonly name: string
  readonly description: string | null
  readonly permissions: readonly string[]
  readonly isSystem: boolean
}

export interface GetRolesData {
  readonly roles: readonly RoleItem[]
}

export interface GetRoleData {
  readonly role: RoleItem
}

export interface CreateRoleData {
  readonly createRole: RoleItem
}

export interface UpdateRoleData {
  readonly updateRole: RoleItem
}

export interface DeleteRoleData {
  readonly deleteRole: RoleItem
}
