import DataLoader from 'dataloader';
import { type UserRecord, UsersRepository } from './users.repository';
export declare class UsersLoader {
    private readonly repo;
    readonly byId: DataLoader<number, UserRecord | null>;
    constructor(repo: UsersRepository);
}
