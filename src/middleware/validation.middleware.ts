import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod/v4";

export function validateData(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue: any) => ({
          message: `${issue.path.join(".")} is ${issue.message}`,
        }));
        res.status(400).json({ error: "Invalid data", details: errorMessages });
      } else {
        res.status(500).json({
          error: "Internal Server Error",
          details: JSON.stringify(error),
        });
      }
    }
  };
}

/**
 * Verify that incoming webhook payloads are actually from Meta.
 * Pass this as the `verify` option to `express.json()`.
 */
export function verifyRequestSignature(
  req: Request,
  _res: Response,
  buf: Buffer,
) {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;

  if (!signature) {
    console.warn(`Couldn't find "x-hub-signature-256" in headers.`);
  } else {
    const signatureHash = signature.split("=")[1];
    const expectedHash = crypto
      .createHmac("sha256", process.env.META_APP_SECRET as string)
      .update(buf)
      .digest("hex");
    if (signatureHash !== expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}
