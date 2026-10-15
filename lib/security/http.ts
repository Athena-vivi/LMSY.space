/**
 * Response helpers that never leak internal details.
 *
 * Audit finding P0-3: diagnose endpoints returned rawError objects, stack
 * traces, Postgres error codes and env-var presence to any caller. Routes
 * should return a stable shape and log details server-side only.
 */

import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  success: false;
  error: string;
  code?: string;
}

/**
 * Public error response. `message` must be a static, caller-safe string.
 * Full details stay in the server log.
 */
export function apiError(
  status: number,
  message: string,
  options?: { code?: string; logContext?: string; cause?: unknown }
): NextResponse<ApiErrorBody> {
  if (options?.cause !== undefined) {
    const label = options.logContext ? `[${options.logContext}] ` : '';
    console.error(`${label}request failed:`, options.cause instanceof Error ? options.cause.message : options.cause);
    if (options.cause instanceof Error && options.cause.stack) {
      console.error(options.cause.stack);
    }
  } else if (options?.logContext) {
    console.error(`[${options.logContext}] ${message}`);
  }

  const body: ApiErrorBody = { success: false, error: message };
  if (options?.code) body.code = options.code;
  return NextResponse.json(body, { status });
}

/** 500 without leaking the exception message to the client. */
export function apiServerError(logContext: string, cause?: unknown): NextResponse<ApiErrorBody> {
  return apiError(500, 'Internal server error', { logContext, cause });
}

/**
 * Convert an unknown thrown value into a safe message for server logs only.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'unknown error';
  }
}
