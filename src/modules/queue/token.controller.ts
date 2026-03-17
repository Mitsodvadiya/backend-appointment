import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { getOrCreateQueueSession } from "./queue.service";
import { emitQueueUpdate } from "./queue.socket";

// POST /tokens
export const createToken = async (req: Request, res: Response): Promise<void> => {
  const { doctorId, clinicId, patientId, reason, source } = req.body;

  try {
    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }

    // Check if patient already has an active token
    const existingActiveToken = await prisma.token.findFirst({
      where: {
        visit: {
          patientId: patientId
        },
        status: { in: ["WAITING", "IN_PROGRESS"] }
      }
    });

    if (existingActiveToken) {
      throw new Error("Patient already has an active token and cannot join another queue until it is completed, skipped, or cancelled.");
    }

    const queue = await getOrCreateQueueSession({
      doctorId,
      clinicId
    });

    if (queue.status === "CLOSED") {
      throw new Error("Queue closed");
    }

    // Validate Source
    let validSource = source;
    if (source !== "MOBILE_APP" && source !== "STAFF_PANEL") {
      validSource = "STAFF_PANEL"; // Default
    }

    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.visit.create({
        data: { patientId, doctorId, clinicId, reason }
      });

      const updatedQueue = await tx.queueSession.update({
        where: { id: queue.id },
        data: {
          lastToken: { increment: 1 },
          totalTokens: { increment: 1 }
        }
      });

      const token = await tx.token.create({
        data: {
          tokenNumber: updatedQueue.lastToken,
          queueId: queue.id,
          visitId: visit.id,
          status: "WAITING",
          source: validSource
        }
      });

      return { token, queue: updatedQueue };
    });

    console.log(`[Socket Logger] Token Created: ${result.token.tokenNumber}`);
    await emitQueueUpdate(result.queue.id);

    res.json({
      tokenId: result.token.id,
      tokenNumber: result.token.tokenNumber
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// GET /tokens/:id
export const getTokenStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const token = await prisma.token.findUnique({
      where: { id },
      include: {
        queue: true
      }
    });

    if (!token) {
      res.status(404).json({ message: "Token not found" });
      return;
    }

    const peopleAhead = token.tokenNumber - token.queue.currentToken;

    res.json({
      tokenNumber: token.tokenNumber,
      status: token.status,
      currentToken: token.queue!.currentToken,
      peopleAhead
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /tokens/:id/complete
export const completeToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.body.userId as string;

    const existingToken = await prisma.token.findUnique({ 
      where: { id },
      include: { queue: true }
    });
    if (!existingToken) {
      res.status(404).json({ message: "Token not found" });
      return;
    }

    if (existingToken.status === "COMPLETED") {
      res.status(400).json({ message: "Token is already completed" });
      return;
    }
    if (existingToken.status === "CANCELLED") {
      res.status(400).json({ message: "Token is cancelled and cannot be completed" });
      return;
    }

    // Role Validation: Only the doctor of this queue can complete tokens
    if (existingToken.queue.doctorId !== userId) {
      res.status(403).json({ message: "Only the doctor assigned to this queue can complete tokens." });
      return;
    }

    const token = await prisma.token.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date()
      }
    });

    await prisma.tokenAction.create({
      data: {
        tokenId: id,
        userId,
        action: "COMPLETE"
      }
    });

    console.log(`[Socket Logger] Token Completed: ${existingToken.tokenNumber}`);
    await emitQueueUpdate(token.queueId);

    res.json({ message: "Token completed" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /tokens/:id/skip
export const skipToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.body.userId as string;

    const existingToken = await prisma.token.findUnique({ 
      where: { id },
      include: { queue: true } 
    });
    if (!existingToken) {
      res.status(404).json({ message: "Token not found" });
      return;
    }

    if (existingToken.status === "SKIPPED") {
      res.status(400).json({ message: "Token is already skipped" });
      return;
    }
    if (existingToken.status === "COMPLETED" || existingToken.status === "CANCELLED") {
      res.status(400).json({ message: `Token is ${existingToken.status.toLowerCase()} and cannot be skipped` });
      return;
    }

    // Role Validation: Only the doctor of this queue can skip tokens
    if (existingToken.queue.doctorId !== userId) {
      res.status(403).json({ message: "Only the doctor assigned to this queue can skip tokens." });
      return;
    }

    const token = await prisma.token.update({
      where: { id },
      data: { status: "SKIPPED" }
    });

    await prisma.tokenAction.create({
      data: {
        tokenId: id,
        userId,
        action: "SKIP"
      }
    });

    console.log(`[Socket Logger] Token Skipped: ${existingToken.tokenNumber}`);
    await emitQueueUpdate(token.queueId);

    res.json({ message: "Token skipped" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// POST /tokens/:id/cancel
export const cancelToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.body.userId as string;

    const existingToken = await prisma.token.findUnique({ 
      where: { id },
      include: { queue: true, visit: true } 
    });
    if (!existingToken) {
      res.status(404).json({ message: "Token not found" });
      return;
    }

    if (existingToken.status === "CANCELLED") {
      res.status(400).json({ message: "Token is already cancelled" });
      return;
    }
    if (existingToken.status === "COMPLETED") {
      res.status(400).json({ message: "Token is completed and cannot be cancelled" });
      return;
    }

    // Role Validation: Only doctor or patient can cancel
    if (existingToken.queue.doctorId !== userId && existingToken.visit.patientId !== userId) {
      res.status(403).json({ message: "Only the doctor or the patient can cancel this token." });
      return;
    }

    const token = await prisma.token.update({
      where: { id },
      data: { status: "CANCELLED" }
    });

    await prisma.tokenAction.create({
      data: {
        tokenId: id,
        userId,
        action: "CANCEL"
      }
    });

    console.log(`[Socket Logger] Token Cancelled: ${existingToken.tokenNumber}`);
    await emitQueueUpdate(token.queueId);

    res.json({ message: "Token cancelled" });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
