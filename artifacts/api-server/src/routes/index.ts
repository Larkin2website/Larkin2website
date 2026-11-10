import { Router, type IRouter } from "express";
import healthRouter from "./health";
import opportunitiesRouter from "./opportunities";
import programmesRouter from "./programmes";
import publicSubscriptionsRouter from "./public-subscriptions";
import audienceCrmRouter from "./audience-crm";
import resendWebhookRouter from "./resend-webhook";
import contactRouter from "./contact";
import staffAuthRouter from "./staff-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(staffAuthRouter);
router.use(opportunitiesRouter);
router.use(programmesRouter);
router.use(publicSubscriptionsRouter);
router.use(audienceCrmRouter);
router.use(resendWebhookRouter);
router.use(contactRouter);

export default router;
