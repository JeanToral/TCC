// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { CreateRoleInput } from './dto/create-role.input';
import { UpdateRoleInput } from './dto/update-role.input';
import { RoleType } from './dto/role.type';
import type { RoleRecord } from './roles.repository';
import { RolesService } from './roles.service';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => RoleType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesResolver {
  constructor(private readonly rolesService: RolesService) {}

  @Query(() => [RoleType])
  @RequiresPermission('role.read')
  roles(): Promise<RoleRecord[]> {
    return this.rolesService.findAll();
  }

  @Query(() => RoleType)
  @RequiresPermission('role.read')
  role(@Args('id', { type: () => Int }) id: number): Promise<RoleRecord> {
    return this.rolesService.findById(id);
  }

  @Mutation(() => RoleType)
  @RequiresPermission('role.create')
  createRole(
    @Args('input') input: CreateRoleInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<RoleRecord> {
    return this.rolesService.create(input, actor.id);
  }

  @Mutation(() => RoleType)
  @RequiresPermission('role.update')
  updateRole(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateRoleInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<RoleRecord> {
    return this.rolesService.update(id, input, actor.id);
  }

  @Mutation(() => RoleType)
  @RequiresPermission('role.delete')
  deleteRole(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() actor: JwtUser,
  ): Promise<RoleRecord> {
    return this.rolesService.delete(id, actor.id);
  }
}
