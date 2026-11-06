import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/inMemoryDb.js';
import type { HelpdeskTicket } from '@communityholder/shared';

export interface ExtendedHelpdeskTicket extends HelpdeskTicket {
  scope: 'COMMON_AREA' | 'INTERNAL_FLAT';
  sla_deadline_hours: number;
  sla_expires_at: string;
  escalation_level: 'NONE' | 'L1' | 'L2';
  attachment_url?: string;
  assigned_to?: string;
}

export const HelpdeskController = {
  createTicket(req: Request, res: Response) {
    const {
      society_id,
      unit_id,
      category,
      title,
      description,
      scope = 'COMMON_AREA',
      priority = 'MEDIUM',
      sla_deadline_hours = 4,
      attachment_url,
    } = req.body;

    if (!category || !title || !description) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'category, title, and description are required',
      });
    }

    const ticketId = uuidv4();
    const now = Date.now();
    const slaExpiresAt = new Date(now + sla_deadline_hours * 3600 * 1000).toISOString();

    const ticket: ExtendedHelpdeskTicket = {
      id: ticketId,
      society_id: society_id || 'soc_prestige_greenwoods',
      unit_id: unit_id || 'unit_alpha_1204',
      user_id: req.user?.userId || 'unknown',
      category,
      title,
      description,
      status: 'OPEN',
      priority,
      scope,
      sla_deadline_hours,
      sla_expires_at: slaExpiresAt,
      escalation_level: 'NONE',
      attachment_url,
      assigned_to: 'contractor_facility_lead',
      created_at: new Date(now).toISOString(),
    };

    db.helpdeskTickets.set(ticketId, ticket);

    return res.status(201).json({
      ticket_id: ticketId,
      status: ticket.status,
      priority: ticket.priority,
      sla_expires_at: ticket.sla_expires_at,
      assigned_to: ticket.assigned_to,
      message: 'Helpdesk ticket created and dispatched to facility service team',
    });
  },

  listTickets(req: Request, res: Response) {
    const tickets = Array.from(db.helpdeskTickets.values());
    return res.status(200).json({
      total: tickets.length,
      tickets,
    });
  },

  updateStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const { status } = req.body;

    const ticket = db.helpdeskTickets.get(id);
    if (!ticket) {
      return res.status(404).json({ error: 'TICKET_NOT_FOUND' });
    }

    if (!['OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ error: 'INVALID_STATUS' });
    }

    ticket.status = status;

    return res.status(200).json({
      ticket_id: ticket.id,
      status: ticket.status,
    });
  },

  runSlaEscalationCron(req: Request, res: Response) {
    const now = Date.now();
    let l1Escalated = 0;
    let l2Escalated = 0;

    for (const ticket of db.helpdeskTickets.values()) {
      const extTicket = ticket as ExtendedHelpdeskTicket;
      if (extTicket.status === 'RESOLVED' || extTicket.status === 'CLOSED') {
        continue;
      }

      const createdAtMs = new Date(extTicket.created_at).getTime();
      const ageHours = (now - createdAtMs) / (3600 * 1000);

      // Check L2: Unresolved for > 24 hours
      if (ageHours >= 24 && extTicket.escalation_level !== 'L2') {
        extTicket.escalation_level = 'L2';
        l2Escalated += 1;
      }
      // Check L1: Past initial SLA (4 hours)
      else if (ageHours >= extTicket.sla_deadline_hours && extTicket.escalation_level === 'NONE') {
        extTicket.escalation_level = 'L1';
        l1Escalated += 1;
      }
    }

    return res.status(200).json({
      status: 'SLA_AUDIT_COMPLETED',
      escalated_l1_count: l1Escalated,
      escalated_l2_count: l2Escalated,
      message: 'Automated SLA escalation run complete',
    });
  },
};
