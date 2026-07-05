/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as applications from "../applications.js";
import type * as authTest from "../authTest.js";
import type * as crons from "../crons.js";
import type * as embeddingsCache from "../embeddingsCache.js";
import type * as employers from "../employers.js";
import type * as feedback from "../feedback.js";
import type * as fetchRemotive from "../fetchRemotive.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as notifications from "../notifications.js";
import type * as restoreJob from "../restoreJob.js";
import type * as resumes from "../resumes.js";
import type * as secureHello from "../secureHello.js";
import type * as settings from "../settings.js";
import type * as takeDownJob from "../takeDownJob.js";
import type * as users from "../users.js";
import type * as vectors from "../vectors.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  applications: typeof applications;
  authTest: typeof authTest;
  crons: typeof crons;
  embeddingsCache: typeof embeddingsCache;
  employers: typeof employers;
  feedback: typeof feedback;
  fetchRemotive: typeof fetchRemotive;
  files: typeof files;
  http: typeof http;
  jobs: typeof jobs;
  notifications: typeof notifications;
  restoreJob: typeof restoreJob;
  resumes: typeof resumes;
  secureHello: typeof secureHello;
  settings: typeof settings;
  takeDownJob: typeof takeDownJob;
  users: typeof users;
  vectors: typeof vectors;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
