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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersLoader = void 0;
const common_1 = require("@nestjs/common");
const dataloader_1 = __importDefault(require("dataloader"));
const users_repository_1 = require("./users.repository");
let UsersLoader = class UsersLoader {
    repo;
    byId;
    constructor(repo) {
        this.repo = repo;
        this.byId = new dataloader_1.default(async (ids) => {
            const users = await this.repo.findManyByIds([...ids]);
            const map = new Map(users.map((u) => [u.id, u]));
            return ids.map((id) => map.get(id) ?? null);
        });
    }
};
exports.UsersLoader = UsersLoader;
exports.UsersLoader = UsersLoader = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.REQUEST }),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository])
], UsersLoader);
//# sourceMappingURL=users.loader.js.map