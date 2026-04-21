// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { UsersLoader } from './users.loader';
import { UsersRepository } from './users.repository';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [AuthModule],
  providers: [UsersService, UsersResolver, UsersRepository, UsersLoader],
  exports: [UsersService, UsersRepository, UsersLoader],
})
export class UsersModule {}
