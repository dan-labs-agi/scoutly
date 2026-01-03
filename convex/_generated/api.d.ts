/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_scrapeAll from "../actions/scrapeAll.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as processors_startup from "../processors/startup.js";
import type * as queries_startups from "../queries/startups.js";
import type * as scrapers_github from "../scrapers/github.js";
import type * as scrapers_hackernews from "../scrapers/hackernews.js";
import type * as scrapers_indiehackers from "../scrapers/indiehackers.js";
import type * as scrapers_producthunt from "../scrapers/producthunt.js";
import type * as scrapers_reddit from "../scrapers/reddit.js";
import type * as scrapers_rss from "../scrapers/rss.js";
import type * as scrapers_sbir from "../scrapers/sbir.js";
import type * as scrapers_sec from "../scrapers/sec.js";
import type * as scrapers_state from "../scrapers/state.js";
import type * as scrapers_wellfound from "../scrapers/wellfound.js";
import type * as scrapers_wikidata from "../scrapers/wikidata.js";
import type * as scrapers_yc from "../scrapers/yc.js";
import type * as utils_dedup from "../utils/dedup.js";
import type * as utils_queryParser from "../utils/queryParser.js";
import type * as utils_retry from "../utils/retry.js";
import type * as utils_scoring from "../utils/scoring.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/scrapeAll": typeof actions_scrapeAll;
  "lib/firecrawl": typeof lib_firecrawl;
  "processors/startup": typeof processors_startup;
  "queries/startups": typeof queries_startups;
  "scrapers/github": typeof scrapers_github;
  "scrapers/hackernews": typeof scrapers_hackernews;
  "scrapers/indiehackers": typeof scrapers_indiehackers;
  "scrapers/producthunt": typeof scrapers_producthunt;
  "scrapers/reddit": typeof scrapers_reddit;
  "scrapers/rss": typeof scrapers_rss;
  "scrapers/sbir": typeof scrapers_sbir;
  "scrapers/sec": typeof scrapers_sec;
  "scrapers/state": typeof scrapers_state;
  "scrapers/wellfound": typeof scrapers_wellfound;
  "scrapers/wikidata": typeof scrapers_wikidata;
  "scrapers/yc": typeof scrapers_yc;
  "utils/dedup": typeof utils_dedup;
  "utils/queryParser": typeof utils_queryParser;
  "utils/retry": typeof utils_retry;
  "utils/scoring": typeof utils_scoring;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
