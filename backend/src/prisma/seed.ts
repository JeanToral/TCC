import { hash } from 'bcryptjs'
import { PrismaClient, WorkOrderType, WorkOrderStatus, Priority } from '../generated/prisma'

const prisma = new PrismaClient()

// ── Helpers ────────────────────────────────────────────────

function dt(iso: string): Date {
  return new Date(iso)
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

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Gerente de manutenção',
      permissions: [
        'asset.create', 'asset.read', 'asset.update', 'asset.delete',
        'workorder.create', 'workorder.read', 'workorder.update', 'workorder.delete',
        'workorder.approve',
        'sparepart.read', 'sparepart.update',
        'user.read',
        'dashboard.read',
        'auditlog.read',
      ],
      isSystem: true,
    },
  })

  const engineerRole = await prisma.role.upsert({
    where: { name: 'Engineer' },
    update: {},
    create: {
      name: 'Engineer',
      description: 'Engenheiro de manutenção',
      permissions: [
        'asset.read', 'asset.update',
        'workorder.create', 'workorder.read', 'workorder.update', 'workorder.delete',
        'sparepart.read', 'sparepart.update',
        'dashboard.read',
      ],
      isSystem: true,
    },
  })

  const techRole = await prisma.role.upsert({
    where: { name: 'Technician' },
    update: {},
    create: {
      name: 'Technician',
      description: 'Técnico de manutenção',
      permissions: [
        'asset.read',
        'workorder.read', 'workorder.update',
        'sparepart.read',
      ],
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
      passwordHash: await hashPassword('admin123'),
      roleId: sysadminRole.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'manager@cmms.com' },
    update: {},
    create: {
      name: 'Carlos Gestão',
      email: 'manager@cmms.com',
      passwordHash: await hashPassword('manager123'),
      roleId: managerRole.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'engineer@cmms.com' },
    update: {},
    create: {
      name: 'Ana Engenharia',
      email: 'engineer@cmms.com',
      passwordHash: await hashPassword('engineer123'),
      roleId: engineerRole.id,
    },
  })

  const techUser = await prisma.user.upsert({
    where: { email: 'tech@cmms.com' },
    update: {},
    create: {
      name: 'João Técnico',
      email: 'tech@cmms.com',
      passwordHash: await hashPassword('tech123'),
      roleId: techRole.id,
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

  type WOSeed = {
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
    closingNotes: string
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
      closingNotes: 'Correia Gates PowerGrip GT3 instalada. Tensão ajustada conforme tabela do fabricante.',
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
      closingNotes: 'Guias INA KWVE 25 substituídas. Nivelamento e alinhamento conferidos com relógio comparador.',
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
    },
  ]

  let created = 0
  for (const seed of workOrderSeeds) {
    const existing = await prisma.workOrder.findFirst({
      where: {
        title: seed.title,
        assetId: seed.assetId,
        status: WorkOrderStatus.COMPLETED,
      },
    })

    if (!existing) {
      await prisma.workOrder.create({
        data: {
          ...seed,
          type: WorkOrderType.CORRECTIVE,
          status: WorkOrderStatus.COMPLETED,
        },
      })
      created++
    }
  }

  console.log(`  ✓ Work orders (${created} criadas, ${workOrderSeeds.length - created} já existiam)`)

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
