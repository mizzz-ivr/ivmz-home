import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const version = "24.22.2";
const root = new URL("../", import.meta.url);

test("project requires the patched supported Node 24 line", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("package.json", root), "utf8"),
  );
  const pinned = readFileSync(new URL(".node-version", root), "utf8").trim();
  assert.equal(manifest.engines.node, "^" + version);
  assert.equal(pinned, version);
});

test("CI actually runs a patched Node 24 binary", () => {
  const [major, minor, patch] = process.versions.node.split(".").map(Number);
  assert.equal(major, 24);
  assert.ok(minor > 22 || (minor === 22 && patch >= 2));
});
