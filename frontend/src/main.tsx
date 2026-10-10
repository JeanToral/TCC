import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Chrome de página (.page-header, .page-loading, .page-back) usado por todas as
// telas — importado aqui para não depender de qual página carregou primeiro.
import './components/ui/FormLayout.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
