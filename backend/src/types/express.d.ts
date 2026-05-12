declare namespace Express {
    export interface Request {
        user?: {
            id: number;
            uid: string;
            email: string;
            name: string;
            role: string;
            iat?: number;
            exp?: number;
        };
    }
}
