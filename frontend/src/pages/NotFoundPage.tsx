import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

/**
 * Rota inexistente (`path: '*'`) e `errorElement` da raiz. Fora do shell de propósito:
 * aparece também para quem não está logado e quando o próprio shell quebrou.
 */
export default function NotFoundPage() {
  const error = useRouteError()
  const crashed = error != null && !(isRouteErrorResponse(error) && error.status === 404)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4 text-center">
      <p className="font-mono text-sm text-quiet">{crashed ? 'Erro' : '404'}</p>
      <h1 className="text-xl font-semibold text-ink">
        {crashed ? 'Algo deu errado nesta tela' : 'Página não encontrada'}
      </h1>
      <p className="max-w-sm text-sm text-body">
        {crashed
          ? 'Recarregue a página. Se o erro continuar, volte ao painel e tente de novo.'
          : 'O endereço não existe ou foi removido. Confira o link ou volte ao painel.'}
      </p>
      <Link to="/dashboard" className="text-sm font-medium">
        Voltar ao painel
      </Link>
    </main>
  )
}
