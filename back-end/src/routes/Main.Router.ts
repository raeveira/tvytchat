console.log('Main Router loaded');

import {MainController} from "@/controllers/Main.Controller";
import express, {Response, Request, Router} from 'express';
import {AuthRouter} from "@routes/Auth.Router";

export class MainRouter {
    private mainController: MainController;
    private authRouter: AuthRouter;
    private expressRouter: Router;

    constructor(MainController: MainController, AuthRouter: AuthRouter) {
        this.mainController = MainController;
        this.authRouter = AuthRouter
        this.expressRouter = express.Router();
    }

    public router = () => {
        this.expressRouter.get('/', (req: Request, res: Response) => {
            this.mainController.greeter(req, res);
        });

        this.expressRouter.use('/retrieve-chat', async (req: Request, res: Response) => {
            await this.mainController.getStreamMessages(req, res);
        });

        this.expressRouter.use('/auth', this.authRouter.router());

        return this.expressRouter;
    }

}