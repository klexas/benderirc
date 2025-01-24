import { Router, Request, Response } from 'express';
import { ParsedQs } from 'qs';
import { isLoggedIn, isAdmin } from '../../middleware/auth';
import userService from '../../services/userService';
import bodyParser from 'body-parser';

const router = Router();
router.use(bodyParser.json());

router.get('/', (req: Request<{}, any, any, ParsedQs, Record<string, any>>, res: Response) => {
    // Handle GET request for all users
});

router.get('/:id', isLoggedIn, (req: Request<{}, any, any, ParsedQs, Record<string, any>>, res: Response) => {
    res.send("You are logged in. ");
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

router.delete('/:id', isAdmin, (req, res) => {
    // Handle DELETE request to delete a specific user
});

export const userRouter = router;