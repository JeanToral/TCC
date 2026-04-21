export interface RoleBasic {
  readonly id: number
  readonly name: string
}

export interface RoleFull {
  readonly id: number
  readonly name: string
  readonly description: string | null
  readonly permissions: readonly string[]
  readonly isSystem: boolean
}

export interface UserListItem {
  readonly id: number
  readonly name: string
  readonly email: string
  readonly isActive: boolean
  readonly roleId: number
  readonly role: RoleBasic
  readonly createdAt: string
}

export interface UserDetail {
  readonly id: number
  readonly name: string
  readonly email: string
  readonly isActive: boolean
  readonly roleId: number
  readonly role: RoleFull
  readonly createdAt: string
  readonly updatedAt: string
  readonly deletedAt: string | null
}

export interface GetUsersData {
  readonly users: readonly UserListItem[]
}

export interface GetUserData {
  readonly user: UserDetail
}

export interface GetRolesData {
  readonly roles: readonly RoleFull[]
}

export interface CreateUserData {
  readonly createUser: UserListItem
}

export interface UpdateUserData {
  readonly updateUser: UserListItem
}

export interface RemoveUserData {
  readonly removeUser: { readonly id: string }
}
