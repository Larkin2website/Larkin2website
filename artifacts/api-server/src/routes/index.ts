import { Router, type IRouter } from "express";
import healthRouter from "./health";
import opportunitiesRouter from "./opportunities";
import programmesRouter from "./programmes";
import publicSubscriptionsRouter from "./public-subscriptions";
import audienceCrmRouter from "./audience-crm";
import resendWebhookRouter from "./resend-webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use(opportunitiesRouter);
router.use(programmesRouter);
router.use(publicSubscriptionsRouter);
router.use(audienceCrmRouter);
router.use(resendWebhookRouter);

export default router;
