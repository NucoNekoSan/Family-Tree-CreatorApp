import { spawnSync } from "node:child_process";
import process from "node:process";

const mount = `${process.cwd()}:/app`;
const command = [
  "find server -name '*.php' -not -path 'server/vendor/*' -print0 | xargs -0 -n1 php -l",
  "php server/tests/migration-smoke.php",
  "rm -f /tmp/kakeizu-security.sqlite",
  "DB_PATH=/tmp/kakeizu-security.sqlite APP_URL=http://127.0.0.1:18080/test APP_BASE_PATH=/test ADMIN_LOGIN_ID=admin ADMIN_PASSWORD=test-password php server/bin/sync-admin.php",
  "DB_PATH=/tmp/kakeizu-security.sqlite APP_URL=http://127.0.0.1:18080/test APP_BASE_PATH=/test php -S 127.0.0.1:18080 server/public/api/index.php >/tmp/kakeizu-http.log 2>&1 & server_pid=$!; trap 'kill $server_pid' EXIT; sleep 1; if ! kill -0 $server_pid 2>/dev/null; then cat /tmp/kakeizu-http.log; exit 1; fi; DB_PATH=/tmp/kakeizu-security.sqlite php server/tests/security-http.php || { cat /tmp/kakeizu-http.log; exit 1; }",
].join(" && ");
const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "-v",
    mount,
    "-w",
    "/app",
    "php:8.3-cli",
    "sh",
    "-lc",
    command,
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
