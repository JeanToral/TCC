// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
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
  createRole(@Args('input') input: CreateRoleInput): Promise<RoleRecord> {
    return this.rolesService.create(input);
  }

  @Mutation(() => RoleType)
  @RequiresPermission('role.update')
  updateRole(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateRoleInput,
  ): Promise<RoleRecord> {
    return this.rolesService.update(id, input);
  }

  @Mutation(() => RoleType)
  @RequiresPermission('role.delete')
  deleteRole(@Args('id', { type: () => Int }) id: number): Promise<RoleRecord> {
    return this.rolesService.delete(id);
  }
}
