import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/env';

declare global {
  var io: any;
}

const startServer = async () => {
  try {
    const server = http.createServer(app);
    
    // Initialize Socket.io with CORS
    const io = new Server(server, {
      cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] } 
    });
    
    // Make `io` globally available
    global.io = io; 
    
    // Listen for client connections
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      // Clients will emit this when they open a specific doctor's queue dashboard
      socket.on('join_queue', (queueId: string) => {
        socket.join(queueId);
        console.log(`Socket ${socket.id} joined queue room: ${queueId}`);
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
    
    server.listen(env.port, () => {
      console.log(`Server is running with Socket.io on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
