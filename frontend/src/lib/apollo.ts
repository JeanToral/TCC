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
  uri: 'http://localhost:3000/graphql',
  credentials: 'include',
});

// ─────────────────────── Client ──────────────────────────
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
