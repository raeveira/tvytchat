import 'module-alias/register';

import express from 'express';
import http from 'node:http';
import {Server} from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// import classes
import {AuthController} from '@controllers/Auth.Controller';
import {PrismaDatabase} from '@database/Prisma.Database';
import {MainController} from '@controllers/Main.Controller';
import {TwitchController} from '@controllers/Twitch.Controller';
import {YoutubeController} from '@controllers/Youtube.Controller';
import {MainRouter} from '@routes/Main.Router';
import {AuthRouter} from "@routes/Auth.Router";
import {EnvConfig} from "@config/Env.Config";
import {AuthConfig} from "@config/Auth.Config";
import {CryptConfig} from "@config/Crypt.Config";

const envConfig = new EnvConfig();
const authConfig = new AuthConfig(envConfig);
const cryptConfig = new CryptConfig(envConfig);

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['https://tvyt.raeveira.nl', 'http://localhost:3030'],
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 6 * 1000, // 2 minute
        skipMiddlewares: false,
    },
    connectTimeout: 10000,
});

// create instances
const db = new PrismaDatabase();
const authController = new AuthController(envConfig, db, authConfig, cryptConfig);
const mainController = new MainController(authConfig, io, db, envConfig, cryptConfig);
const authRouter = new AuthRouter(authController);
const mainRouter = new MainRouter(mainController, authRouter);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
app.use(cors({
    origin: ['https://tvyt.raeveira.nl', 'http://localhost:3030'],
    credentials: true
}));

app.use('/api', mainRouter.router());

// listen to port
const PORT = envConfig.get('PORT');
httpServer.listen(PORT, () => {
    console.log(`\n> Server listening on port ${PORT}\n`);
});