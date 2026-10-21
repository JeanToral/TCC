import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import { usePageCrumb } from '../../components/layout/Breadcrumbs'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import Modal from '../../components/ui/Modal'
import MoreActions from '../../components/ui/MoreActions'
import { Sheet, SheetFacts, SheetHeader, SheetSection } from '../../components/ui/Sheet'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { REMOVE_USER } from '../../graphql/users/DeleteUser.gql'
import { GET_USER } from '../../graphql/users/GetUser.gql'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import type { GetUserData, RemoveUserData } from '../../graphql/users/types'
import { errorMessage } from '../../lib/utils'

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function UserViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const { data, loading, error } = useQuery<GetUserData>(GET_USER, {
    variables: { id: Number(id) },
    skip: !id,
  })
  usePageCrumb(data?.user?.name)

  const [removeUser, { loading: removing }] = useMutation<RemoveUserData>(REMOVE_USER, {
    variables: { id: Number(id) },
    refetchQueries: [{ query: GET_USERS }],
    onCompleted: () => navigate('/dashboard/users'),
    onError: (e) => setDeleteError(errorMessage(e)),
  })

  if (loading) {
    return (
      <Sheet>
        <div className="flex flex-col gap-3 p-5" role="status" aria-label="Carregando">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
      </Sheet>
    )
  }

  if (error || !data?.user) {
    return (
      <Sheet>
        <EmptyState
          message={error ? `Erro ao carregar o usuário: ${error.message}` : 'Usuário não encontrado.'}
          action={<Link to="/dashboard/users">Voltar para Usuários</Link>}
        />
      </Sheet>
    )
  }

  const { user } = data
  const fullAccess = user.role.permissions.includes('*')
  const permissionCount = user.role.permissions.length

  return (
    <>
      <Sheet>
        <SheetHeader
          eyebrow="Usuário"
          title={user.name}
          meta={[
            { label: 'Situação', value: <Badge variant={user.isActive ? 'success' : 'default'}>{user.isActive ? 'Ativo' : 'Inativo'}</Badge> },
            { label: 'Perfil de acesso', value: user.role.name },
          ]}
          actions={
            <>
              {hasPermission('user.update') && (
                <Button variant="secondary" onClick={() => navigate(`/dashboard/users/${user.id}/edit`)}>
                  Editar
                </Button>
              )}
              <MoreActions
                align="start"
                items={[
                  {
                    label: 'Excluir usuário',
                    danger: true,
                    onSelect: () => {
                      setDeleteError('')
                      setDeleteOpen(true)
                    },
                    disabledReason: hasPermission('user.delete') ? undefined : 'Você não tem permissão para esta ação',
                  },
                ]}
              />
            </>
          }
        >
          <span className="font-mono text-[0.8125rem] text-quiet">{user.email}</span>
        </SheetHeader>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <SheetSection title="Perfil de acesso">
              <SheetFacts
                items={[
                  { label: 'Perfil', value: user.role.name },
                  ...(user.role.description ? [{ label: 'Descrição', value: user.role.description }] : []),
                  {
                    label: 'Permissões',
                    value: fullAccess ? (
                      <Badge variant="info">Acesso total</Badge>
                    ) : (
                      <span className="font-mono">
                        {permissionCount} {permissionCount === 1 ? 'permissão' : 'permissões'}
                      </span>
                    ),
                  },
                ]}
              />
              {hasPermission('role.read') && (
                <Link to={`/dashboard/roles/${user.role.id}`} className="mt-3 inline-block text-sm">
                  Ver perfil de acesso
                </Link>
              )}
            </SheetSection>

            {hasPermission('cost.manage') && (
              <SheetSection title="Mão de obra">
                <SheetFacts
                  items={[
                    {
                      label: 'Taxa horária',
                      value: (
                        <span className="font-mono">
                          {user.hourlyRate === null ? 'Não informada' : `${BRL.format(user.hourlyRate)} / h`}
                        </span>
                      ),
                    },
                  ]}
                />
              </SheetSection>
            )}
          </div>

          <aside className="border-t border-rule lg:border-t-0 lg:border-l" aria-label="Registro">
            <SheetSection title="Documento">
              <SheetFacts
                items={[
                  { label: 'Cadastrado em', value: <span className="font-mono">{DATE_TIME.format(new Date(user.createdAt))}</span> },
                  { label: 'Atualizado em', value: <span className="font-mono">{DATE_TIME.format(new Date(user.updatedAt))}</span> },
                  ...(user.deletedAt
                    ? [{ label: 'Excluído em', value: <span className="font-mono text-error">{DATE_TIME.format(new Date(user.deletedAt))}</span> }]
                    : []),
                ]}
              />
            </SheetSection>
          </aside>
        </div>
      </Sheet>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir usuário"
        size="sm"
        footer={
          <>
            <Button variant="link" onClick={() => setDeleteOpen(false)} disabled={removing}>
              Cancelar
            </Button>
            <Button variant="danger" loading={removing} onClick={() => removeUser()}>
              Confirmar exclusão
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-body">
          Tem certeza que deseja excluir o usuário <strong>{user.name}</strong>? Esta ação não pode ser desfeita.
        </p>
        {deleteError && <FormAlert className="m-0 mt-3">{deleteError}</FormAlert>}
      </Modal>
    </>
  )
}
