import { RoleType } from './role.type';
export declare class UserType {
    readonly id: number;
    readonly name: string;
    readonly email: string;
    readonly isActive: boolean;
    readonly roleId: number;
    readonly role: RoleType;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly deletedAt?: Date;
}
