// ─────────────────────── Imports ────────────────────────
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

import { type UserRecord, UsersRepository } from './users.repository';

// ─────────────────────── Loader ──────────────────────────
@Injectable({ scope: Scope.REQUEST })
export class UsersLoader {
  readonly byId: DataLoader<number, UserRecord | null>;

  constructor(private readonly repo: UsersRepository) {
    this.byId = new DataLoader(async (ids: readonly number[]) => {
      const users = await this.repo.findManyByIds([...ids]);
      const map = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => map.get(id) ?? null);
    });
  }
}
