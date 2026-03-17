import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { getOrCreateQueueSession } from "./queue.service";
import { emitQueueUpdate } from "./queue.socket";

// GET /queue/current
export const getCurrentQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorId = req.query.doctorId as string;
    const clinicId = req.query.clinicId as string;

    const queue = await getOrCreateQueueSession({
      doctorId,
      clinicId
    });

    res.json(queue);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// GET /queue/:queueId
export const getQueueDetails = async (req: Request, res: Response): Promise<void> => {
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
      res.status(404).json({ message: "Queue session not found" });
      return;
    }

    res.json(queue);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /queue/call-next
export const callNextToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const queueId = req.body.queueId as string;
    const userId = req.body.userId as string;

    const existingQueue = await prisma.queueSession.findUnique({ where: { id: queueId } });
    if (!existingQueue) {
      res.status(404).json({ message: "Queue session not found" });
      return;
    }

    const token = await prisma.token.findFirst({
      where: {
        queueId,
        status: "WAITING"
      },
      orderBy: { tokenNumber: "asc" }
    });

    if (!token) {
      res.status(404).json({ message: "No tokens left" });
      return;
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

    res.json({ message: "Token called", tokenNumber: token.tokenNumber });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /queue/pause
export const pauseQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const queueId = req.body.queueId as string;
    const userId = req.body.userId as string;

    const existingQueue = await prisma.queueSession.findUnique({ where: { id: queueId } });
    if (!existingQueue) {
      res.status(404).json({ message: "Queue session not found" });
      return;
    }

    if (existingQueue.doctorId !== userId) {
      res.status(403).json({ message: "Only the designated doctor can pause this queue." });
      return;
    }

    if (existingQueue.status === "CLOSED") {
      res.status(400).json({ message: "Queue is already closed" });
      return;
    }

    await prisma.queueSession.update({
      where: { id: queueId },
      data: { status: "BREAK" }
    });

    console.log(`[Socket Logger] Queue Paused: ${queueId}`);
    await emitQueueUpdate(queueId);

    res.json({ message: "Queue paused successfully" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /queue/resume
export const resumeQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const queueId = req.body.queueId as string;
    const userId = req.body.userId as string;

    const existingQueue = await prisma.queueSession.findUnique({ where: { id: queueId } });
    if (!existingQueue) {
      res.status(404).json({ message: "Queue session not found" });
      return;
    }

    if (existingQueue.doctorId !== userId) {
      res.status(403).json({ message: "Only the designated doctor can resume this queue." });
      return;
    }

    if (existingQueue.status === "CLOSED") {
      res.status(400).json({ message: "Queue is closed and cannot be resumed" });
      return;
    }

    if (existingQueue.status === "ACTIVE") {
      res.status(400).json({ message: "Queue is already active" });
      return;
    }

    await prisma.queueSession.update({
      where: { id: queueId },
      data: { status: "ACTIVE" }
    });

    console.log(`[Socket Logger] Queue Resumed: ${queueId}`);
    await emitQueueUpdate(queueId);

    res.json({ message: "Queue resumed successfully" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /queue/close
export const closeQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const queueId = req.body.queueId as string;
    const userId = req.body.userId as string;

    const existingQueue = await prisma.queueSession.findUnique({ where: { id: queueId } });
    if (!existingQueue) {
      res.status(404).json({ message: "Queue session not found" });
      return;
    }

    if (existingQueue.doctorId !== userId) {
      res.status(403).json({ message: "Only the designated doctor can close this queue." });
      return;
    }

    await prisma.queueSession.update({
      where: { id: queueId },
      data: { status: "CLOSED" }
    });

    console.log(`[Socket Logger] Queue Closed: ${queueId}`);
    await emitQueueUpdate(queueId);

    res.json({ message: "Queue closed" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
