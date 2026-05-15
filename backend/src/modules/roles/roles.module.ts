// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RolesRepository } from './roles.repository';
import { RolesResolver } from './roles.resolver';
import { RolesService } from './roles.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [AuthModule],
  providers: [RolesService, RolesResolver, RolesRepository],
  exports: [RolesRepository],
})
export class RolesModule {}
