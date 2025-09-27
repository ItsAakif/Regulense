const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://192.168.1.3:3000", "http://192.168.1.3:3001", "http://10.230.47.134:3000", "http://10.230.47.134:3001", "http://172.27.16.1:3000", "http://172.27.16.1:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Enable CORS for Express
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://192.168.1.3:3000", "http://192.168.1.3:3001", "http://10.230.47.134:3000", "http://10.230.47.134:3001", "http://172.27.16.1:3000", "http://172.27.16.1:3001"],
  credentials: true
}));

app.use(express.json());

// Store active sessions with enhanced tracking
const sessions = new Map();
const sessionHeartbeats = new Map();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeSessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle session creation (from desktop)
  socket.on('create-session', ({ sessionId }) => {
    console.log(`Creating/restoring session: ${sessionId}`);
    
    // Check if session already exists and update it
    const existingSession = sessions.get(sessionId);
    if (existingSession) {
      console.log(`Updating existing session: ${sessionId}`);
      existingSession.desktop = socket.id;
      existingSession.lastActivity = new Date();
    } else {
      sessions.set(sessionId, {
        id: sessionId,
        desktop: socket.id,
        mobile: null,
        created: new Date(),
        status: 'waiting',
        lastActivity: new Date()
      });
    }
    
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.clientType = 'desktop';
    sessionHeartbeats.set(sessionId, new Date());
    
    console.log(`Session ${sessionId} created, waiting for mobile connection`);
  });

  // Handle mobile joining session
  socket.on('join-session', ({ sessionId, type }) => {
    console.log(`${type} client attempting to join session: ${sessionId}`);
    
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit('session-not-found');
      console.log(`Session ${sessionId} not found`);
      return;
    }

    if (type === 'mobile') {
      // Disconnect previous mobile if exists
      if (session.mobile && session.mobile !== socket.id) {
        const existingSockets = io.sockets.sockets;
        for (const [id, existingSocket] of existingSockets) {
          if (id === session.mobile) {
            existingSocket.emit('session-replaced');
            existingSocket.disconnect();
            break;
          }
        }
      }
      
      session.mobile = socket.id;
      session.status = 'connected';
      session.lastActivity = new Date();
      
      socket.join(sessionId);
      socket.sessionId = sessionId;
      socket.clientType = 'mobile';
      sessionHeartbeats.set(sessionId, new Date());
      
      // Notify both clients
      socket.emit('session-joined');
      socket.to(session.desktop).emit('mobile-connected');
      
      console.log(`Mobile client joined session: ${sessionId}`);
    }
  });

  // Handle WebRTC offer (from mobile to desktop)
  socket.on('offer', ({ sessionId, offer }) => {
    console.log(`Relaying offer for session: ${sessionId}`);
    const session = sessions.get(sessionId);
    
    if (session && session.desktop) {
      socket.to(session.desktop).emit('offer', offer);
    }
  });

  // Handle WebRTC answer (from desktop to mobile)
  socket.on('answer', ({ sessionId, answer }) => {
    console.log(`Relaying answer for session: ${sessionId}`);
    const session = sessions.get(sessionId);
    
    if (session && session.mobile) {
      socket.to(session.mobile).emit('answer', answer);
    }
  });

  // Handle ICE candidates
  socket.on('ice-candidate', ({ sessionId, candidate }) => {
    console.log(`Relaying ICE candidate for session: ${sessionId}`);
    const session = sessions.get(sessionId);
    
    if (session) {
      // Relay to the other client in the session
      if (socket.clientType === 'mobile' && session.desktop) {
        socket.to(session.desktop).emit('ice-candidate', candidate);
      } else if (socket.clientType === 'desktop' && session.mobile) {
        socket.to(session.mobile).emit('ice-candidate', candidate);
      }
    }
  });

  // Handle mobile disconnect
  socket.on('mobile-disconnect', ({ sessionId }) => {
    console.log(`Mobile disconnecting from session: ${sessionId}`);
    handleDisconnection(socket, sessionId);
  });

  // Handle desktop disconnect
  socket.on('disconnect-mobile', ({ sessionId }) => {
    console.log(`Desktop requesting mobile disconnect for session: ${sessionId}`);
    const session = sessions.get(sessionId);
    
    if (session && session.mobile) {
      socket.to(session.mobile).emit('session-ended');
    }
    
    handleDisconnection(socket, sessionId);
  });

  // Handle heartbeat for session persistence
  socket.on('heartbeat', ({ sessionId }) => {
    if (sessionId) {
      sessionHeartbeats.set(sessionId, new Date());
      const session = sessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
      }
    }
  });
  
  // Handle client disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    
    if (socket.sessionId) {
      handleDisconnection(socket, socket.sessionId);
    }
  });

  // Helper function to handle disconnections
  function handleDisconnection(socket, sessionId) {
    const session = sessions.get(sessionId);
    
    if (session) {
      if (socket.clientType === 'mobile') {
        // Mobile disconnected
        session.mobile = null;
        session.status = 'waiting';
        session.lastActivity = new Date();
        
        if (session.desktop) {
          socket.to(session.desktop).emit('mobile-disconnected');
        }
      } else if (socket.clientType === 'desktop') {
        // Desktop disconnected - don't delete session immediately, allow for reconnection
        session.desktop = null;
        session.lastActivity = new Date();
        
        if (session.mobile) {
          socket.to(session.mobile).emit('desktop-disconnected');
        }
        
        // Set timeout to delete session if desktop doesn't reconnect
        setTimeout(() => {
          const currentSession = sessions.get(sessionId);
          if (currentSession && !currentSession.desktop) {
            console.log(`Cleaning up abandoned session: ${sessionId}`);
            if (currentSession.mobile) {
              const existingSockets = io.sockets.sockets;
              for (const [id, existingSocket] of existingSockets) {
                if (id === currentSession.mobile) {
                  existingSocket.emit('session-expired');
                  existingSocket.disconnect();
                  break;
                }
              }
            }
            sessions.delete(sessionId);
            sessionHeartbeats.delete(sessionId);
          }
        }, 30000); // 30 seconds grace period
      }
    }
  }
});

// Enhanced session cleanup with heartbeat monitoring
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  for (const [sessionId, session] of sessions.entries()) {
    const lastHeartbeat = sessionHeartbeats.get(sessionId);
    const shouldCleanup = 
      session.created < oneHourAgo || 
      (lastHeartbeat && lastHeartbeat < fiveMinutesAgo) ||
      (!session.desktop && !session.mobile);
      
    if (shouldCleanup) {
      console.log(`Cleaning up inactive session: ${sessionId}`);
      const existingSockets = io.sockets.sockets;
      
      if (session.desktop) {
        for (const [id, socket] of existingSockets) {
          if (id === session.desktop) {
            socket.emit('session-expired');
            socket.disconnect();
            break;
          }
        }
      }
      if (session.mobile) {
        for (const [id, socket] of existingSockets) {
          if (id === session.mobile) {
            socket.emit('session-expired');
            socket.disconnect();
            break;
          }
        }
      }
      sessions.delete(sessionId);
      sessionHeartbeats.delete(sessionId);
    }
  }
}, 2 * 60 * 1000); // Check every 2 minutes

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
  console.log(`📱 Mobile clients can connect to: http://localhost:${PORT}`);
  console.log(`🌐 Network clients can connect to: http://10.230.47.134:${PORT}`);
  console.log(`🖥️  Desktop clients can connect to: http://localhost:${PORT}`);
  console.log(`❤️  Health check available at: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});