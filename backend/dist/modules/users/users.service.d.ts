import { type UserRecord, UsersRepository } from './users.repository';
import type { CreateUserInput } from './dto/create-user.input';
import type { UpdateUserInput } from './dto/update-user.input';
export declare class UsersService {
    private readonly repo;
    constructor(repo: UsersRepository);
    findAll(): Promise<UserRecord[]>;
    findById(id: number): Promise<UserRecord>;
    create(input: CreateUserInput): Promise<UserRecord>;
    update(id: number, input: UpdateUserInput): Promise<UserRecord>;
    remove(id: number): Promise<UserRecord>;
    roles(): Promise<import('./users.repository').RoleRecord[]>;
}
