/**
 * One-time classification pass: tags every exercise in the ExerciseDB OSS
 * dataset with a training-type (mobility/strength/coordination/speed/agility/
 * cardio) using Claude, since the source data has no such field. Writes
 * lib/exercise-training-types.json (exerciseId -> type). Re-run any time the
 * dataset grows — already-classified ids are skipped.
 *
 * Usage: node --env-file=.env scripts/classify-exercise-types.mjs
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../lib/exercise-training-types.json");
const DATA_URL =
  "https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/src/data/exercises.json";
const BATCH_SIZE = 50;
const TYPES = [
  "mobility",
  "strength",
  "coordination",
  "speed",
  "agility",
  "cardio",
];

const client = new Anthropic();

const schema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: TYPES },
        },
        required: ["id", "type"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

async function classifyBatch(exercises) {
  const list = exercises
    .map(
      (e) =>
        `${e.exerciseId}: ${e.name} (body: ${e.bodyParts.join("/")}; targets: ${e.targetMuscles.join("/")}; equipment: ${e.equipments.join("/")})`,
    )
    .join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8000,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema },
    },
    system:
      "You classify exercises by the primary physical quality they train, for a fitness coaching app. " +
      `Categories: ${TYPES.join(", ")}. ` +
      "strength = building muscular force/hypertrophy (most weightlifting). " +
      "mobility = stretching, joint range of motion, flexibility. " +
      "coordination = balance, motor control, multi-limb timing (not raw strength or speed). " +
      "speed = maximal movement velocity (sprints, fast single-effort movements). " +
      "agility = rapid direction changes / reactive footwork. " +
      "cardio = sustained aerobic conditioning (running, cycling, rowing machines, elliptical). " +
      "Pick exactly one category per exercise — the single best fit.",
    messages: [
      {
        role: "user",
        content: `Classify each exercise below. Return one entry per line, in the same order.\n\n${list}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const parsed = JSON.parse(textBlock.text);
  return parsed.results;
}

async function main() {
  console.log("Fetching exercise dataset...");
  const raw = await fetch(DATA_URL).then((r) => r.json());
  console.log(`${raw.length} exercises total.`);

  const existing = existsSync(OUTPUT_PATH)
    ? JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"))
    : {};

  const remaining = raw.filter((e) => !existing[e.exerciseId]);
  console.log(`${remaining.length} exercises left to classify.`);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    console.log(
      `Classifying ${i + 1}-${i + batch.length} of ${remaining.length}...`,
    );
    const results = await classifyBatch(batch);
    for (const { id, type } of results) {
      existing[id] = type;
    }
    writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2) + "\n");
  }

  console.log(`Done. ${Object.keys(existing).length} exercises classified.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
