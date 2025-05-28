import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { userRouter } from '../router/user'; // Adjust path as necessary
import User from '../models/user'; // The actual User model
import { IIrcServer } from '../models/user'; // The IIrcServer interface

// Mock the User model

// 1. Define the actual Jest mock functions first.
const mockUserSaveFn = jest.fn().mockResolvedValue(true);
const findByIdUserMockFn = jest.fn();

// 2. Use these functions in the jest.mock factory.
jest.mock('../models/user', () => ({
    __esModule: true, // For ES Module interop
    default: { // Assuming User model is a default export
        findById: findByIdUserMockFn,
        // Mock other static User model methods if your routes use them
    },
}));

// The import of User below this will now get the mocked version.
// No need to import User model itself if we are only using findByIdUserMockFn for assertions.


// Mock the isLoggedIn middleware
jest.mock('../middleware/auth', () => ({
    isLoggedIn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // Attach a mock user to the request
        // The _id should match one of the IDs handled by the User.findById mock
        req.user = { _id: 'mockUserId', username: 'testuser' }; 
        next();
    },
    isAdmin: (req: Request, res: Response, next: NextFunction) => {
        // For now, assume not admin for these tests, or add specific logic if admin routes are tested
        next();
    }
}));

// Define a type for our Express app, or import if already defined elsewhere
let app: Express;

// Define AuthenticatedRequest if not already defined or imported
interface AuthenticatedRequest extends Request {
    user?: {
        _id: string;
        username: string;
        // other user properties
    };
}


beforeAll(() => {
    app = express();
    app.use(bodyParser.json());
    // Mount the userRouter under a specific path, e.g., /api/user
    // This should match how it's mounted in your actual application (main.ts uses /api and router/index.ts uses /user)
    // So the full path for these tests will be /api/user
    app.use('/api/user', userRouter); 
});

describe('User Server Management API (/api/user/servers)', () => {
    // let mockUserSave: jest.SpyInstance; // Not needed here if mockUserSave is globally defined for the mock

    beforeEach(() => {
        // Reset mock function states before each test
        findByIdUserMockFn.mockClear();
        mockUserSaveFn.mockClear();

        // Default mock implementation for User.findById for most tests.
        // This will be called if a specific test doesn't provide its own mockImplementationOnce.
        findByIdUserMockFn.mockImplementation(async (id) => {
            if (id === 'mockUserId') { // Default user for most tests
                return Promise.resolve({
                    _id: 'mockUserId',
                    username: 'mockUser',
                    email: 'mock@example.com',
                    ircServers: [], // Default user has no servers
                    save: mockUserSaveFn, // Use the pre-defined mock save function
                });
            }
            // For other specific user IDs like 'mockUserIdWithServers' or 'nonExistentUserId',
            // tests should use findByIdUserMockFn.mockImplementationOnce(...) to set specific behavior.
            return Promise.resolve(null); // Default to user not found for unspecified IDs
        });
    });

    // Test cases for GET /api/user/servers
    describe('GET /api/user/servers', () => {
        it('should retrieve an empty list of servers for a user with no servers', async () => {
            // Default isLoggedIn provides 'mockUserId', default findByIdMock for 'mockUserId' returns user with empty servers
            const response = await request(app).get('/api/user/servers');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
            expect(findByIdUserMockFn).toHaveBeenCalledWith('mockUserId');
        });

        it('should retrieve the list of servers for a user with servers', async () => {
            // Setup for this specific test:
            // 1. isLoggedIn mock to provide 'mockUserIdWithServers'
            // 2. findByIdMock to return a user with servers for 'mockUserIdWithServers'
            jest.spyOn(require('../middleware/auth'), 'isLoggedIn').mockImplementationOnce(
                (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                    req.user = { _id: 'mockUserIdWithServers', username: 'testuserWithServers' };
                    next();
                }
            );
            findByIdUserMockFn.mockImplementationOnce(async (id) => { // Use mockImplementationOnce for specific case
                 if (id === 'mockUserIdWithServers') {
                    return Promise.resolve({
                        _id: 'mockUserIdWithServers',
                        username: 'testuserWithServers',
                        email: 'mock@example.com',
                        ircServers: [
                            { name: 'TestServer1', host: 'irc.test1.com', port: 6667, nick: 'MockUser1', channels: ['#test1'] },
                            { name: 'TestServer2', host: 'irc.test2.com', port: 6667, nick: 'MockUser2' }
                        ],
                        save: mockUserSaveFn,
                    });
                }
                return Promise.resolve(null);
            });

            const response = await request(app).get('/api/user/servers');
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].name).toBe('TestServer1');
            expect(findByIdUserMockFn).toHaveBeenCalledWith('mockUserIdWithServers');
        });

        it('should return 404 if user not found', async () => {
            // Setup for this specific test:
            // 1. isLoggedIn mock to provide 'nonExistentUserId'
            // 2. findByIdMock (default behavior or explicit mock) should return null for 'nonExistentUserId'
             jest.spyOn(require('../middleware/auth'), 'isLoggedIn').mockImplementationOnce(
                (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                    req.user = { _id: 'nonExistentUserId', username: 'ghost' };
                    next();
                }
            );
             findByIdUserMockFn.mockImplementationOnce(async (id) => { // Ensure it returns null for this ID
                if (id === 'nonExistentUserId') return Promise.resolve(null);
                // Fallback for other IDs if necessary, though not for this test
                return Promise.resolve({ _id: 'someOtherUser', save: mockUserSaveFn, ircServers: [] });
             });

            const response = await request(app).get('/api/user/servers');
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('User not found');
            expect(findByIdUserMockFn).toHaveBeenCalledWith('nonExistentUserId');
        });
    });

    // Test cases for POST /api/user/servers
    describe('POST /api/user/servers', () => {
        const newServer: IIrcServer = {
            name: 'NewTestServer',
            host: 'irc.newtest.com',
            port: 6667,
            nick: 'NewMockUser',
            channels: ['#newchannel']
        };

        it('should add a new server configuration for the user', async () => {
            // Default isLoggedIn provides 'mockUserId', default findByIdMock for 'mockUserId' returns user with empty servers
            const response = await request(app)
                .post('/api/user/servers')
                .send(newServer);
            
            expect(response.status).toBe(201);
            expect(response.body.name).toBe(newServer.name);
            expect(findByIdUserMockFn).toHaveBeenCalledWith('mockUserId');
            expect(mockUserSaveFn).toHaveBeenCalled();
        });

        it('should return 400 if required fields are missing', async () => {
            const incompleteServer = { name: 'TestOnlyName', host: 'irc.incomplete.com' }; // Missing port and nick
            const response = await request(app)
                .post('/api/user/servers')
                .send(incompleteServer);
            
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Missing required fields (name, host, port, nick)');
            expect(mockUserSaveFn).not.toHaveBeenCalled(); // Corrected typo
        });

        it('should return 400 if server name already exists for the user', async () => {
            // Setup for this specific test:
            // 1. isLoggedIn provides 'mockUserId'
            // 2. findByIdUserMockFn for 'mockUserId' returns a user that *already has* newServer
            findByIdUserMockFn.mockImplementationOnce(async (id) => {
                if (id === 'mockUserId') {
                    return Promise.resolve({
                        _id: 'mockUserId',
                        username: 'mockUser',
                        email: 'mock@example.com',
                        ircServers: [newServer], // User already has this server
                        save: mockUserSaveFn,
                    });
                }
                return Promise.resolve(null);
            });

            const response = await request(app)
                .post('/api/user/servers')
                .send(newServer); // Attempting to add the same server again
            
            expect(response.status).toBe(400);
            expect(response.body.message).toBe(`Server with name '${newServer.name}' already exists`);
            expect(mockUserSaveFn).not.toHaveBeenCalled(); // Corrected typo: mockUserSave to mockUserSaveFn
        });

         it('should return 404 if user not found for POST', async () => {
             jest.spyOn(require('../middleware/auth'), 'isLoggedIn').mockImplementationOnce(
                (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                    req.user = { _id: 'nonExistentUserId', username: 'ghost' }; // User ID that findByIdUserMockFn will return null for
                    next();
                }
            );
             findByIdUserMockFn.mockImplementationOnce(async (id) => { // Ensure it returns null for this ID
                if (id === 'nonExistentUserId') return Promise.resolve(null);
                return Promise.resolve({ _id: 'someOtherUser', save: mockUserSaveFn, ircServers: [] });
             });

            const response = await request(app)
                .post('/api/user/servers')
                .send(newServer);
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('User not found');
        });
    });
    
    describe('PUT /api/user/servers/:serverName', () => {
        const serverToUpdateName = 'TestServer1'; 
        const updatedServerData: IIrcServer = {
            name: 'TestServer1Updated', // New name
            host: 'irc.updated.com',
            port: 6697,
            nick: 'UpdatedNick',
            channels: ['#updated', '#new']
        };

        beforeEach(() => {
            // For PUT tests, ensure the default logged-in user ('mockUserId') has the server to be updated.
            // The specific 'isLoggedIn' mock for 'mockUserIdWithServers' is removed from individual tests
            // in favor of setting up 'mockUserId' to have the necessary data.
            jest.spyOn(require('../middleware/auth'), 'isLoggedIn').mockImplementation(
                (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                    req.user = { _id: 'mockUserId', username: 'testuser' }; // Default user for these tests
                    next();
                }
            );

            findByIdUserMockFn.mockImplementation(async (id) => {
                if (id === 'mockUserId') {
                    return Promise.resolve({
                        _id: 'mockUserId',
                        username: 'mockUser',
                        email: 'mock@example.com',
                        ircServers: [ // User has TestServer1 and TestServer2 for conflict checking
                            { name: 'TestServer1', host: 'irc.test1.com', port: 6667, nick: 'MockUser1', channels: ['#test1'] },
                            { name: 'TestServer2', host: 'irc.test2.com', port: 6667, nick: 'MockUser2' }
                        ],
                        save: mockUserSaveFn,
                    });
                }
                return Promise.resolve(null);
            });
        });


        it('should update an existing server configuration', async () => {
            const response = await request(app)
                .put(`/api/user/servers/${serverToUpdateName}`) // Update TestServer1
                .send(updatedServerData);
            
            expect(response.status).toBe(200);
            expect(response.body.name).toBe(updatedServerData.name);
            expect(response.body.host).toBe(updatedServerData.host);
            expect(findByIdUserMockFn).toHaveBeenCalledWith('mockUserId');
            expect(mockUserSaveFn).toHaveBeenCalled();
        });

        it('should return 404 if server to update is not found', async () => {
            const response = await request(app)
                .put('/api/user/servers/NonExistentServerToUpdate')
                .send(updatedServerData);
            
            expect(response.status).toBe(404);
            expect(response.body.message).toBe("Server with name 'NonExistentServerToUpdate' not found");
            expect(mockUserSaveFn).not.toHaveBeenCalled();
        });

        it('should return 400 if required fields are missing in update payload', async () => {
            const incompleteUpdate = { name: 'Incomplete' }; // Missing host, port, nick
            const response = await request(app)
                .put(`/api/user/servers/${serverToUpdateName}`)
                .send(incompleteUpdate);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Missing required fields (name, host, port, nick) in body');
            expect(mockUserSaveFn).not.toHaveBeenCalled();
        });
        
        it('should return 400 if trying to rename to an existing server name (different from target)', async () => {
            const conflictingUpdateData: IIrcServer = {
                 name: 'TestServer2', // This name already exists on the user, and is not TestServer1
                 host: 'irc.conflict.com',
                 port: 6667,
                 nick: 'ConflictNick'
            };
            const response = await request(app)
                .put(`/api/user/servers/${serverToUpdateName}`) // serverToUpdateName is 'TestServer1'
                .send(conflictingUpdateData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Another server with name 'TestServer2' already exists.");
            expect(mockUserSaveFn).not.toHaveBeenCalled();
        });
    });

    describe('DELETE /api/user/servers/:serverName', () => {
        const serverToDeleteName = 'TestServer1';

         beforeEach(() => { // Similar setup as PUT for consistency
            jest.spyOn(require('../middleware/auth'), 'isLoggedIn').mockImplementation(
                (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                    req.user = { _id: 'mockUserId', username: 'testuser' };
                    next();
                }
            );
            findByIdUserMockFn.mockImplementation(async (id) => {
                if (id === 'mockUserId') {
                    return Promise.resolve({
                        _id: 'mockUserId',
                        username: 'mockUser',
                        email: 'mock@example.com',
                        ircServers: [ // User has TestServer1 to delete
                            { name: 'TestServer1', host: 'irc.test1.com', port: 6667, nick: 'MockUser1', channels: ['#test1'] }
                        ],
                        save: mockUserSaveFn,
                    });
                }
                return Promise.resolve(null);
            });
        });

        it('should delete an existing server configuration', async () => {
            const response = await request(app)
                .delete(`/api/user/servers/${serverToDeleteName}`);
            
            expect(response.status).toBe(204); // No content
            expect(findByIdUserMockFn).toHaveBeenCalledWith('mockUserId');
            expect(mockUserSaveFn).toHaveBeenCalled();
        });

        it('should return 404 if server to delete is not found', async () => {
            const response = await request(app)
                .delete('/api/user/servers/NonExistentServerToDelete');
            
            expect(response.status).toBe(404);
            expect(response.body.message).toBe("Server with name 'NonExistentServerToDelete' not found");
            expect(mockUserSaveFn).not.toHaveBeenCalled(); // Corrected typo: mockUserSave to mockUserSaveFn
        });

         it('should return 404 if user not found for delete', async () => {
             jest.spyOn(require('../middleware/auth'), 'isLoggedIn').mockImplementationOnce(
                (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
                    req.user = { _id: 'nonExistentUserId', username: 'ghost' };
                    next();
                }
            );
             findByIdUserMockFn.mockImplementationOnce(async (id) => { // Ensure findById returns null for this ID
                if (id === 'nonExistentUserId') return Promise.resolve(null);
             });

            const response = await request(app)
                .delete(`/api/user/servers/${serverToDeleteName}`); // serverToDeleteName doesn't matter if user not found
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('User or server list not found'); // Route specific message
        });
    });
});

// This dummy test can be removed once actual tests are in place and running.
// describe('Dummy test to ensure Jest runs', () => {
//     it('should pass', () => {
//         expect(true).toBe(true);
//     });
// });
