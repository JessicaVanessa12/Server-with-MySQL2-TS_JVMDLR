import { Router } from "express";
import productsRoutes from "./products.routes.js";

const router = Router();

router.use("/products", productsRoutes);

export default router;
