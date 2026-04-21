import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
export declare class GqlThrottlerGuard extends ThrottlerGuard {
    protected getRequestResponse(context: ExecutionContext): {
        req: Request;
        res: Response;
    };
}
