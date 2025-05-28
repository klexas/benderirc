// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as express from 'express';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        _id: string;
        username: string;
        // Add other properties that your isLoggedIn middleware might attach to req.user
      };
      // You can add other custom properties to Request here if needed elsewhere
      // For example, if IrcService instance was attached to req:
      // ircService?: import('../../services/ircService').default; 
    }
  }
}

// If this file is treated as a module (e.g., due to other imports/exports),
// you might need to add an empty export to make it an augmentation.
// However, for global namespace augmentation, this is often not needed if it's a .d.ts file.
export {};
