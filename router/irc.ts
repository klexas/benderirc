import { Router, Request, Response } from 'express';
import { isLoggedIn } from '../middleware/auth'; // Adjust path as needed
import { IrcServerConfig } from '../services/ircService'; // Adjust path as needed
import { clientService as ircService } from '../main'; // Corrected import path and aliased

const router = Router();

// Ensure this matches or is compatible with the global Express.Request augmentation
interface AuthenticatedRequest extends Request {
    user?: { // req.user is populated by isLoggedIn middleware
        _id: string;
        username: string; // Ensure this is present if your global type expects it
        // other user properties
    };
}

router.post('/connect', isLoggedIn, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(400).json({ message: 'User ID not found in token.' });
        }

        const serverConfig: IrcServerConfig = req.body;

        // Basic validation for serverConfig
        if (!serverConfig || !serverConfig.name || !serverConfig.host || !serverConfig.port || !serverConfig.nick) {
            return res.status(400).json({ message: 'Invalid server configuration provided. Required fields: name, host, port, nick.' });
        }
        
        // Assuming ircService (aliased clientService) is available
        if (!ircService) {
            console.error('IrcService (clientService from main) not available in router/irc.ts');
            return res.status(500).json({ message: 'IRC Service is not configured on the server.' });
        }

        // The actual connection is asynchronous and handled by IrcService.
        // We're just initiating it here.
        await ircService.connect(userId, serverConfig); // Use the aliased ircService
        
        // Respond with initial data that might be useful for the client UI
        res.status(200).json({ 
            message: `Connection to ${serverConfig.name} initiated for user ${userId}.`,
            nick: serverConfig.nick,
            channels: serverConfig.channels || [] // Channels to auto-join
        });

    } catch (error) {
        console.error('Error in /api/irc/connect:', error);
        // Check if error is an object and has a message property
        const message = (error instanceof Error) ? error.message : 'An unexpected error occurred.';
        res.status(500).json({ message: 'Failed to initiate IRC connection.', error: message });
    }
});

export const ircRouter = router;
