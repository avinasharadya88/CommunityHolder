import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/inMemoryDb.js';
import { CONFIG } from '../../config.js';
import type { SubmitKycDto, KycDocument, Role } from '@communityholder/shared';

export const KycController = {
  getPresignedUrl(req: Request, res: Response) {
    const { document_category, document_type, mime_type, file_size_bytes } = req.body;

    if (!mime_type || !file_size_bytes) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'mime_type and file_size_bytes are required' });
    }

    if (!CONFIG.ALLOWED_MIME_TYPES.includes(mime_type)) {
      return res.status(400).json({
        error: 'UNSUPPORTED_MIME_TYPE',
        message: 'Only JPEG, PNG, and PDF documents are allowed',
      });
    }

    if (file_size_bytes > CONFIG.MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: 'FILE_SIZE_EXCEEDS_10MB_LIMIT',
        message: 'Document size must be less than 10 MB',
      });
    }

    const docId = uuidv4();
    const extension = mime_type === 'application/pdf' ? 'pdf' : mime_type.includes('png') ? 'png' : 'jpg';
    const storageKey = `kyc-vault/2026/11/${docId}.${extension}`;

    return res.status(200).json({
      upload_url: `https://storage.communityholder.com/${storageKey}?X-Amz-Signature=mock_presigned_signature`,
      storage_key: storageKey,
      valid_for_seconds: 900,
    });
  },

  submitKyc(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const user = db.users.get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    const { full_name, email, society_id, block_id, unit_id, relationship_type, documents } = req.body as SubmitKycDto;

    if (!full_name || !society_id || !unit_id || !documents || documents.length === 0) {
      return res.status(400).json({ error: 'MISSING_FIELDS', message: 'All registration and document fields are required' });
    }

    // Update user record
    user.full_name = full_name;
    if (email) user.email = email;
    user.kyc_status = 'PENDING_VERIFICATION';
    user.rejection_reason = undefined;

    // Save documents
    for (const doc of documents) {
      const kycDoc: KycDocument = {
        id: uuidv4(),
        user_id: user.id,
        society_id,
        unit_id,
        document_category: doc.document_category,
        document_type: doc.document_type,
        document_identifier_masked: doc.document_identifier_masked,
        file_url: doc.file_url,
        file_sha256: doc.file_sha256,
        file_size_bytes: doc.file_size_bytes,
        mime_type: doc.mime_type,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };
      db.kycDocuments.set(kycDoc.id, kycDoc);
    }

    // Link unit member pending approval
    const memberKey = `${unit_id}_${user.id}`;
    db.unitMembers.set(memberKey, {
      id: uuidv4(),
      unit_id,
      user_id: user.id,
      member_type: relationship_type,
      is_primary_contact: relationship_type === 'PRIMARY_OWNER',
      approval_status: 'PENDING',
      move_in_date: new Date().toISOString(),
    });

    return res.status(201).json({
      application_id: memberKey,
      kyc_status: user.kyc_status,
      estimated_sla_hours: 24,
      message: 'Registration submitted. Pending manual verification by Estate/Facility Manager.',
    });
  },

  getKycStatus(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const user = db.users.get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    const userDocs: KycDocument[] = [];
    for (const doc of db.kycDocuments.values()) {
      if (doc.user_id === user.id) {
        userDocs.push(doc);
      }
    }

    return res.status(200).json({
      user_id: user.id,
      full_name: user.full_name,
      kyc_status: user.kyc_status,
      rejection_reason: user.rejection_reason,
      documents: userDocs,
    });
  },

  getAdminQueue(req: Request, res: Response) {
    if (!req.user || !req.user.roles.some((r) => ['ESTATE_MANAGER', 'FACILITY_MANAGER', 'SOCIETY_ADMIN'].includes(r))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Estate Manager access required' });
    }

    const queue: any[] = [];
    for (const member of db.unitMembers.values()) {
      if (member.approval_status === 'PENDING') {
        const user = db.users.get(member.user_id);
        const unit = db.units.get(member.unit_id);
        if (!user || !unit) continue;

        // Check unit conflict: does unit already have an approved primary owner?
        let conflictingOwner: string | undefined;
        for (const existing of db.unitMembers.values()) {
          if (existing.unit_id === unit.id && existing.approval_status === 'APPROVED' && existing.member_type === 'PRIMARY_OWNER') {
            const conflictUser = db.users.get(existing.user_id);
            if (conflictUser) conflictingOwner = conflictUser.full_name;
            break;
          }
        }

        const docs = Array.from(db.kycDocuments.values()).filter((d) => d.user_id === user.id);

        queue.push({
          application_id: member.id,
          user_id: user.id,
          applicant_name: user.full_name,
          phone_e164: user.phone_e164,
          unit_id: unit.id,
          unit_number: unit.unit_number,
          claimed_role: member.member_type,
          has_conflict: Boolean(conflictingOwner),
          conflicting_owner_name: conflictingOwner,
          documents: docs.map((d) => ({
            id: d.id,
            category: d.document_category,
            type: d.document_type,
            view_url: `https://storage.communityholder.com/${d.file_url}?watermark=VERIFIED_BY_${req.user?.userId}`,
            status: d.status,
          })),
        });
      }
    }

    return res.status(200).json({
      total_pending: queue.length,
      applications: queue,
    });
  },

  reviewDecision(req: Request, res: Response) {
    if (!req.user || !req.user.roles.some((r) => ['ESTATE_MANAGER', 'FACILITY_MANAGER', 'SOCIETY_ADMIN'].includes(r))) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Estate Manager access required' });
    }

    const { id } = req.params;
    const { decision, rejection_reason, notes } = req.body;

    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'INVALID_DECISION', message: 'Decision must be APPROVE or REJECT' });
    }

    // Find member application
    let targetMember: any;
    for (const m of db.unitMembers.values()) {
      if (m.id === id || `${m.unit_id}_${m.user_id}` === id) {
        targetMember = m;
        break;
      }
    }

    if (!targetMember) {
      return res.status(404).json({ error: 'APPLICATION_NOT_FOUND' });
    }

    const user = db.users.get(targetMember.user_id);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    if (decision === 'REJECT') {
      if (!rejection_reason) {
        return res.status(400).json({
          error: 'MISSING_REJECTION_REASON',
          message: 'A mandatory rejection reason must be supplied when rejecting an application',
        });
      }

      user.kyc_status = 'REJECTED';
      user.rejection_reason = notes ? `${rejection_reason}: ${notes}` : rejection_reason;
      targetMember.approval_status = 'REJECTED';

      return res.status(200).json({
        application_id: targetMember.id,
        status: 'REJECTED',
        rejection_reason: user.rejection_reason,
        message: 'Application rejected. Resident notified with re-upload action.',
      });
    }

    // APPROVE
    user.kyc_status = 'APPROVED';
    user.rejection_reason = undefined;
    targetMember.approval_status = 'APPROVED';
    targetMember.approved_by = req.user.userId;
    targetMember.approved_at = new Date().toISOString();

    const assignedRole: Role = targetMember.member_type === 'TENANT' ? 'RESIDENT_TENANT' : 'RESIDENT_OWNER';
    db.userRoles.set(user.id, [assignedRole]);

    // Ensure unit has Virtual Account Number
    const unit = db.units.get(targetMember.unit_id);
    if (unit && !unit.virtual_account_number) {
      unit.virtual_account_number = `CHOLDRBLR${unit.unit_number.replace(/\D/g, '')}`;
    }

    return res.status(200).json({
      application_id: targetMember.id,
      status: 'APPROVED',
      assigned_role: assignedRole,
      unit_id: targetMember.unit_id,
      message: 'Access approved. User granted full resident privileges.',
    });
  },
};

