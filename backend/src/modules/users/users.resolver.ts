// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { RoleType } from './dto/role.type';
import { UserType } from './dto/user.type';
import { UsersService } from './users.service';
import type { RoleRecord, UserRecord } from './users.repository';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => UserType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [UserType])
  @RequiresPermission('user.read')
  users(): Promise<UserRecord[]> {
    return this.usersService.findAll();
  }

  @Query(() => UserType)
  @RequiresPermission('user.read')
  user(@Args('id', { type: () => Int }) id: number): Promise<UserRecord> {
    return this.usersService.findById(id);
  }

  @Mutation(() => UserType)
  @RequiresPermission('user.create')
  createUser(@Args('input') input: CreateUserInput): Promise<UserRecord> {
    return this.usersService.create(input);
  }

  @Mutation(() => UserType)
  @RequiresPermission('user.update')
  updateUser(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateUserInput,
  ): Promise<UserRecord> {
    return this.usersService.update(id, input);
  }

  @Mutation(() => UserType)
  @RequiresPermission('user.delete')
  removeUser(@Args('id', { type: () => Int }) id: number): Promise<UserRecord> {
    return this.usersService.remove(id);
  }

  @Query(() => [RoleType])
  @RequiresPermission('role.read')
  roles(): Promise<RoleRecord[]> {
    return this.usersService.roles();
  }
}
