import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/errors.js";

interface PgError {
  code?: string;
  constraint?: string;
  detail?: string;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  void _next;
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.flatten() });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const pgErr = err as PgError;
  if (pgErr?.code === "23505") {
    res.status(409).json({ error: "A record with these unique values already exists.", detail: pgErr.detail });
    return;
  }
  if (pgErr?.code === "23503") {
    res.status(409).json({ error: "This operation violates a foreign key relationship.", detail: pgErr.detail });
    return;
  }
  if (pgErr?.code === "23514") {
    res.status(422).json({ error: "This operation violates a business rule constraint.", detail: pgErr.detail });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
