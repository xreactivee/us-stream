import { config as loadEnv } from "dotenv";
import { connectToDatabase, disconnectFromDatabase } from "../connect";
import {
  AdmissionRequestModel,
  DocModel,
  MeetingModel,
  MessageModel,
  PollModel,
  QuestionModel,
  RoomModel,
  ScheduledMeetingModel,
} from "../models/index";

loadEnv({ path: "../../.env", quiet: true });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set — copy .env.example to .env at the repository root.");
}

const models = [
  RoomModel,
  MeetingModel,
  AdmissionRequestModel,
  MessageModel,
  PollModel,
  QuestionModel,
  DocModel,
  ScheduledMeetingModel,
];

await connectToDatabase({ uri, maxPoolSize: 2 });

for (const model of models) {
  const dropped = await model.syncIndexes();
  const label = dropped.length > 0 ? `dropped ${dropped.join(", ")}` : "up to date";
  console.log(`${model.modelName.padEnd(20)} ${label}`);
}

await disconnectFromDatabase();
console.log("\nIndexes synchronised.");
