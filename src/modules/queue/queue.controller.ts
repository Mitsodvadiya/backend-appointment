import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { getOrCreateQueueSession } from "./queue.service";
import { emitQueueUpdate } from "./queue.socket";
import { sendSuccess, sendError } from "../../common/utils/response.util";

// GET /queue/current
export const getCurrentQueue = async (req: Request, res: Response): Promise<any> => {
  try {
    const doctorId = req.query.doctorId as string;
    const clinicId = req.query.clinicId as string;

    const queue = await getOrCreateQueueSession({
      doctorId,
      clinicId
    });

    return sendSuccess(res, 200, "Current queue retrieved successfully", queue);
  } catch (err: any) {
    return sendError(res, 400, "Failed to retrieve current queue", err);
  }
};

// GET /queue/:queueId
export const getQueueDetails = async (req: Request, res: Response): Promise<any> => {
  try {
    const queueId = req.params.queueId as string;

    const queue = await prisma.queueSession.findUnique({
      where: { id: queueId },
      include: {
        tokens: {
          where: {
            status: { in: ["WAITING", "IN_PROGRESS"] }
          },
          include: {
            visit: {
              include: {
                patient: true
              }
            }
          },
          orderBy: { tokenNumber: "asc" }
        }
      }
    });

    if (!queue) {
      return sendError(res, 404, "Queue session not found");
    }

    return sendSuccess(res, 200, "Queue details retrieved successfully", queue);
  } catch (err: any) {
    return sendError(res, 400, "Failed to retrieve queue details", err);
  }
};

// POST /queue/call-next
export const callNextToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const queueId = req.body.queueId as string;
    const userId = req.body.userId as string;

    const existingQueue = await prisma.queueSession.findUnique({ where: { id: queueId } });
    if (!existingQueue) {
      return sendError(res, 404, "Queue session not found");
    }

    const token = await prisma.token.findFirst({
      where: {
        queueId,
        status: "WAITING"
      },
      orderBy: { tokenNumber: "asc" }
    });

    if (!token) {
      return sendError(res, 404, "No tokens left");
    }

    await prisma.$transaction(async (tx) => {
      await tx.token.update({
        where: { id: token.id },
        data: {
          status: "IN_PROGRESS",
          calledAt: new Date()
        }
      });

      await tx.queueSession.update({
        where: { id: queueId },
        data: {
          currentToken: token.tokenNumber
        }
      });

      await tx.tokenAction.create({
        data: {
          tokenId: token.id,
          userId,
          action: "CALL"
        }
      });
    });

    console.log(`[Socket Logger] Token Called Next: ${token.tokenNumber}`);
    await emitQueueUpdate(queueId);

    return sendSuccess(res, 200, "Token called", { tokenNumber: token.tokenNumber });
  } catch (err: any) {
    return sendError(res, 400, "Failed to call next token", err);
  }
};

// POST /queue/pause
export const pauseQueue = async (req: Request, res: Response): Promise<any> => {
  try {
    const queueId = req.body.queueId as string;
    const userId = req.body.userId as string;

    const existingQueue = await prisma.queueSession.findUnique({ where: { id: queueId } });
    if (!existingQueue) {
      return sendError(res, 404, "Queue session not found");
    }

    if (existingQueue.doctorId !== userId) {
      return sendError(res, 403, "Only the designated doctor can pause this queue.");
    }

    if (existingQueue.status === "CLOSED") {
      return sendError(res, 400, "Queue is already closed");
    }

    await prisma.queueSession.update({
      where: { id: queueId },
      data: { status: "BREAK" }
    });

    console.log(`[Socket Logger] Queue Paused: ${queueId}`);
    await emitQueueUpdate(queueId);

    return sendSuccess(res, 200, "Queue paused successfully");
  } catch (err: any) {
    return sendError(res, 400, "Failed to pause queue", err);
  }
};

// POST /queue/resume
export const resumeQueue = async (req: Request, res: Response): Promise<any> => {
  try {
    const queueId = req.body.queueId as string;
    const userId = req.body.userId as string;

    const existingQueue = await prisma.queueSession.findUnique({ where: { id: queueId } });
    if (!existingQueue) {
      return sendError(res, 404, "Queue session not found");
    }

    if (existingQueue.doctorId !== userId) {
      return sendError(res, 403, "Only the designated doctor can resume this queue.");
    }

    if (existingQueue.status === "CLOSED") {
      return sendError(res, 400, "Queue is closed and cannot be resumed");
    }

    if (existingQueue.status === "ACTIVE") {
      return sendError(res, 400, "Queue is already active");
    }

    await prisma.queueSession.update({
      where: { id: queueId },
      data: { status: "ACTIVE" }
    });

    console.log(`[Socket Logger] Queue Resumed: ${queueId}`);
    await emitQueueUpdate(queueId);

    return sendSuccess(res, 200, "Queue resumed successfully");
  } catch (err: any) {
    return sendError(res, 400, "Failed to resume queue", err);
  }
};

// POST /queue/close
export const closeQueue = async (req: Request, res: Response): Promise<any> => {
  try {
    const queueId = req.body.queueId as string;
    const userId = req.body.userId as string;

    const existingQueue = await prisma.queueSession.findUnique({ where: { id: queueId } });
    if (!existingQueue) {
      return sendError(res, 404, "Queue session not found");
    }

    if (existingQueue.doctorId !== userId) {
      return sendError(res, 403, "Only the designated doctor can close this queue.");
    }

    await prisma.queueSession.update({
      where: { id: queueId },
      data: { status: "CLOSED" }
    });

    console.log(`[Socket Logger] Queue Closed: ${queueId}`);
    await emitQueueUpdate(queueId);

    return sendSuccess(res, 200, "Queue closed");
  } catch (err: any) {
    return sendError(res, 400, "Failed to close queue", err);
  }
};
