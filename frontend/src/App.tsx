import { ApolloProvider } from '@apollo/client/react'
import { RouterProvider } from 'react-router-dom'

import { apolloClient } from './lib/apollo'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './router'

function App() {
  return (
    <AppearanceProvider>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ApolloProvider>
    </AppearanceProvider>
  )
}

export default App
