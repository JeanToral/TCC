// ─────────────────────── Imports ────────────────────────
import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Float, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { hasPermission, PermissionGuard } from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserType } from './dto/user.type';
import { UsersService } from './users.service';
import type { UserRecord } from './users.repository';

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
  createUser(
    @Args('input') input: CreateUserInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<UserRecord> {
    this.assertMayWriteHourlyRate(input.hourlyRate, actor);
    return this.usersService.create(input, actor.id);
  }

  @Mutation(() => UserType)
  @RequiresPermission('user.update')
  updateUser(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateUserInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<UserRecord> {
    this.assertMayWriteHourlyRate(input.hourlyRate, actor);
    return this.usersService.update(id, input, actor.id);
  }

  @Mutation(() => UserType)
  @RequiresPermission('user.delete')
  removeUser(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() actor: JwtUser,
  ): Promise<UserRecord> {
    return this.usersService.remove(id, actor.id);
  }

  /**
   * Taxa horária é dado salarial: devolve `null` para quem não tem cost.manage,
   * em vez de lançar ForbiddenException — um guard aqui derrubaria a query
   * inteira de quem só queria o nome do usuário. Ver ADR 0001.
   */
  @ResolveField(() => Float, { nullable: true })
  async hourlyRate(
    @Parent() user: UserRecord,
    @CurrentUser() viewer: JwtUser,
  ): Promise<number | null> {
    if (!hasPermission(viewer.permissions, 'cost.manage')) return null;

    // Usuários aninhados em WorkOrder vêm de um select que omite hourlyRate de
    // propósito (ADR 0001); nesse caso busca sob demanda.
    if (user.hourlyRate !== undefined) return user.hourlyRate;
    const full = await this.usersService.findById(user.id);
    return full.hourlyRate;
  }

  private assertMayWriteHourlyRate(hourlyRate: number | undefined, actor: JwtUser): void {
    if (hourlyRate !== undefined && !hasPermission(actor.permissions, 'cost.manage')) {
      throw new ForbiddenException('Sem permissão para definir a taxa horária');
    }
  }
}
