import { Request, Response } from "express";
import { prisma } from "../../prisma/client";
import { getOrCreateQueueSession } from "./queue.service";
import { emitQueueUpdate } from "./queue.socket";
import { sendSuccess, sendError } from "../../common/utils/response.util";

// POST /tokens
export const createToken = async (req: Request, res: Response): Promise<any> => {
  const { doctorId, clinicId, patientId, reason, source } = req.body;

  try {
    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return sendError(res, 404, "Patient not found");
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

    return sendSuccess(res, 200, "Token created successfully", {
      tokenId: result.token.id,
      tokenNumber: result.token.tokenNumber
    });
  } catch (err: any) {
    return sendError(res, 400, "Failed to create token", err);
  }
};

// GET /tokens/:id
export const getTokenStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    const token = await prisma.token.findUnique({
      where: { id },
      include: {
        queue: true
      }
    });

    if (!token) {
      return sendError(res, 404, "Token not found");
    }

    const peopleAhead = token.tokenNumber - token.queue.currentToken;

    return sendSuccess(res, 200, "Token status retrieved successfully", {
      tokenNumber: token.tokenNumber,
      status: token.status,
      currentToken: token.queue!.currentToken,
      peopleAhead
    });
  } catch (err: any) {
    return sendError(res, 400, "Failed to retrieve token status", err);
  }
};

// POST /tokens/:id/complete
export const completeToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const userId = req.body.userId as string;

    const existingToken = await prisma.token.findUnique({ 
      where: { id },
      include: { queue: true }
    });
    if (!existingToken) {
      return sendError(res, 404, "Token not found");
    }

    if (existingToken.status === "COMPLETED") {
      return sendError(res, 400, "Token is already completed");
    }
    if (existingToken.status === "CANCELLED") {
      return sendError(res, 400, "Token is cancelled and cannot be completed");
    }

    // Role Validation: Only the doctor of this queue can complete tokens
    if (existingToken.queue.doctorId !== userId) {
      return sendError(res, 403, "Only the doctor assigned to this queue can complete tokens.");
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

    return sendSuccess(res, 200, "Token completed");
  } catch (err: any) {
    return sendError(res, 400, "Failed to complete token", err);
  }
};

// POST /tokens/:id/skip
export const skipToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const userId = req.body.userId as string;

    const existingToken = await prisma.token.findUnique({ 
      where: { id },
      include: { queue: true } 
    });
    if (!existingToken) {
      return sendError(res, 404, "Token not found");
    }

    if (existingToken.status === "SKIPPED") {
      return sendError(res, 400, "Token is already skipped");
    }
    if (existingToken.status === "COMPLETED" || existingToken.status === "CANCELLED") {
      return sendError(res, 400, `Token is ${existingToken.status.toLowerCase()} and cannot be skipped`);
    }

    // Role Validation: Only the doctor of this queue can skip tokens
    if (existingToken.queue.doctorId !== userId) {
      return sendError(res, 403, "Only the doctor assigned to this queue can skip tokens.");
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

    return sendSuccess(res, 200, "Token skipped");
  } catch (err: any) {
    return sendError(res, 400, "Failed to skip token", err);
  }
};

// POST /tokens/:id/cancel
export const cancelToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const userId = req.body.userId as string;

    const existingToken = await prisma.token.findUnique({ 
      where: { id },
      include: { queue: true, visit: true } 
    });
    if (!existingToken) {
      return sendError(res, 404, "Token not found");
    }

    if (existingToken.status === "CANCELLED") {
      return sendError(res, 400, "Token is already cancelled");
    }
    if (existingToken.status === "COMPLETED") {
      return sendError(res, 400, "Token is completed and cannot be cancelled");
    }

    // Role Validation: Only doctor or patient can cancel
    if (existingToken.queue.doctorId !== userId && existingToken.visit.patientId !== userId) {
      return sendError(res, 403, "Only the doctor or the patient can cancel this token.");
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

    return sendSuccess(res, 200, "Token cancelled");
  } catch (err: any) {
    return sendError(res, 400, "Failed to cancel token", err);
  }
};
