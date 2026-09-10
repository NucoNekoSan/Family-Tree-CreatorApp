import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverEntries = ["bootstrap.php", "bin", "migrations", "public", "src"];

export const environmentExample = `APP_URL=https://example.com
APP_BASE_PATH=/
DB_PATH=/absolute/path/to/private-data/kakeizu.sqlite
`;

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }
  return files;
}

export async function validatePackage(target) {
  const forbidden = (await listFiles(target)).filter((path) => {
    const name = basename(path).toLowerCase();
    const privateEnvironment =
      name === ".env" || (name.startsWith(".env.") && name !== ".env.example");
    return privateEnvironment || name.includes(".sqlite");
  });
  if (forbidden.length) {
    throw new Error(
      `Forbidden files found in package:\n${forbidden
        .map((path) => relative(target, path))
        .join("\n")}`,
    );
  }
}

export async function packageDeploy({
  root = process.cwd(),
  outputRoot = join(root, "release"),
} = {}) {
  let target = join(outputRoot, "kakeizu-studio");
  try {
    await rm(target, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch (error) {
    if (error?.code !== "EBUSY") throw error;
    const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    target = join(`${outputRoot}-${suffix}`, "kakeizu-studio");
  }
  const targetServer = join(target, "server");
  await mkdir(targetServer, { recursive: true });
  await cp(join(root, "dist"), target, { recursive: true });
  for (const entry of serverEntries) {
    await cp(join(root, "server", entry), join(targetServer, entry), {
      recursive: true,
    });
  }
  await writeFile(join(targetServer, ".env.example"), environmentExample);
  await validatePackage(target);
  return target;
}

const isCommandLine =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCommandLine) {
  const target = await packageDeploy();
  console.log(`Deployment package: ${target}`);
}
