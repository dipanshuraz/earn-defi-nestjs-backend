-- Add WITHDRAWING and FAILED position statuses for assignment lifecycle tracking
ALTER TYPE "PositionStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWING';
ALTER TYPE "PositionStatus" ADD VALUE IF NOT EXISTS 'FAILED';
