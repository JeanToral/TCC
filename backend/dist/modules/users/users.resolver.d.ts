import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersService } from './users.service';
import type { RoleRecord, UserRecord } from './users.repository';
export declare class UsersResolver {
    private readonly usersService;
    constructor(usersService: UsersService);
    users(): Promise<UserRecord[]>;
    user(id: number): Promise<UserRecord>;
    createUser(input: CreateUserInput): Promise<UserRecord>;
    updateUser(id: number, input: UpdateUserInput): Promise<UserRecord>;
    removeUser(id: number): Promise<UserRecord>;
    roles(): Promise<RoleRecord[]>;
}
