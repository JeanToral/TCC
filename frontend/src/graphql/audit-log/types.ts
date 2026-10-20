export interface AuditLogItem {
  readonly id: number
  readonly action: string
  readonly targetType: string
  readonly targetId: number
  /** JSON serializado; null quando a ação não guarda estado. */
  readonly before: string | null
  readonly after: string | null
  readonly createdAt: string
  readonly user: {
    readonly id: number
    readonly name: string
    readonly email: string
  } | null
}

export interface GetAuditLogsData {
  readonly auditLogs: {
    readonly edges: readonly { readonly cursor: string; readonly node: AuditLogItem }[]
    readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor: string | null }
  }
}
