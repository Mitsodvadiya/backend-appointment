import express from "express";
import {
  getCurrentQueue,
  getQueueDetails,
  callNextToken,
  pauseQueue,
  resumeQueue,
  closeQueue
} from "./queue.controller";

import {
  createToken,
  getTokenStatus,
  completeToken,
  skipToken,
  cancelToken
} from "./token.controller";

const router = express.Router();

// queue
router.get("/current", getCurrentQueue);
router.get("/:queueId", getQueueDetails);
router.post("/call-next", callNextToken);
router.post("/pause", pauseQueue);
router.post("/resume", resumeQueue);
router.post("/close", closeQueue);

// tokens
router.post("/tokens", createToken);
router.get("/tokens/:id", getTokenStatus);
router.post("/tokens/:id/complete", completeToken);
router.post("/tokens/:id/skip", skipToken);
router.post("/tokens/:id/cancel", cancelToken);

export default router;
