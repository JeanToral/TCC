"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequiresPermission = exports.PERMISSION_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.PERMISSION_KEY = 'required_permission';
const RequiresPermission = (permission) => (0, common_1.SetMetadata)(exports.PERMISSION_KEY, permission);
exports.RequiresPermission = RequiresPermission;
//# sourceMappingURL=requires-permission.decorator.js.map