import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  auditItemPatchChanges,
  normalizeItemRows
} from "../src/index.js";

function parseArgs(argv) {
  const options = {
    previousItems: resolve(".probe", "meta_items_expanded.json"),
    currentItems: resolve("src", "data", "generated", "item-localization.zh-CN.json"),
    previousLocalization: null,
    currentLocalization: resolve("src", "data", "generated", "item-localization.zh-CN.json"),
    patch: "current",
    json: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--json") options.json = true;
    else if (["--previous-items", "--current-items", "--previous-localization", "--current-localization"].includes(arg) && next) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[key] = resolve(next);
      index += 1;
    } else if (arg === "--patch" && next) {
      options.patch = next;
      index += 1;
    }
  }
  return options;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function itemRows(response) {
  if (Array.isArray(response?.items)) {
    return response.items.map((row) => ({ apiName: row.apiName })).filter((row) => row.apiName);
  }
  return normalizeItemRows(response).map((row) => ({
    apiName: row.items ?? row.itemName ?? row.item ?? row.apiName ?? row.api_name
  }));
}

const options = parseArgs(process.argv.slice(2));
const currentItemsResponse = await readJson(options.currentItems);
const currentLocalizationSnapshot = await readJson(options.currentLocalization);
const previousItemsResponse = options.previousItems
  ? await readJson(options.previousItems)
  : currentItemsResponse;
const previousLocalizationSnapshot = options.previousLocalization
  ? await readJson(options.previousLocalization)
  : currentLocalizationSnapshot;

const report = auditItemPatchChanges({
  patch: options.patch,
  previousItems: itemRows(previousItemsResponse),
  currentItems: itemRows(currentItemsResponse),
  previousLocalization: previousLocalizationSnapshot.items,
  currentLocalization: currentLocalizationSnapshot.items
});

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Item patch audit");
  console.log(`patch=${report.patch}`);
  console.log(`previous=${report.counts.previous}, current=${report.counts.current}`);
  console.log(`added=${report.counts.added}, removed=${report.counts.removed}`);
  console.log(`missingLocalization=${report.counts.missingLocalization}, nameChanges=${report.counts.nameChanges}`);
  console.log(`availabilityPolicy=${report.availabilityPolicy}`);
  for (const apiName of report.added) console.log(`ADDED ${apiName}`);
  for (const entry of report.removed) {
    console.log(`REMOVED_OBSERVATION ${entry.apiName} (${entry.availabilityDecision})`);
  }
  for (const entry of report.missingLocalization) {
    console.log(`PENDING_LOCALIZATION ${entry.apiName}: ${entry.enName ?? "unknown English name"}`);
  }
  for (const entry of report.nameChanges) {
    console.log(`NAME_CHANGED ${entry.apiName}: ${entry.before ?? "<missing>"} -> ${entry.after ?? "<missing>"}`);
  }
}
