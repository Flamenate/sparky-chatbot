import express, { type Request, type Response } from "express";
import whatsappRoutes from "./routes/whatsapp.route.js";
import messengerRoutes from "./routes/messenger.route.js";
import instagramRoutes from "./routes/instagram.route.js";
import "dotenv/config";
import mongoose from "mongoose";

mongoose
  .connect(process.env.MONGODB_URI as string, { dbName: "sparky" })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const app = express();

app.use(express.json());

app.use("/messenger", messengerRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/instagram", instagramRoutes);

app.get("/status", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
