import mongoose, { type Model, type Schema } from "mongoose";

/**
 * Registering the same model name twice throws. Hot reloading and serverless
 * re-entry both do exactly that, so every model goes through here.
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

/**
 * MongoDB has no foreign keys, so ids are stored as plain values and the
 * relationships are maintained in application code. Ids that point at a
 * Better Auth user are strings (Better Auth owns those collections); ids that
 * point at one of our own documents are ObjectIds.
 */
export type UserId = string;
