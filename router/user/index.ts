import { Router, Request, Response } from 'express';
import { ParsedQs } from 'qs';
import { isLoggedIn, isAdmin } from '../../middleware/auth';
import userService from '../../services/userService';
import bodyParser from 'body-parser';
import User from '../../models/user'; // Import User model
import { IIrcServer } from '../../models/user'; // Import IIrcServer interface

const router = Router();
router.use(bodyParser.json());

// Existing routes

// Specific routes like '/servers' should come BEFORE parameterized routes like '/:id'
// GET /api/user/servers - Retrieve all IRC server configurations for the authenticated user
router.get('/servers', isLoggedIn, async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.ircServers || []);
    } catch (error) {
        console.error('Error fetching IRC servers:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/user/servers - Add a new IRC server configuration
router.post('/servers', isLoggedIn, async (req: Request<{}, any, IIrcServer, ParsedQs, Record<string, any>>, res: Response) => {
    try {
        const userId = req.user._id;
        const serverConfig: IIrcServer = req.body;

        // Basic validation
        if (!serverConfig.name || !serverConfig.host || !serverConfig.port || !serverConfig.nick) {
            return res.status(400).json({ message: 'Missing required fields (name, host, port, nick)' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.ircServers) {
            user.ircServers = [];
        }

        // Check for duplicate server name
        if (user.ircServers.find(server => server.name === serverConfig.name)) {
            return res.status(400).json({ message: `Server with name '${serverConfig.name}' already exists` });
        }

        user.ircServers.push(serverConfig);
        await user.save();
        res.status(201).json(serverConfig);
    } catch (error) {
        console.error('Error adding IRC server:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/user/servers/:serverName - Update an existing IRC server configuration
router.put('/servers/:serverName', isLoggedIn, async (req: Request<{serverName: string}, any, IIrcServer, ParsedQs, Record<string, any>>, res: Response) => {
    try {
        const userId = req.user._id;
        const serverNameToUpdate = req.params.serverName;
        const updatedConfig: IIrcServer = req.body;

        // Basic validation for the body
        if (!updatedConfig.name || !updatedConfig.host || !updatedConfig.port || !updatedConfig.nick) {
            return res.status(400).json({ message: 'Missing required fields (name, host, port, nick) in body' });
        }

        const user = await User.findById(userId);
        if (!user || !user.ircServers) {
            return res.status(404).json({ message: 'User or server list not found' });
        }

        const serverIndex = user.ircServers.findIndex(server => server.name === serverNameToUpdate);
        if (serverIndex === -1) {
            return res.status(404).json({ message: `Server with name '${serverNameToUpdate}' not found` });
        }
        
        // If the name is being changed, check for conflicts with other existing server names
        if (updatedConfig.name !== serverNameToUpdate && user.ircServers.find(server => server.name === updatedConfig.name)) {
            return res.status(400).json({ message: `Another server with name '${updatedConfig.name}' already exists.` });
        }

        // Update the server configuration
        user.ircServers[serverIndex] = { ...user.ircServers[serverIndex], ...updatedConfig };
        
        await user.save();
        res.json(user.ircServers[serverIndex]);
    } catch (error) {
        console.error('Error updating IRC server:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/user/servers/:serverName - Delete an IRC server configuration
router.delete('/servers/:serverName', isLoggedIn, async (req: Request<{serverName: string}, any, any, ParsedQs, Record<string, any>>, res: Response) => {
    try {
        const userId = req.user._id;
        const serverNameToDelete = req.params.serverName;

        const user = await User.findById(userId);
        if (!user || !user.ircServers) {
            return res.status(404).json({ message: 'User or server list not found' });
        }

        const initialLength = user.ircServers.length;
        user.ircServers = user.ircServers.filter(server => server.name !== serverNameToDelete);

        if (user.ircServers.length === initialLength) {
            return res.status(404).json({ message: `Server with name '${serverNameToDelete}' not found` });
        }

        await user.save();
        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting IRC server:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// General routes like '/' and '/:id' should come after more specific ones
router.get('/', (req: Request<{}, any, any, ParsedQs, Record<string, any>>, res: Response) => {
    // Handle GET request for all users
    res.status(501).send("Not Implemented");
});

router.get('/:id', isLoggedIn, (req: Request<{id: string}, any, any, ParsedQs, Record<string, any>>, res: Response) => {
    // This route is to get a specific user's details, could be admin only or self
    // For now, let's assume it's for self and uses req.user from isLoggedIn
    if (req.user && req.user._id === req.params.id) {
        res.send(`You are logged in as user ${req.params.id}.`);
    } else {
        // Potentially an admin trying to access or user ID mismatch
        // userService.GetUserById(req.params.id) ...
        res.status(403).send("Forbidden or user not found");
    }
});

router.post('/login', (req: Request<{}, any, any, ParsedQs, Record<string, any>>, res: Response) => {
    userService.Login(req.body, (err, data) => {
        if (err) {
            res.status(401).json("Login failed");
        } else {
            res.status(200).json(data);
        }
    });
});

router.post('/register', (req: Request<{}, any, any, ParsedQs, Record<string, any>>, res: Response) => {
    userService.Register(req.body, (err, data) => {
        if (err) {
            res.status(400).json(err);
        } else {
            res.status(200).json(data);
        }
    });
});

// CRUD operations for user's IRC server configurations are now defined above


router.delete('/:id', isAdmin, (req, res) => {
    // Handle DELETE request to delete a specific user
    res.send("nah uh uh, you didn't say the magic word");
});

export const userRouter = router;