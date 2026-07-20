import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import adminRouter from "./admin.js";
import storesRouter from "./stores.js";
import productsRouter from "./products.js";
import customersRouter from "./customers.js";
import ordersRouter from "./orders.js";
import expensesRouter from "./expenses.js";
import notificationsRouter from "./notifications.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/stores", storesRouter);
router.use("/products", productsRouter);
router.use("/customers", customersRouter);
router.use("/orders", ordersRouter);
router.use("/expenses", expensesRouter);
router.use("/notifications", notificationsRouter);

export default router;
