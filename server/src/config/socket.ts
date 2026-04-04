import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initializeSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5194',
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`✅ Socket client connected: ${socket.id}`);

    // Join organization room
    socket.on('join-org', (organizationId: string) => {
      socket.join(`org-${organizationId}`);
      console.log(`User joined org room: org-${organizationId}`);
    });

    // Join role room
    socket.on('join-role', (data: { organizationId: string; role: string }) => {
      const roomName = `org-${data.organizationId}-role-${data.role}`;
      socket.join(roomName);
      console.log(`User joined role room: ${roomName}`);
    });

    // Join department room
    socket.on('join-dept', (data: { organizationId: string; departmentId: string }) => {
      const roomName = `org-${data.organizationId}-dept-${data.departmentId}`;
      socket.join(roomName);
      console.log(`User joined dept room: ${roomName}`);
    });

    // Join user-specific room
    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`User joined personal room: user-${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

// Helper functions to emit events
export const emitToOrganization = (organizationId: string, event: string, data: any) => {
  if (io) {
    io.to(`org-${organizationId}`).emit(event, data);
  }
};

export const emitToRole = (organizationId: string, role: string, event: string, data: any) => {
  if (io) {
    io.to(`org-${organizationId}-role-${role}`).emit(event, data);
  }
};

export const emitToDepartment = (
  organizationId: string,
  departmentId: string,
  event: string,
  data: any
) => {
  if (io) {
    io.to(`org-${organizationId}-dept-${departmentId}`).emit(event, data);
  }
};

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
  }
};
