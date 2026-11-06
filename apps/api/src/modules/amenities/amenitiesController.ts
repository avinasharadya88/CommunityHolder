import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/inMemoryDb.js';
import type { AmenityBooking } from '@communityholder/shared';

export const AmenitiesController = {
  createBooking(req: Request, res: Response) {
    const { amenity_id, unit_id, booking_start, booking_end, total_fee = 10, deposit_amount = 50 } = req.body;

    if (!amenity_id || !unit_id || !booking_start || !booking_end) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    const lockKey = `amenity:${amenity_id}:slot:${booking_start}`;

    // Redis Distributed Lock Simulation
    if (db.distributedLocks.has(lockKey)) {
      return res.status(409).json({
        error: 'SLOT_ALREADY_RESERVED',
        code: 'LOCK_ACQUISITION_FAILED',
        message: 'This amenity slot was just reserved by another resident. Please select an alternate slot.',
      });
    }

    // Acquire lock
    db.distributedLocks.add(lockKey);

    try {
      // Check existing booking
      const existing = db.amenityBookings.find(
        (b) => b.amenity_id === amenity_id && b.booking_start === booking_start && b.status === 'CONFIRMED'
      );

      if (existing) {
        return res.status(409).json({
          error: 'SLOT_ALREADY_BOOKED',
          message: 'This amenity slot has already been confirmed for another resident.',
        });
      }

      const bookingId = uuidv4();
      const booking: AmenityBooking = {
        id: bookingId,
        amenity_id,
        unit_id,
        user_id: req.user?.userId || 'unknown',
        booking_start,
        booking_end,
        total_fee,
        deposit_amount,
        status: 'CONFIRMED',
        created_at: new Date().toISOString(),
      };

      db.amenityBookings.push(booking);

      return res.status(201).json({
        booking_id: bookingId,
        status: 'CONFIRMED',
        total_fee,
        deposit_amount,
        message: 'Amenity slot confirmed successfully',
      });
    } finally {
      // Release lock
      db.distributedLocks.delete(lockKey);
    }
  },

  listBookings(req: Request, res: Response) {
    return res.status(200).json({
      total: db.amenityBookings.length,
      bookings: db.amenityBookings,
    });
  },
};
