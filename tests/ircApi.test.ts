import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { ircRouter } from '../router/irc'; // Adjust path as necessary
import { clientService as ircServiceInstance } from '../main'; // Actual IrcService instance (or its mock if we fully mock main)
import { IrcServerConfig } from '../services/ircService';

// Mock the IrcService specifically for its 'connect' method
// We want to spy on 'connect' but let other parts of IrcService (if any were used by router) behave normally.
// However, since clientService is imported directly from main.ts, we need to mock main.ts or parts of it.
// The mock should provide the 'clientService' export with a mocked 'connect' method.

// Define the mock function that will be used by the clientService mock
const actualMockIrcConnectFn = jest.fn().mockImplementation(async (userId: string, serverConfig: IrcServerConfig) => {
    // console.log(`Mock ircService.connect called with userId: ${userId}, server: ${serverConfig.name}`);
    return Promise.resolve();
});

jest.mock('../main', () => {
    // console.log("JEST.MOCK for ../main is executing"); // For debugging
    return {
        // __esModule: true, // Not typically needed for CJS modules when using ts-jest with node environment
        clientService: { // This is the named export from main.ts that ircRouter imports
            connect: actualMockIrcConnectFn, // Use the mock function defined above
            // Mock other methods of IrcService if they are called by ircRouter and need specific mock behavior.
        },
        // Do not include other exports from main.ts unless necessary for the router being tested,
        // to avoid side effects like DB connections or server listening.
    };
});

// Import the mocked clientService to access its mocked methods for assertions
// This import will get the mocked version of clientService due to jest.mock above.
import { clientService as mockedClientServiceInstance } from '../main';

// Mock the isLoggedIn middleware (same as in userApi.test.ts)
jest.mock('../middleware/auth', () => ({
    isLoggedIn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        req.user = { _id: 'mockUserId', username: 'testuser' };
        next();
    },
    isAdmin: (req: Request, res: Response, next: NextFunction) => {
        next();
    }
}));

let app: Express;

// Define AuthenticatedRequest if not already defined or imported
interface AuthenticatedRequest extends Request {
    user?: {
        _id:string;
        username: string;
        // other user properties
    };
}

beforeAll(() => {
    app = express();
    app.use(bodyParser.json());
    // Mount the ircRouter under /api/irc, matching the application setup
    app.use('/api/irc', ircRouter);
});

describe('IRC Connection API (/api/irc/connect)', () => {
    
    beforeEach(() => {
        // Clear mock calls before each test
        jest.clearAllMocks();
    });

    const validServerConfig: IrcServerConfig = {
        name: 'TestServer',
        host: 'irc.test.com',
        port: 6667,
        nick: 'TestNick',
        channels: ['#testchannel']
    };

    it('should successfully initiate an IRC connection with valid server config', async () => {
        const response = await request(app)
            .post('/api/irc/connect')
            .send(validServerConfig);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('Connection to TestServer initiated');
        expect(response.body.nick).toBe(validServerConfig.nick);
        expect(response.body.channels).toEqual(validServerConfig.channels);

        // Verify that the mocked ircService.connect was called correctly
        // Use actualMockIrcConnectFn directly for assertion as it's the same jest.fn() instance
        expect(actualMockIrcConnectFn).toHaveBeenCalledTimes(1);
        expect(actualMockIrcConnectFn).toHaveBeenCalledWith('mockUserId', validServerConfig);
    });

    it('should return 400 if server configuration is missing required fields (e.g., name)', async () => {
        const invalidConfig = { ...validServerConfig, name: undefined };
        const response = await request(app)
            .post('/api/irc/connect')
            .send(invalidConfig);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid server configuration provided. Required fields: name, host, port, nick.');
        expect(actualMockIrcConnectFn).not.toHaveBeenCalled();
    });
    
    it('should return 400 if server configuration is missing required fields (e.g., host)', async () => {
        const invalidConfig = { ...validServerConfig, host: undefined };
        const response = await request(app)
            .post('/api/irc/connect')
            .send(invalidConfig);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid server configuration provided. Required fields: name, host, port, nick.');
        expect(actualMockIrcConnectFn).not.toHaveBeenCalled();
    });

    it('should return 400 if server configuration is missing required fields (e.g., port)', async () => {
        const invalidConfig = { ...validServerConfig, port: undefined };
        const response = await request(app)
            .post('/api/irc/connect')
            .send(invalidConfig);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid server configuration provided. Required fields: name, host, port, nick.');
        expect(actualMockIrcConnectFn).not.toHaveBeenCalled();
    });
    
    it('should return 400 if server configuration is missing required fields (e.g., nick)', async () => {
        const invalidConfig = { ...validServerConfig, nick: undefined };
        const response = await request(app)
            .post('/api/irc/connect')
            .send(invalidConfig);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid server configuration provided. Required fields: name, host, port, nick.');
        expect(actualMockIrcConnectFn).not.toHaveBeenCalled();
    });

    it('should handle cases where channels are not provided (optional field)', async () => {
        const configWithoutChannels = { ...validServerConfig };
        delete configWithoutChannels.channels; // Remove optional channels

        const response = await request(app)
            .post('/api/irc/connect')
            .send(configWithoutChannels);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('Connection to TestServer initiated');
        expect(response.body.nick).toBe(configWithoutChannels.nick);
        expect(response.body.channels).toEqual([]); // Expect empty array if not provided

        expect(actualMockIrcConnectFn).toHaveBeenCalledTimes(1);
        expect(actualMockIrcConnectFn).toHaveBeenCalledWith('mockUserId', expect.objectContaining({
            ...configWithoutChannels,
            // channels: [] // The route adds this default if undefined
        }));
    });
    
    // This test assumes isLoggedIn correctly populates req.user._id
    // If isLoggedIn mock fails or req.user is not set, the route should ideally return 401 or relevant error
    // The current route implementation has a check for !userId, but it's after isLoggedIn.
    // A more direct test for isLoggedIn failing would require a different mock setup for auth.
});
