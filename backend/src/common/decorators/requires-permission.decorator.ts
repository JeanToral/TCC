// ─────────────────────── Imports ────────────────────────
import { SetMetadata } from '@nestjs/common';

// ─────────────────────── Constants ──────────────────────
export const PERMISSION_KEY = 'required_permission';

// ─────────────────────── Decorator ──────────────────────
export const RequiresPermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
