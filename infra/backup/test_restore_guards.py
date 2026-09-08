"""Real shell guard checks, using only a disposable official-base container."""
import pathlib
import subprocess
import unittest

BASE = "postgres:18@sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280"
DIRECTORY = pathlib.Path(__file__).resolve().parent


class RestoreGuards(unittest.TestCase):
    def run_guard(self, setup):
        return subprocess.run([
            "docker", "run", "--rm", "--entrypoint", "sh",
            "-v", f"{DIRECTORY.as_posix()}:/backup:ro", BASE,
            "-c", setup + "; sh /backup/restore-empty.sh --type=default",
        ], capture_output=True, text=True)

    def test_requires_explicit_isolation(self):
        result = self.run_guard("export PGDATA=/tmp/recovery; mkdir /tmp/recovery")
        self.assertEqual(result.returncode, 73, result.stderr)
        self.assertIn("RECOVERY_ISOLATED", result.stderr)

    def test_refuses_nonempty_destination_including_hidden_files(self):
        result = self.run_guard("export RECOVERY_ISOLATED=1 PGDATA=/tmp/recovery; mkdir /tmp/recovery; touch /tmp/recovery/.keep")
        self.assertEqual(result.returncode, 73, result.stderr)
        self.assertIn("not empty", result.stderr)


if __name__ == "__main__":
    unittest.main()
