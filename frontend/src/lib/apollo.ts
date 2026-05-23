// ─────────────────────── Imports ────────────────────────
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';

// ─────────────────────── Token store (in-memory) ─────────
let accessToken = '';

export function setAccessToken(token: string): void {
  accessToken = token;
}

// ─────────────────────── Links ───────────────────────────
const authLink = new ApolloLink((operation, forward) => {
  if (accessToken) {
    operation.setContext({
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  return forward(operation);
});

const httpLink = new HttpLink({
  // Em produção (Railway) o frontend é servido pelo próprio NestJS — mesma origem.
  // Em dev local o Vite roda na porta 5173 e o backend na 3000.
  uri: import.meta.env.VITE_API_URL ?? '/graphql',
  credentials: 'include',
});

// ─────────────────────── Client ──────────────────────────
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
