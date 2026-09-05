/**
 * Database access shared by the web app and the realtime service.
 *
 * Connecting is the caller's job because the two runtimes need different
 * pool sizes: a Vercel function keeps a small pool per warm instance, while
 * the long-running Railway service can hold more.
 */

// Mongoose 9 no longer exports a public filter type; derive one from a model
// with `Parameters<typeof SomeModel.find>[0]` where a filter has to be named.
export type { HydratedDocument, Model, UpdateQuery } from "mongoose";
export { isValidObjectId, Types } from "mongoose";
export * from "./cascade";
export * from "./connect";
export * from "./models/index";
