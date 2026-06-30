import { createRouter } from "./middleware";
import { eventRouter } from "./routers/event";
import { scheduleRouter } from "./routers/schedule";
import { visionRouter } from "./routers/vision";

export const appRouter = createRouter({
  event: eventRouter,
  schedule: scheduleRouter,
  vision: visionRouter,
});

export type AppRouter = typeof appRouter;
