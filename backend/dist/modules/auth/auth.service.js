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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    config;
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
    }
    async login(input, res) {
        const user = await this.prisma.user.findUnique({
            where: { email: input.email },
            select: {
                id: true,
                email: true,
                passwordHash: true,
                isActive: true,
                deletedAt: true,
                roleId: true,
                role: { select: { permissions: true } },
            },
        });
        if (!user || !user.isActive || user.deletedAt) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        const permissions = user.role.permissions;
        const accessToken = await this.signAccess({ sub: String(user.id), email: user.email, permissions });
        const refreshToken = await this.signRefresh(user.id);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
        });
        this.setRefreshCookie(res, refreshToken);
        return { accessToken };
    }
    async logout(userId, res) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });
        res.clearCookie('refreshToken');
        return true;
    }
    async refreshToken(req) {
        const token = req.cookies?.refreshToken ?? '';
        if (!token)
            throw new common_1.UnauthorizedException();
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret: this.config.getOrThrow('JWT_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException();
        }
        const user = await this.prisma.user.findUnique({
            where: { id: Number(payload.sub) },
            select: {
                id: true,
                email: true,
                isActive: true,
                deletedAt: true,
                roleId: true,
                refreshTokenHash: true,
                role: { select: { permissions: true } },
            },
        });
        if (!user || !user.isActive || user.deletedAt || !user.refreshTokenHash) {
            throw new common_1.UnauthorizedException();
        }
        const valid = await bcrypt.compare(token, user.refreshTokenHash);
        if (!valid)
            throw new common_1.UnauthorizedException();
        const permissions = user.role.permissions;
        const accessToken = await this.signAccess({ sub: String(user.id), email: user.email, permissions });
        const newRefresh = await this.signRefresh(user.id);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: await bcrypt.hash(newRefresh, 10) },
        });
        return { accessToken };
    }
    signAccess(payload) {
        return this.jwtService.signAsync(payload);
    }
    signRefresh(userId) {
        return this.jwtService.signAsync({ sub: String(userId) }, {
            secret: this.config.getOrThrow('JWT_SECRET'),
            expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRATION'),
        });
    }
    setRefreshCookie(res, token) {
        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: this.config.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map