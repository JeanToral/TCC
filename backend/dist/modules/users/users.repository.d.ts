import { PrismaService } from '../../prisma/prisma.service';
export interface RoleRecord {
    readonly id: number;
    readonly name: string;
    readonly description: string | null;
    readonly permissions: unknown;
    readonly isSystem: boolean;
}
export interface UserRecord {
    readonly id: number;
    readonly name: string;
    readonly email: string;
    readonly isActive: boolean;
    readonly roleId: number;
    readonly role: RoleRecord;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly deletedAt: Date | null;
}
interface CreateData {
    readonly name: string;
    readonly email: string;
    readonly passwordHash: string;
    readonly roleId: number;
}
interface UpdateData {
    name?: string;
    email?: string;
    passwordHash?: string;
    isActive?: boolean;
    roleId?: number;
}
export declare class UsersRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<UserRecord[]>;
    findById(id: number): Promise<UserRecord | null>;
    findByEmail(email: string): Promise<UserRecord | null>;
    findManyByIds(ids: number[]): Promise<UserRecord[]>;
    create(data: CreateData): Promise<UserRecord>;
    update(id: number, data: UpdateData): Promise<UserRecord>;
    softDelete(id: number): Promise<UserRecord>;
    findAllRoles(): Promise<RoleRecord[]>;
}
export {};
