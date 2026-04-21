import { ApolloProvider } from '@apollo/client/react'
import { RouterProvider } from 'react-router-dom'

import { apolloClient } from './lib/apollo'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './router'

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ApolloProvider>
  )
}

export default App
