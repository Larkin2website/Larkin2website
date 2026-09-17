import { Router, type IRouter } from "express";
import healthRouter from "./health";
import opportunitiesRouter from "./opportunities";
import programmesRouter from "./programmes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(opportunitiesRouter);
router.use(programmesRouter);

export default router;
