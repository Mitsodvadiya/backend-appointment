import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  statusCode: number,
  message: string,
  data?: any
): Response => {
  return res.status(statusCode).json({
    status: statusCode,
    message,
    data: data !== undefined ? data : null,
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: any
): Response => {
  return res.status(statusCode).json({
    status: statusCode,
    message,
    error: error?.message || error || null,
  });
};
