"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const users_repository_1 = require("./users.repository");
let UsersService = class UsersService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    findAll() {
        return this.repo.findAll();
    }
    async findById(id) {
        const user = await this.repo.findById(id);
        if (!user)
            throw new common_1.NotFoundException(`Usuário ${id} não encontrado`);
        return user;
    }
    async create(input) {
        const existing = await this.repo.findByEmail(input.email);
        if (existing)
            throw new common_1.ConflictException('E-mail já cadastrado');
        const passwordHash = await bcrypt.hash(input.password, 10);
        return this.repo.create({
            name: input.name,
            email: input.email,
            passwordHash,
            roleId: input.roleId,
        });
    }
    async update(id, input) {
        await this.findById(id);
        if (input.email) {
            const conflict = await this.repo.findByEmail(input.email);
            if (conflict && conflict.id !== id) {
                throw new common_1.ConflictException('E-mail já cadastrado');
            }
        }
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.email !== undefined)
            data.email = input.email;
        if (input.isActive !== undefined)
            data.isActive = input.isActive;
        if (input.roleId !== undefined)
            data.roleId = input.roleId;
        if (input.password !== undefined) {
            data.passwordHash = await bcrypt.hash(input.password, 10);
        }
        return this.repo.update(id, data);
    }
    async remove(id) {
        await this.findById(id);
        return this.repo.softDelete(id);
    }
    roles() {
        return this.repo.findAllRoles();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map