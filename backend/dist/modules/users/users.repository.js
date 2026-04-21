"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    isActive: true,
    roleId: true,
    role: {
        select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
            isSystem: true,
        },
    },
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
};
let UsersRepository = class UsersRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            select: USER_SELECT,
            orderBy: { createdAt: 'desc' },
        });
    }
    findById(id) {
        return this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: USER_SELECT,
        });
    }
    findByEmail(email) {
        return this.prisma.user.findFirst({
            where: { email, deletedAt: null },
            select: USER_SELECT,
        });
    }
    findManyByIds(ids) {
        return this.prisma.user.findMany({
            where: { id: { in: ids }, deletedAt: null },
            select: USER_SELECT,
        });
    }
    create(data) {
        return this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash: data.passwordHash,
                role: { connect: { id: data.roleId } },
            },
            select: USER_SELECT,
        });
    }
    update(id, data) {
        const { roleId, ...rest } = data;
        return this.prisma.user.update({
            where: { id },
            data: {
                ...rest,
                ...(roleId ? { role: { connect: { id: roleId } } } : {}),
            },
            select: USER_SELECT,
        });
    }
    softDelete(id) {
        return this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() },
            select: USER_SELECT,
        });
    }
    findAllRoles() {
        return this.prisma.role.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                permissions: true,
                isSystem: true,
            },
            orderBy: { name: 'asc' },
        });
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersRepository);
//# sourceMappingURL=users.repository.js.map