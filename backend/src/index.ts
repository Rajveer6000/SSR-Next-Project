import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import tradingRouter from "./routes/trading.js";
import healthRouter from "./routes/health.js";
import { ensureIndexes } from "./utils/db.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

dotenv.config({ path: ".env.dev" });

const app = express();
const port = process.env.PORT || 4000;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Trading API",
      version: "1.0.0",
      description: "API for trading and portfolio analytics.",
    },
    servers: [{ url: `http://localhost:${port}` }],
  },
  // Scan route files for @swagger JSDoc blocks
  apis: ["./src/routes/*.ts"],
});

app.use(cors());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// Main routes
app.use("/health", healthRouter);
app.use("/", tradingRouter);

// Initialize database indexes and start server
ensureIndexes().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
