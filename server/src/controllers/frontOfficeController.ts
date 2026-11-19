import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper to parse time strings like "10:30", "10:30 AM", "14:00" into minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const numbersOnly = clean.replace(/[APM\s]/g, '');
  const parts = numbersOnly.split(':');
  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Format Date object to "YYYY-MM-DD"
function toDateString(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  return dateObj.toISOString().split('T')[0];
}

// Format current time into "hh:mm AM/PM"
function getCurrentFormattedTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ----------------------------------------------------
// 1. VISITORS CONTROLLERS
// ----------------------------------------------------

export const getVisitors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { search, status, date, hostUserId, from, to } = req.query as Record<string, string>;

  const where: any = { organizationId: orgId };

  if (status && status !== 'all') {
    where.status = status;
  }

  if (hostUserId && hostUserId !== 'all') {
    where.hostUserId = hostUserId;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    where.visitDate = { gte: startOfDay, lte: endOfDay };
  } else if (from || to) {
    where.visitDate = {};
    if (from) {
      const f = new Date(from);
      f.setHours(0, 0, 0, 0);
      where.visitDate.gte = f;
    }
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      where.visitDate.lte = t;
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { company: { contains: q, mode: 'insensitive' } },
      { purpose: { contains: q, mode: 'insensitive' } },
      { passNumber: { contains: q, mode: 'insensitive' } },
      { hostUser: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const visitors = await prisma.visitor.findMany({
    where,
    include: {
      hostUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
          avatar: true,
          department: { select: { id: true, name: true, type: true } },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [
      { visitDate: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  // Calculate live summary statistics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [totalToday, activeNow, checkedOutToday, totalAll] = await Promise.all([
    prisma.visitor.count({
      where: {
        organizationId: orgId,
        visitDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.visitor.count({
      where: {
        organizationId: orgId,
        status: 'checked_in',
      },
    }),
    prisma.visitor.count({
      where: {
        organizationId: orgId,
        status: 'checked_out',
        visitDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.visitor.count({
      where: { organizationId: orgId },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: visitors,
    stats: {
      totalToday,
      activeNow,
      checkedOutToday,
      totalAll,
    },
  });
});

export const createVisitor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const {
    name,
    phone,
    email,
    company,
    visitDate,
    checkInTime,
    checkOutTime,
    purpose,
    hostUserId,
    idProofType,
    idProofNumber,
    passNumber,
    remarks,
  } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ success: false, message: 'Visitor name is required' });
    return;
  }

  if (!purpose || !purpose.trim()) {
    res.status(400).json({ success: false, message: 'Purpose of visit is required' });
    return;
  }

  const vDate = visitDate ? new Date(visitDate) : new Date();
  const cInTime = checkInTime?.trim() || getCurrentFormattedTime();

  const visitor = await prisma.visitor.create({
    data: {
      organizationId: orgId,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      company: company?.trim() || null,
      visitDate: vDate,
      checkInTime: cInTime,
      checkOutTime: checkOutTime?.trim() || null,
      checkInAt: new Date(),
      purpose: purpose.trim(),
      hostUserId: hostUserId || null,
      idProofType: idProofType?.trim() || null,
      idProofNumber: idProofNumber?.trim() || null,
      passNumber: passNumber?.trim() || null,
      remarks: remarks?.trim() || null,
      status: 'checked_in',
      createdById: req.user.id,
    },
    include: {
      hostUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
        },
      },
      createdBy: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  // Notify host user if assigned
  if (hostUserId) {
    try {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          userId: hostUserId,
          title: `Visitor Arrived: ${name}`,
          message: `${name} ${company ? `from ${company}` : ''} has checked in at the front desk to meet you. Reason: ${purpose}.`,
          type: 'general',
          priority: 'high',
        },
      });
    } catch (e) {
      console.warn('Failed to send visitor notification to host:', e);
    }
  }

  res.status(201).json({
    success: true,
    data: visitor,
    message: 'Visitor checked in successfully',
  });
});

export const updateVisitor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const existing = await prisma.visitor.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Visitor entry not found' });
    return;
  }

  const {
    name,
    phone,
    email,
    company,
    visitDate,
    checkInTime,
    checkOutTime,
    purpose,
    hostUserId,
    idProofType,
    idProofNumber,
    passNumber,
    remarks,
    status,
  } = req.body;

  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (email !== undefined) data.email = email?.trim() || null;
  if (company !== undefined) data.company = company?.trim() || null;
  if (visitDate !== undefined) data.visitDate = new Date(visitDate);
  if (checkInTime !== undefined) data.checkInTime = checkInTime;
  if (checkOutTime !== undefined) data.checkOutTime = checkOutTime;
  if (purpose !== undefined) data.purpose = purpose.trim();
  if (hostUserId !== undefined) data.hostUserId = hostUserId || null;
  if (idProofType !== undefined) data.idProofType = idProofType || null;
  if (idProofNumber !== undefined) data.idProofNumber = idProofNumber || null;
  if (passNumber !== undefined) data.passNumber = passNumber || null;
  if (remarks !== undefined) data.remarks = remarks || null;
  if (status !== undefined) {
    data.status = status;
    if (status === 'checked_out' && !existing.checkOutAt) {
      data.checkOutAt = new Date();
      if (!data.checkOutTime) {
        data.checkOutTime = getCurrentFormattedTime();
      }
    }
  }

  const updated = await prisma.visitor.update({
    where: { id },
    data,
    include: {
      hostUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: updated,
    message: 'Visitor record updated successfully',
  });
});

export const checkOutVisitor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const existing = await prisma.visitor.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Visitor entry not found' });
    return;
  }

  const updated = await prisma.visitor.update({
    where: { id },
    data: {
      status: 'checked_out',
      checkOutAt: new Date(),
      checkOutTime: getCurrentFormattedTime(),
    },
    include: {
      hostUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: updated,
    message: `${existing.name} has been checked out successfully`,
  });
});

export const deleteVisitor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const existing = await prisma.visitor.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Visitor entry not found' });
    return;
  }

  await prisma.visitor.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: 'Visitor record deleted successfully',
  });
});

// ----------------------------------------------------
// 2. MEETING ROOMS CONTROLLERS
// ----------------------------------------------------

export const getMeetingRooms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { status } = req.query as Record<string, string>;

  const where: any = { organizationId: orgId };
  if (status && status !== 'all') {
    where.status = status;
  }

  const rooms = await prisma.meetingRoom.findMany({
    where,
    include: {
      _count: {
        select: { bookings: true },
      },
    },
    orderBy: [
      { status: 'asc' },
      { name: 'asc' },
    ],
  });

  // Compute live availability for each room right now
  const now = new Date();
  const todayStr = toDateString(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayBookings = await prisma.roomBooking.findMany({
    where: {
      organizationId: orgId,
      status: { not: 'cancelled' },
      date: {
        gte: new Date(todayStr + 'T00:00:00.000Z'),
        lte: new Date(todayStr + 'T23:59:59.999Z'),
      },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  const roomsWithAvailability = rooms.map(room => {
    const roomTodayBookings = todayBookings.filter(b => b.roomId === room.id);
    const activeBooking = roomTodayBookings.find(b => {
      const sMin = timeToMinutes(b.startTime);
      const eMin = timeToMinutes(b.endTime);
      return currentMinutes >= sMin && currentMinutes < eMin;
    });

    const nextBooking = roomTodayBookings
      .filter(b => timeToMinutes(b.startTime) > currentMinutes)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0];

    return {
      ...room,
      todayBookingsCount: roomTodayBookings.length,
      isCurrentlyOccupied: Boolean(activeBooking),
      currentMeeting: activeBooking || null,
      nextMeeting: nextBooking || null,
    };
  });

  res.status(200).json({
    success: true,
    data: roomsWithAvailability,
  });
});

export const createMeetingRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { name, code, floor, capacity, amenities, status, description } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ success: false, message: 'Room name is required' });
    return;
  }

  const room = await prisma.meetingRoom.create({
    data: {
      organizationId: orgId,
      name: name.trim(),
      code: code?.trim() || null,
      floor: floor?.trim() || null,
      capacity: Number(capacity) || 4,
      amenities: Array.isArray(amenities) ? amenities : [],
      status: status || 'active',
      description: description?.trim() || null,
    },
  });

  res.status(201).json({
    success: true,
    data: room,
    message: 'Meeting room created successfully',
  });
});

export const updateMeetingRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const existing = await prisma.meetingRoom.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Meeting room not found' });
    return;
  }

  const { name, code, floor, capacity, amenities, status, description } = req.body;
  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (code !== undefined) data.code = code?.trim() || null;
  if (floor !== undefined) data.floor = floor?.trim() || null;
  if (capacity !== undefined) data.capacity = Number(capacity) || 4;
  if (amenities !== undefined) data.amenities = Array.isArray(amenities) ? amenities : [];
  if (status !== undefined) data.status = status;
  if (description !== undefined) data.description = description?.trim() || null;

  const updated = await prisma.meetingRoom.update({
    where: { id },
    data,
  });

  res.status(200).json({
    success: true,
    data: updated,
    message: 'Meeting room updated successfully',
  });
});

export const deleteMeetingRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const existing = await prisma.meetingRoom.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Meeting room not found' });
    return;
  }

  await prisma.meetingRoom.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: 'Meeting room deleted successfully',
  });
});

// ----------------------------------------------------
// 3. ROOM BOOKINGS CONTROLLERS
// ----------------------------------------------------

export const getRoomBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const { roomId, userId, date, status, from, to } = req.query as Record<string, string>;

  const where: any = { organizationId: orgId };

  if (roomId && roomId !== 'all') {
    where.roomId = roomId;
  }

  if (userId && userId !== 'all') {
    where.userId = userId;
  }

  if (status && status !== 'all') {
    where.status = status;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    where.date = { gte: startOfDay, lte: endOfDay };
  } else if (from || to) {
    where.date = {};
    if (from) {
      const f = new Date(from);
      f.setHours(0, 0, 0, 0);
      where.date.gte = f;
    }
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      where.date.lte = t;
    }
  }

  const bookings = await prisma.roomBooking.findMany({
    where,
    include: {
      room: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
          avatar: true,
          department: { select: { id: true, name: true } },
        },
      },
      bookedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [
      { date: 'desc' },
      { startTime: 'asc' },
    ],
  });

  res.status(200).json({
    success: true,
    data: bookings,
  });
});

// Specifically for the logged-in user to see their bookings on their dashboard
export const getMyRoomBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const userId = req.user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await prisma.roomBooking.findMany({
    where: {
      organizationId: orgId,
      userId,
      date: { gte: today },
      status: { not: 'cancelled' },
    },
    include: {
      room: true,
      bookedBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
  });

  res.status(200).json({
    success: true,
    data: bookings,
  });
});

export const createRoomBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;
  const {
    roomId,
    userId,
    title,
    description,
    date,
    startTime,
    endTime,
    attendeesCount,
    remarks,
  } = req.body;

  if (!roomId) {
    res.status(400).json({ success: false, message: 'Please select a meeting room' });
    return;
  }
  if (!userId) {
    res.status(400).json({ success: false, message: 'Please select a host / meeting owner user' });
    return;
  }
  if (!title || !title.trim()) {
    res.status(400).json({ success: false, message: 'Meeting title/agenda is required' });
    return;
  }
  if (!date) {
    res.status(400).json({ success: false, message: 'Meeting date is required' });
    return;
  }
  if (!startTime || !endTime) {
    res.status(400).json({ success: false, message: 'Start time and end time are required' });
    return;
  }

  const room = await prisma.meetingRoom.findFirst({
    where: { id: roomId, organizationId: orgId },
  });

  if (!room) {
    res.status(404).json({ success: false, message: 'Selected meeting room does not exist' });
    return;
  }

  if (room.status !== 'active') {
    res.status(400).json({ success: false, message: `Meeting room is currently ${room.status} and cannot be booked.` });
    return;
  }

  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const newStartMinutes = timeToMinutes(startTime);
  const newEndMinutes = timeToMinutes(endTime);

  if (newEndMinutes <= newStartMinutes) {
    res.status(400).json({ success: false, message: 'End time must be after start time' });
    return;
  }

  // Conflict Checking: Check existing bookings for this room on the same day
  const existingBookings = await prisma.roomBooking.findMany({
    where: {
      organizationId: orgId,
      roomId,
      status: { not: 'cancelled' },
      date: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      user: { select: { name: true } },
    },
  });

  for (const b of existingBookings) {
    const existingStart = timeToMinutes(b.startTime);
    const existingEnd = timeToMinutes(b.endTime);

    // Overlap condition: startA < endB && endA > startB
    if (newStartMinutes < existingEnd && newEndMinutes > existingStart) {
      res.status(400).json({
        success: false,
        message: `Conflict detected! ${room.name} is already booked from ${b.startTime} to ${b.endTime} for "${b.title}" (Host: ${b.user?.name || 'Staff'}). Please choose another time or room.`,
      });
      return;
    }
  }

  const booking = await prisma.roomBooking.create({
    data: {
      organizationId: orgId,
      roomId,
      userId,
      bookedById: req.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      date: targetDate,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      attendeesCount: Number(attendeesCount) || 2,
      remarks: remarks?.trim() || null,
      status: 'confirmed',
    },
    include: {
      room: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          designation: true,
        },
      },
      bookedBy: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  // Notify the booked user so it reflects with an alert
  try {
    const formattedDate = targetDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        userId,
        title: `Meeting Room Reserved: ${room.name}`,
        message: `${room.name} (${room.floor || 'Office'}) has been reserved for you on ${formattedDate} from ${startTime} to ${endTime} for "${title}".`,
        type: 'general',
        priority: 'high',
      },
    });
  } catch (e) {
    console.warn('Failed to send room booking notification to user:', e);
  }

  res.status(201).json({
    success: true,
    data: booking,
    message: `Meeting room "${room.name}" booked successfully for ${booking.user?.name}`,
  });
});

export const updateRoomBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const existing = await prisma.roomBooking.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Room booking not found' });
    return;
  }

  const {
    roomId,
    userId,
    title,
    description,
    date,
    startTime,
    endTime,
    attendeesCount,
    status,
    remarks,
  } = req.body;

  const targetRoomId = roomId || existing.roomId;
  const targetDate = date ? new Date(date) : existing.date;
  const targetStartTime = startTime || existing.startTime;
  const targetEndTime = endTime || existing.endTime;

  const newStartMinutes = timeToMinutes(targetStartTime);
  const newEndMinutes = timeToMinutes(targetEndTime);

  if (newEndMinutes <= newStartMinutes) {
    res.status(400).json({ success: false, message: 'End time must be after start time' });
    return;
  }

  // Conflict Checking against other bookings (excluding itself)
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  if (status !== 'cancelled') {
    const conflictingBookings = await prisma.roomBooking.findMany({
      where: {
        organizationId: orgId,
        roomId: targetRoomId,
        id: { not: id },
        status: { not: 'cancelled' },
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        user: { select: { name: true } },
      },
    });

    for (const b of conflictingBookings) {
      const existingStart = timeToMinutes(b.startTime);
      const existingEnd = timeToMinutes(b.endTime);

      if (newStartMinutes < existingEnd && newEndMinutes > existingStart) {
        res.status(400).json({
          success: false,
          message: `Conflict detected! Room is already booked from ${b.startTime} to ${b.endTime} for "${b.title}" (Host: ${b.user?.name || 'Staff'}).`,
        });
        return;
      }
    }
  }

  const data: any = {};
  if (roomId !== undefined) data.roomId = roomId;
  if (userId !== undefined) data.userId = userId;
  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (date !== undefined) data.date = new Date(date);
  if (startTime !== undefined) data.startTime = startTime.trim();
  if (endTime !== undefined) data.endTime = endTime.trim();
  if (attendeesCount !== undefined) data.attendeesCount = Number(attendeesCount) || 2;
  if (status !== undefined) data.status = status;
  if (remarks !== undefined) data.remarks = remarks?.trim() || null;

  const updated = await prisma.roomBooking.update({
    where: { id },
    data,
    include: {
      room: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    data: updated,
    message: 'Booking updated successfully',
  });
});

export const updateBookingStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const orgId = req.user.organizationId;

  const existing = await prisma.roomBooking.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Room booking not found' });
    return;
  }

  const updated = await prisma.roomBooking.update({
    where: { id },
    data: { status },
  });

  res.status(200).json({
    success: true,
    data: updated,
    message: `Booking status updated to ${status}`,
  });
});

export const deleteRoomBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const orgId = req.user.organizationId;

  const existing = await prisma.roomBooking.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Room booking not found' });
    return;
  }

  await prisma.roomBooking.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: 'Room booking cancelled and removed successfully',
  });
});

// ----------------------------------------------------
// 4. OFFICE HOSTS / USERS DROPDOWN LIST
// ----------------------------------------------------

export const getOfficeHosts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.user.organizationId;

  const users = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      status: 'active',
      role: { notIn: ['student', 'superadmin'] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      avatar: true,
      department: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.status(200).json({
    success: true,
    data: users,
  });
});

