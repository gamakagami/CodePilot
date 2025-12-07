import { Request, Response, NextFunction } from 'express';
import { Receiver } from '@upstash/qstash';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function verifyQstashSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const signature = req.headers['upstash-signature'] as string;
    
    if (!signature) {
      return res.status(401).json({ error: 'Missing Qstash signature' });
    }

    const body = JSON.stringify(req.body);
    
    const isValid = await receiver.verify({
      signature,
      body,
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Qstash signature' });
    }

    next();
  } catch (error: any) {
    console.error('Qstash verification failed:', error);
    res.status(401).json({ error: 'Signature verification failed' });
  }
}