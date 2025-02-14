console.log('Auth Router loaded');

import express, {Request, Response, Router} from "express";
import {AuthController} from "@controllers/Auth.Controller";

export class AuthRouter {
    private authController: AuthController;
    private expressRouter: Router;

    constructor(AuthController: AuthController) {
        this.authController = AuthController;
        this.expressRouter = express.Router();
    }

    public router = () => {
        this.expressRouter.post('/login', async (req: Request, res: Response) => {
            await this.authController.login(req, res);
        });

        this.expressRouter.post('/register', async (req: Request, res: Response) => {
            await this.authController.register(req, res);
        });

        this.expressRouter.get('/twitch', async (req: Request, res: Response) => {
            await this.authController.twitchAuth(req, res);
        });

        this.expressRouter.get('/youtube', async (req: Request, res: Response) => {
            await this.authController.youtubeAuth(req, res);
        });

        this.expressRouter.get('/youtube-redirect', async (req: Request, res: Response) => {
            await this.authController.handleYoutubeRedirect(req, res);
        });

        this.expressRouter.get('/twitch-redirect', async (req: Request, res: Response) => {
            await this.authController.handleTwitchRedirect(req, res);
        });

        this.expressRouter.get('/check-token', async (req: Request, res: Response) => {
            await this.authController.checkAuth(req, res);
        });

        return this.expressRouter;
    }

}