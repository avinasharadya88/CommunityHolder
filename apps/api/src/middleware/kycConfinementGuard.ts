import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/inMemoryDb.js';

export function kycConfinementGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  // Exempt admins, facility managers, and guards from resident KYC confinement
  const privilegedRoles = ['ESTATE_MANAGER', 'FACILITY_MANAGER', 'SOCIETY_ADMIN', 'SECURITY_GUARD'];
  const liveRoles = db.userRoles.get(req.user.userId) || req.user.roles;
  const hasPrivilege = liveRoles.some((r) => privilegedRoles.includes(r));
  if (hasPrivilege) {
    return next();
  }

  const user = db.users.get(req.user.userId);
  const currentStatus = user ? user.kyc_status : req.user.kyc_status;

  if (currentStatus !== 'APPROVED') {
    return res.status(403).json({
      error: 'ACCESS_CONFINED_PENDING_KYC',
      code: 'KYC_PENDING_CONFINEMENT',
      status: currentStatus,
      message:
        'Your profile is awaiting Estate Manager approval. Gate feeds, payments, and community operations remain locked until verified.',
    });
  }

  next();
}
