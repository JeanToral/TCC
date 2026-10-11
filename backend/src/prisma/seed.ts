import { hash } from 'bcryptjs'
import { PrismaClient, WorkOrderType, WorkOrderStatus, Priority } from '../generated/prisma'

const prisma = new PrismaClient()

// ── Helpers ────────────────────────────────────────────────

function hoursBefore(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 3_600_000)
}

/**
 * O roteiro foi escrito de jan a set/2025. Na hora de rodar, tudo é deslocado
 * em meses inteiros para que set/2025 caia no mês atual: o período padrão do
 * Dashboard e dos Relatórios (últimos 6 meses) abre com corretivas (abril do
 * roteiro), preventivas e OS em aberto.
 */
const SCRIPT_LAST_MONTH = 2025 * 12 + 8 // set/2025, mês base 0
const today = new Date()
const MONTH_SHIFT = today.getUTCFullYear() * 12 + today.getUTCMonth() - SCRIPT_LAST_MONTH

function dt(iso: string): Date {
  const date = new Date(iso)
  // Dia 29–31 transbordaria para o mês seguinte ao somar meses.
  if (date.getUTCDate() > 28) throw new Error(`Data do seed com dia > 28: ${iso}`)
  date.setUTCMonth(date.getUTCMonth() + MONTH_SHIFT)
  return date
}

/** OS já iniciada não pode ter início no futuro (seed rodado antes do dia do roteiro). */
function notAfterNow(date: Date): Date {
  return date.getTime() > today.getTime() ? hoursBefore(today, 2) : date
}

async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 10)
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...')

  // ── Roles ────────────────────────────────────────────────

  const sysadminRole = await prisma.role.upsert({
    where: { name: 'Sysadmin' },
    update: {},
    create: {
      name: 'Sysadmin',
      description: 'Acesso total ao sistema',
      permissions: ['*'],
      isSystem: true,
    },
  })

  const managerPermissions = [
    'asset.create', 'asset.read', 'asset.update', 'asset.delete',
    'workorder.create', 'workorder.read', 'workorder.update', 'workorder.delete',
    'workorder.approve',
    'sparepart.read', 'sparepart.update',
    'preventiveplan.create', 'preventiveplan.read', 'preventiveplan.update', 'preventiveplan.delete',
    'user.read',
    'dashboard.read',
    'auditlog.read',
    'cost.read', 'cost.manage',
  ]

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: { permissions: managerPermissions },
    create: {
      name: 'Manager',
      description: 'Gerente de manutenção',
      permissions: managerPermissions,
      isSystem: true,
    },
  })

  const engineerPermissions = [
    'asset.read', 'asset.update',
    'workorder.create', 'workorder.read', 'workorder.update', 'workorder.delete',
    'sparepart.read', 'sparepart.update',
    'preventiveplan.create', 'preventiveplan.read', 'preventiveplan.update', 'preventiveplan.delete',
    'dashboard.read',
    'cost.read',
  ]

  const engineerRole = await prisma.role.upsert({
    where: { name: 'Engineer' },
    update: { permissions: engineerPermissions },
    create: {
      name: 'Engineer',
      description: 'Engenheiro de manutenção',
      permissions: engineerPermissions,
      isSystem: true,
    },
  })

  const techPermissions = [
    'asset.read',
    'workorder.read', 'workorder.update',
    'sparepart.read',
    'preventiveplan.read',
  ]

  const techRole = await prisma.role.upsert({
    where: { name: 'Technician' },
    update: { permissions: techPermissions },
    create: {
      name: 'Technician',
      description: 'Técnico de manutenção',
      permissions: techPermissions,
      isSystem: true,
    },
  })

  console.log('  ✓ Roles')

  // ── Users ─────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cmms.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@cmms.com',
      passwordHash: await hashPassword('123123'),
      roleId: sysadminRole.id,
    },
  })

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@cmms.com' },
    update: { hourlyRate: 110 },
    create: {
      name: 'Carlos Gestão',
      email: 'manager@cmms.com',
      passwordHash: await hashPassword('manager123'),
      roleId: managerRole.id,
      hourlyRate: 110,
    },
  })

  await prisma.user.upsert({
    where: { email: 'engineer@cmms.com' },
    update: { hourlyRate: 80 },
    create: {
      name: 'Ana Engenharia',
      email: 'engineer@cmms.com',
      passwordHash: await hashPassword('engineer123'),
      roleId: engineerRole.id,
      hourlyRate: 80,
    },
  })

  // Sysadmin fica sem hourlyRate de propósito: não executa manutenção.
  const techUser = await prisma.user.upsert({
    where: { email: 'tech@cmms.com' },
    update: { hourlyRate: 45 },
    create: {
      name: 'João Técnico',
      email: 'tech@cmms.com',
      passwordHash: await hashPassword('tech123'),
      roleId: techRole.id,
      hourlyRate: 45,
    },
  })

  console.log('  ✓ Users')

  // ── Assets ────────────────────────────────────────────────

  const torno = await prisma.asset.upsert({
    where: { tag: 'TRN-001' },
    update: {},
    create: {
      name: 'Torno CNC #1',
      tag: 'TRN-001',
      location: 'Galpão A — Setor 1',
      manufacturer: 'Romi',
      model: 'GL 240',
      serialNumber: 'SN-2020-00101',
      installDate: dt('2020-03-15T00:00:00Z'),
    },
  })

  const fresadora = await prisma.asset.upsert({
    where: { tag: 'FRS-002' },
    update: {},
    create: {
      name: 'Fresadora #2',
      tag: 'FRS-002',
      location: 'Galpão A — Setor 2',
      manufacturer: 'Hermle',
      model: 'C 250',
      serialNumber: 'SN-2019-00205',
      installDate: dt('2019-07-20T00:00:00Z'),
    },
  })

  const compressor = await prisma.asset.upsert({
    where: { tag: 'CMP-001' },
    update: {},
    create: {
      name: 'Compressor Industrial',
      tag: 'CMP-001',
      location: 'Sala de Utilidades',
      manufacturer: 'Atlas Copco',
      model: 'GA 22',
      serialNumber: 'SN-2021-00310',
      installDate: dt('2021-01-10T00:00:00Z'),
    },
  })

  console.log('  ✓ Assets')

  // ── Spare parts ──────────────────────────────────────────
  //
  // RET-4062 nasce SEM unitCost de propósito: é o caminho de "cobertura de
  // custo incompleta" do módulo financeiro. Também já nasce abaixo do mínimo,
  // para exercitar a notificação LOW_STOCK.

  type SparePartSeed = {
    name: string
    partNumber: string
    description: string
    quantity: number
    minimumStock: number
    unitCost: number | null
  }

  const sparePartSeeds: SparePartSeed[] = [
    { name: 'Rolamento 6205 2RS',           partNumber: 'ROL-6205',  description: 'Rolamento rígido de esferas, vedado',       quantity: 12, minimumStock: 4, unitCost: 135.5 },
    { name: 'Correia em V A-52',            partNumber: 'COR-A52',   description: 'Correia de transmissão, perfil A',          quantity: 8,  minimumStock: 3, unitCost: 89.9 },
    { name: 'Filtro de ar G4',              partNumber: 'FLT-AR01',  description: 'Elemento filtrante do compressor',          quantity: 20, minimumStock: 6, unitCost: 45 },
    { name: 'Válvula de admissão',          partNumber: 'VLV-ADM1',  description: 'Válvula do cabeçote, 1º estágio',           quantity: 5,  minimumStock: 2, unitCost: 320 },
    { name: 'Óleo lubrificante ISO VG 68',  partNumber: 'OLE-VG68',  description: 'Galão de 20 L',                             quantity: 15, minimumStock: 5, unitCost: 210.75 },
    { name: 'Retentor 40x62x10',            partNumber: 'RET-4062',  description: 'Retentor de eixo — sem custo cadastrado',   quantity: 2,  minimumStock: 6, unitCost: null },
  ]

  const partsByNumber = new Map<string, { id: number; unitCost: number | null }>()

  for (const seed of sparePartSeeds) {
    const part = await prisma.sparePart.upsert({
      where: { partNumber: seed.partNumber },
      update: {
        unitCost: seed.unitCost,
        quantity: seed.quantity,
        minimumStock: seed.minimumStock,
      },
      create: seed,
    })
    partsByNumber.set(part.partNumber, { id: part.id, unitCost: part.unitCost })
  }

  console.log('  ✓ Spare parts')

  // ── Completed corrective work orders ─────────────────────
  //
  // Torno CNC #1 — 4 ordens:
  //   MTTR esperado : (4h + 4.5h + 4h + 4.5h) / 4 = 4.25h
  //   MTBF esperado : avg(885.5h, 785.5h, 867h) ≈ 846h (~35.2d)
  //
  // Fresadora #2 — 3 ordens:
  //   MTTR esperado : (2h + 4h + 4h) / 3 ≈ 3.33h
  //   MTBF esperado : avg(932h, 962h) = 947h (~39.5d)
  //
  // Compressor — 2 ordens:
  //   MTTR esperado : (4h + 7h) / 2 = 5.5h
  //   MTBF esperado : 1414h (~58.9d) — intervalo único

  type PartUse = { partNumber: string; quantityUsed: number }

  type ExternalUse = {
    description: string
    supplier?: string
    amount: number
    /** Competência — pode cair em mês diferente do fechamento da OS. */
    incurredAt: Date
  }

  type WOSeed = {
    type?: WorkOrderType
    title: string
    description: string
    priority: Priority
    assetId: number
    requestedById: number
    assignedToId: number
    scheduledStart: Date
    scheduledEnd: Date
    startedAt: Date
    completedAt: Date
    /** Abertura da OS. Padrão: 1h antes do início — dentro de qualquer SLA. */
    openedAt?: Date
    closingNotes: string
    /** Horas efetivamente trabalhadas — não o tempo de parada. */
    laborHours?: number
    parts?: PartUse[]
    externals?: ExternalUse[]
  }

  const workOrderSeeds: WOSeed[] = [
    // ── Torno CNC #1 ──────────────────────────────────────
    {
      title: 'Substituição de rolamento do eixo principal',
      description: 'Rolamento apresentou ruído excessivo e vibração anormal no eixo principal.',
      priority: Priority.HIGH,
      assetId: torno.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-01-10T07:00:00Z'),
      scheduledEnd:   dt('2025-01-10T12:00:00Z'),
      startedAt:      dt('2025-01-10T08:00:00Z'),
      completedAt:    dt('2025-01-10T12:00:00Z'), // 4h
      closingNotes: 'Rolamento SKF 6205 substituído. Teste de vibração realizado com sucesso.',
      laborHours: 3.5,
      parts: [{ partNumber: 'ROL-6205', quantityUsed: 2 }],
    },
    {
      title: 'Reparo no sistema de lubrificação',
      description: 'Vazamento de óleo detectado no sistema de lubrificação automática.',
      priority: Priority.MEDIUM,
      assetId: torno.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-02-15T08:30:00Z'),
      scheduledEnd:   dt('2025-02-15T14:00:00Z'),
      startedAt:      dt('2025-02-15T09:00:00Z'),
      completedAt:    dt('2025-02-15T13:30:00Z'), // 4.5h
      closingNotes: 'Vedação trocada e nível de óleo reabastecido. Sistema testado sem vazamentos.',
      laborHours: 4,
      parts: [
        { partNumber: 'OLE-VG68', quantityUsed: 1 },
        { partNumber: 'RET-4062', quantityUsed: 2 },
      ],
    },
    {
      title: 'Ajuste de folga no carro porta-ferramenta',
      description: 'Folga excessiva no carro causando imprecisão dimensional nas peças.',
      priority: Priority.HIGH,
      assetId: torno.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-03-20T06:30:00Z'),
      scheduledEnd:   dt('2025-03-20T12:00:00Z'),
      startedAt:      dt('2025-03-20T07:00:00Z'),
      completedAt:    dt('2025-03-20T11:00:00Z'), // 4h
      closingNotes: 'Folgas ajustadas conforme especificação. Peça de teste usinada e aprovada no controle dimensional.',
      laborHours: 2.5,
    },
    {
      title: 'Troca de correia dentada do eixo X',
      description: 'Correia com desgaste avançado, risco de ruptura iminente.',
      priority: Priority.CRITICAL,
      assetId: torno.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-04-25T13:30:00Z'),
      scheduledEnd:   dt('2025-04-25T19:00:00Z'),
      startedAt:      dt('2025-04-25T14:00:00Z'),
      completedAt:    dt('2025-04-25T18:30:00Z'), // 4.5h
      openedAt:       dt('2025-04-25T08:00:00Z'), // 6h até o início: fora do SLA de 2h
      closingNotes: 'Correia Gates PowerGrip GT3 instalada. Tensão ajustada conforme tabela do fabricante.',
      laborHours: 3,
      parts: [{ partNumber: 'COR-A52', quantityUsed: 1 }],
    },

    // ── Fresadora #2 ──────────────────────────────────────
    {
      title: 'Substituição de bomba de refrigerante',
      description: 'Bomba de refrigerante com falha de motor, refrigeração comprometida.',
      priority: Priority.HIGH,
      assetId: fresadora.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-01-20T09:30:00Z'),
      scheduledEnd:   dt('2025-01-20T13:00:00Z'),
      startedAt:      dt('2025-01-20T10:00:00Z'),
      completedAt:    dt('2025-01-20T12:00:00Z'), // 2h
      closingNotes: 'Bomba substituída por modelo equivalente. Fluxo de refrigerante verificado e dentro do padrão.',
      laborHours: 6,
      externals: [
        { description: 'Recondicionamento da bomba de refrigerante', supplier: 'Retificadora Oeste', amount: 1850, incurredAt: dt('2025-03-05T00:00:00Z') },
        { description: 'Frete da bomba', supplier: 'Transportes Oeste', amount: 240, incurredAt: dt('2025-03-05T00:00:00Z') },
      ],
    },
    {
      title: 'Reparo no painel elétrico — fusível queimado',
      description: 'Fusível F3 do painel de controle danificado após pico de tensão.',
      priority: Priority.MEDIUM,
      assetId: fresadora.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-02-28T07:30:00Z'),
      scheduledEnd:   dt('2025-02-28T13:00:00Z'),
      startedAt:      dt('2025-02-28T08:00:00Z'),
      completedAt:    dt('2025-02-28T12:00:00Z'), // 4h
      closingNotes: 'Fusível 16A substituído. Causa: surto de tensão. Instalado DPS no circuito.',
      laborHours: 1,
    },
    {
      title: 'Troca de guias lineares do eixo Y',
      description: 'Guias lineares com desgaste causando play axial fora do tolerado.',
      priority: Priority.HIGH,
      assetId: fresadora.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-04-10T13:00:00Z'),
      scheduledEnd:   dt('2025-04-10T19:00:00Z'),
      startedAt:      dt('2025-04-10T14:00:00Z'),
      completedAt:    dt('2025-04-10T18:00:00Z'), // 4h
      openedAt:       dt('2025-04-09T10:00:00Z'), // 28h até o início: fora do SLA de 8h
      closingNotes: 'Guias INA KWVE 25 substituídas. Nivelamento e alinhamento conferidos com relógio comparador.',
      laborHours: 5,
      parts: [{ partNumber: 'OLE-VG68', quantityUsed: 2 }],
      externals: [
        { description: 'Locação de talha elétrica', supplier: 'Locadora Industrial', amount: 680, incurredAt: dt('2025-06-02T00:00:00Z') },
      ],
    },

    // ── Compressor Industrial ─────────────────────────────
    {
      title: 'Troca de filtro de ar e válvula de segurança',
      description: 'Filtro saturado e válvula de segurança com atuação prematura.',
      priority: Priority.MEDIUM,
      assetId: compressor.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-02-01T05:30:00Z'),
      scheduledEnd:   dt('2025-02-01T11:00:00Z'),
      startedAt:      dt('2025-02-01T06:00:00Z'),
      completedAt:    dt('2025-02-01T10:00:00Z'), // 4h
      closingNotes: 'Filtro de ar e válvula de segurança substituídos. Pressão de abertura verificada em 8,5 bar.',
      laborHours: 2,
      parts: [{ partNumber: 'FLT-AR01', quantityUsed: 1 }],
    },
    {
      title: 'Reparo no cabeçote — válvulas de admissão e descarga',
      description: 'Queda de pressão no tanque apontou desgaste nas válvulas do cabeçote.',
      priority: Priority.CRITICAL,
      assetId: compressor.id,
      requestedById: adminUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-04-01T07:30:00Z'),
      scheduledEnd:   dt('2025-04-01T16:00:00Z'),
      startedAt:      dt('2025-04-01T08:00:00Z'),
      completedAt:    dt('2025-04-01T15:00:00Z'), // 7h
      closingNotes: 'Válvulas de admissão e descarga do 1º e 2º estágio substituídas. Teste de estanqueidade aprovado.',
      laborHours: 6.5,
      parts: [{ partNumber: 'VLV-ADM1', quantityUsed: 4 }],
      externals: [
        { description: 'Assistência técnica especializada', supplier: 'Atlas Copco Serviços', amount: 3400, incurredAt: dt('2025-05-12T00:00:00Z') },
      ],
    },
    // ── Preventivas ───────────────────────────────────────
    // Dão contraste para a quebra corretiva vs preventiva do financeiro.
    {
      title: 'Preventiva mensal — lubrificação e inspeção geral',
      description: 'Rotina mensal: lubrificação das guias, inspeção de folgas e aperto de conexões.',
      type: WorkOrderType.PREVENTIVE,
      priority: Priority.LOW,
      assetId: torno.id,
      requestedById: managerUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-07-07T08:00:00Z'),
      scheduledEnd:   dt('2025-07-07T12:00:00Z'),
      startedAt:      dt('2025-07-07T08:00:00Z'),
      completedAt:    dt('2025-07-07T11:00:00Z'),
      closingNotes: 'Rotina executada conforme plano. Nenhuma anomalia encontrada.',
      laborHours: 3,
      parts: [{ partNumber: 'OLE-VG68', quantityUsed: 1 }],
    },
    {
      title: 'Preventiva trimestral — troca de filtro de ar',
      description: 'Substituição programada do elemento filtrante do compressor.',
      type: WorkOrderType.PREVENTIVE,
      priority: Priority.LOW,
      assetId: compressor.id,
      requestedById: managerUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-07-15T08:00:00Z'),
      scheduledEnd:   dt('2025-07-15T10:00:00Z'),
      startedAt:      dt('2025-07-15T08:00:00Z'),
      completedAt:    dt('2025-07-15T09:30:00Z'),
      closingNotes: 'Filtro substituído e horímetro do compressor registrado.',
      laborHours: 1.5,
      parts: [{ partNumber: 'FLT-AR01', quantityUsed: 2 }],
    },
    {
      title: 'Preventiva semestral — alinhamento e balanceamento',
      description: 'Verificação de alinhamento do eixo e balanceamento do conjunto rotativo.',
      type: WorkOrderType.PREVENTIVE,
      priority: Priority.MEDIUM,
      assetId: fresadora.id,
      requestedById: managerUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-08-04T07:30:00Z'),
      scheduledEnd:   dt('2025-08-04T12:00:00Z'),
      startedAt:      dt('2025-08-04T07:30:00Z'),
      completedAt:    dt('2025-08-04T11:30:00Z'),
      closingNotes: 'Alinhamento corrigido em 0,04 mm. Balanceamento dentro da tolerância.',
      laborHours: 4,
      externals: [
        { description: 'Serviço de balanceamento dinâmico', supplier: 'Balanceadora Sul', amount: 950, incurredAt: dt('2025-08-04T00:00:00Z') },
      ],
    },
  ]

  // ── OS abertas ───────────────────────────────────────────
  // Alimentam o Custo Previsto: precificadas com valores ATUAIS, sem snapshot.

  type OpenWOSeed = {
    title: string
    description: string
    type: WorkOrderType
    priority: Priority
    status: WorkOrderStatus
    assetId: number
    requestedById: number
    assignedToId?: number
    scheduledStart?: Date
    startedAt?: Date
    laborHours?: number
    parts?: PartUse[]
  }

  const openWorkOrderSeeds: OpenWOSeed[] = [
    {
      title: 'Vazamento de óleo na base do cabeçote',
      description: 'Mancha de óleo recorrente sob o cabeçote; suspeita de retentor desgastado.',
      type: WorkOrderType.CORRECTIVE,
      priority: Priority.MEDIUM,
      status: WorkOrderStatus.IN_PROGRESS,
      assetId: torno.id,
      requestedById: techUser.id,
      assignedToId: techUser.id,
      scheduledStart: notAfterNow(dt('2025-09-10T08:00:00Z')),
      startedAt: notAfterNow(dt('2025-09-10T08:30:00Z')),
      laborHours: 2,
      parts: [
        { partNumber: 'RET-4062', quantityUsed: 1 },
        { partNumber: 'OLE-VG68', quantityUsed: 1 },
      ],
    },
    {
      title: 'Ruído intermitente no motor do eixo Z',
      description: 'Operador relata ruído metálico em altas rotações.',
      type: WorkOrderType.CORRECTIVE,
      priority: Priority.HIGH,
      status: WorkOrderStatus.SCHEDULED,
      assetId: fresadora.id,
      requestedById: managerUser.id,
      assignedToId: techUser.id,
      scheduledStart: dt('2025-09-20T07:30:00Z'),
      parts: [{ partNumber: 'ROL-6205', quantityUsed: 2 }],
    },
    {
      title: 'Solicitação de inspeção no sistema de ar comprimido',
      description: 'Queda de pressão percebida na linha durante o turno da tarde.',
      type: WorkOrderType.CORRECTIVE,
      priority: Priority.LOW,
      status: WorkOrderStatus.REQUESTED,
      assetId: compressor.id,
      requestedById: techUser.id,
    },
  ]

  // Taxa horária do técnico que atende todas as OS do seed. Congelada na
  // conclusão, como faz WorkOrdersRepository.completeWithCostSnapshot.
  const TECH_RATE = techUser.hourlyRate

  let created = 0
  let updated = 0
  for (const seed of workOrderSeeds) {
    const existing = await prisma.workOrder.findFirst({
      where: {
        title: seed.title,
        assetId: seed.assetId,
        status: WorkOrderStatus.COMPLETED,
      },
    })

    const { parts = [], externals = [], laborHours, type, openedAt, ...woData } = seed
    const createdAt = openedAt ?? hoursBefore(seed.startedAt, 1)

    // Reproduz o congelamento de custo da conclusão real (ADR 0001).
    const allPartsPriced = parts.every(
      (use) => partsByNumber.get(use.partNumber)?.unitCost != null,
    )
    const laborOk = !laborHours || laborHours <= 0 || TECH_RATE !== null

    const costFields = {
      createdAt,
      laborHours: laborHours ?? null,
      laborRateSnapshot: laborHours ? TECH_RATE : null,
      costIsComplete: allPartsPriced && laborOk,
    }

    // O seed converge: OS criadas por versões anteriores (sem custo) são
    // atualizadas em vez de ignoradas.
    // Datas também convergem: rodar o seed de novo traz o roteiro para o mês atual.
    const dateFields = {
      scheduledStart: woData.scheduledStart,
      scheduledEnd: woData.scheduledEnd,
      startedAt: woData.startedAt,
      completedAt: woData.completedAt,
    }

    const workOrder = existing
      ? await prisma.workOrder.update({
          where: { id: existing.id },
          data: { ...costFields, ...dateFields },
        })
      : await prisma.workOrder.create({
          data: {
            ...woData,
            type: type ?? WorkOrderType.CORRECTIVE,
            status: WorkOrderStatus.COMPLETED,
            ...costFields,
          },
        })

    if (!existing) created++
    else updated++

    for (const use of parts) {
      const part = partsByNumber.get(use.partNumber)
      if (!part) continue
      await prisma.workOrderPart.upsert({
        where: {
          workOrderId_sparePartId: { workOrderId: workOrder.id, sparePartId: part.id },
        },
        update: { quantityUsed: use.quantityUsed, unitCostSnapshot: part.unitCost },
        create: {
          workOrderId: workOrder.id,
          sparePartId: part.id,
          quantityUsed: use.quantityUsed,
          unitCostSnapshot: part.unitCost,
        },
      })
    }

    for (const ext of externals) {
      const alreadyThere = await prisma.workOrderExternalCost.findFirst({
        where: { workOrderId: workOrder.id, description: ext.description },
      })
      if (alreadyThere) {
        await prisma.workOrderExternalCost.update({
          where: { id: alreadyThere.id },
          data: { incurredAt: ext.incurredAt },
        })
        continue
      }

      await prisma.workOrderExternalCost.create({
        data: {
          workOrderId: workOrder.id,
          description: ext.description,
          supplier: ext.supplier,
          amount: ext.amount,
          incurredAt: ext.incurredAt,
          createdById: managerUser.id,
        },
      })
    }
  }

  console.log(`  ✓ Work orders concluídas (${created} criadas, ${updated} atualizadas)`)

  let openCreated = 0
  for (const seed of openWorkOrderSeeds) {
    const existing = await prisma.workOrder.findFirst({
      where: { title: seed.title, assetId: seed.assetId },
    })

    const { parts = [], ...woData } = seed
    const reference = seed.startedAt ?? seed.scheduledStart
    // Sem data de início ou agenda, a OS foi aberta agora — o padrão do banco.
    const dates = {
      ...(reference ? { createdAt: hoursBefore(reference, 1) } : {}),
      scheduledStart: seed.scheduledStart,
      startedAt: seed.startedAt,
    }

    const workOrder = existing
      ? await prisma.workOrder.update({ where: { id: existing.id }, data: dates })
      : await prisma.workOrder.create({ data: { ...woData, ...dates } })
    if (!existing) openCreated++

    // Sem unitCostSnapshot de propósito: OS aberta é estimada a preço atual.
    for (const use of parts) {
      const part = partsByNumber.get(use.partNumber)
      if (!part) continue
      await prisma.workOrderPart.upsert({
        where: {
          workOrderId_sparePartId: { workOrderId: workOrder.id, sparePartId: part.id },
        },
        update: { quantityUsed: use.quantityUsed },
        create: {
          workOrderId: workOrder.id,
          sparePartId: part.id,
          quantityUsed: use.quantityUsed,
        },
      })
    }
  }

  console.log(`  ✓ Work orders abertas (${openCreated} criadas, ${openWorkOrderSeeds.length - openCreated} já existiam)`)

  console.log('')
  console.log('✅ Seed concluído!')
  console.log('')
  console.log('  Usuários de teste:')
  console.log('    admin@cmms.com    / admin123    (Sysadmin)')
  console.log('    manager@cmms.com  / manager123  (Manager)')
  console.log('    engineer@cmms.com / engineer123 (Engineer)')
  console.log('    tech@cmms.com     / tech123     (Technician)')
  console.log('')
  console.log('  KPIs esperados (aproximados):')
  console.log('    Torno CNC #1        MTTR: 4.25h  MTBF: ~846h (~35d)')
  console.log('    Fresadora #2        MTTR: 3.33h  MTBF: ~947h (~39d)')
  console.log('    Compressor          MTTR: 5.5h   MTBF: ~1414h (~59d)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
