/**
 * Socket.IO or WebSocket emit events
 * Expected events from client:
 * - join_queue
 * - queue_update (main)
 * - join_token (optional)
 */

declare global {
  var io: any;
}

export const emitQueueUpdate = async (queueId: string) => {
  if (global.io) {
    // Broadcast to everyone currently viewing this specific queue
    global.io.to(queueId).emit('queue_updated', { queueId });
    console.log(`[Socket] Broadcasted queue_updated for session ${queueId}`);
  }
};
