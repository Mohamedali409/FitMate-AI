import { Request, Response, NextFunction } from 'express';
import { usersService, UsersService } from './users.service.js';
import {
  UpdateProfileInput,
  CompleteOnboardingInput,
  UpdatePreferencesInput,
  DeleteAccountInput,
  RecordConsentInput,
} from './dto/users.dto.js';
import { ApiResponse } from '../../shared/types/api.types.js';

export class UsersController {
  constructor(private service: UsersService = usersService) {}

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.service.getProfile(userId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const input = req.body as UpdateProfileInput;
      const result = await this.service.updateProfile(userId, input);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  completeOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const input = req.body as CompleteOnboardingInput;
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const result = await this.service.completeOnboarding(userId, input, ip, userAgent);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const input = req.body as UpdatePreferencesInput;
      const result = await this.service.updatePreferences(userId, input);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const input = req.body as DeleteAccountInput;
      const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

      const result = await this.service.initiateAccountDeletion(userId, input, idempotencyKey);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(202).json(response); // 202 Accepted
    } catch (error) {
      next(error);
    }
  };

  getDeletionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.service.getDeletionStatus(userId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getConsents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await this.service.getConsents(userId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  recordConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const input = req.body as RecordConsentInput;
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const result = await this.service.recordConsent(userId, input, ip, userAgent);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

export const usersController = new UsersController();

