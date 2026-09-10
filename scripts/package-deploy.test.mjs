import { afterEach, describe, expect, it } from "vitest";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  environmentExample,
  packageDeploy,
  validatePackage,
} from "./package-deploy.mjs";

const temporaryDirectories = [];

async function makeFixture() {
  const root = await mkdtemp(join(tmpdir(), "kakeizu-package-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "dist", "assets"), { recursive: true });
  await writeFile(join(root, "dist", "index.html"), "app");
  await writeFile(join(root, "dist", "assets", "app.js"), "script");
  for (const directory of [
    "bin",
    "migrations",
    "public/api",
    "src",
    "vendor",
  ]) {
    await mkdir(join(root, "server", directory), { recursive: true });
    await writeFile(join(root, "server", directory, "required.txt"), directory);
  }
  await writeFile(join(root, "server", "bootstrap.php"), "bootstrap");
  await writeFile(join(root, "server", "composer.json"), "{}");
  await mkdir(join(root, "server", "tests"));
  await writeFile(join(root, "server", "tests", "test.php"), "test");
  await writeFile(join(root, "server", ".env"), "SECRET=value");
  await writeFile(join(root, "server", "database.sqlite"), "private data");
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("deployment package", () => {
  it("copies only runtime files and writes the safe environment example", async () => {
    const root = await makeFixture();
    const target = await packageDeploy({ root });

    await expect(access(join(target, "index.html"))).resolves.toBeUndefined();
    await expect(
      access(join(target, "server", "public", "api", "required.txt")),
    ).resolves.toBeUndefined();
    await expect(
      access(join(target, "server", "tests", "test.php")),
    ).rejects.toThrow();
    await expect(access(join(target, "server", ".env"))).rejects.toThrow();
    await expect(
      access(join(target, "server", "database.sqlite")),
    ).rejects.toThrow();
    await expect(
      access(join(target, "server", "composer.json")),
    ).rejects.toThrow();
    await expect(access(join(target, "server", "vendor"))).rejects.toThrow();
    await expect(
      readFile(join(target, "server", ".env.example"), "utf8"),
    ).resolves.toBe(environmentExample);
  });

  it("rejects forbidden files injected into a package", async () => {
    const root = await mkdtemp(join(tmpdir(), "kakeizu-package-check-"));
    temporaryDirectories.push(root);
    await writeFile(join(root, ".env"), "SECRET=value");
    await writeFile(join(root, ".env.production"), "SECRET=value");
    await writeFile(join(root, "database.sqlite-wal"), "private data");

    await expect(validatePackage(root)).rejects.toThrow(
      /\.env[\s\S]*\.env\.production[\s\S]*database\.sqlite-wal/,
    );
  });
});
