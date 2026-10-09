import express, { Application } from "express";
import routes from "./routes/index.js";

export class Server {
  private readonly app: Application;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = Number(process.env.PORT ?? 3000);
    this.middlewares();
    this.routes();
  }

  private middlewares(): void {
    this.app.use(express.json());
  }

  private routes(): void {
    this.app.use("/api/v1", routes);
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}
