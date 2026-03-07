import { AnyZodObject, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Reusable validation middleware factory.
 * Wraps body, query, and params in a single schema — covers all input surfaces.
 * If the schema only defines `body`, Zod ignores the extra keys by default.
 * Usage:  router.post('/register', validate(registerBodySchema), controller.register)
 */
export const validate = (schema: AnyZodObject) =>
    (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    fields: err.flatten().fieldErrors,
                });
            }
            next(err);
        }
    };
