import { exec, spawn } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";
import fs from "fs";

type TcodeObject = {
  language: "python" | "javascript";
  code: string;
  problemFunction: string;
};

const testCase1Arguments = [2, 2];

const writeFileAsync = promisify(fs.writeFile);
const execAsync = promisify(exec);

async function runPythonInDocker(pythonScript: string) {
  const tempDir = os.tmpdir();
  const scriptPath = path.join(tempDir, "script.py");

  try {
    await writeFileAsync(scriptPath, pythonScript);

    const { stdout, stderr } = await execAsync(
      `docker run --rm -v ${scriptPath}:/script.py python:3.9-slim python /script.py`,
    );

    return stdout || stderr;
  } catch (error: any) {
    return `Error: ${error.message}`;
  } finally {
    fs.unlink(scriptPath, (err) => {
      if (err) console.error(`Failed to delete temporary file: ${err}`);
    });
  }
}

export function judge(codeObject: TcodeObject) {
  const { language, code, problemFunction } = codeObject;

  const runFunction =
    problemFunction.split("(")[0] + "(" + testCase1Arguments.join(",") + ")";

  console.log("[judge function] runFunction: ", runFunction);

  const pythonTest = `\ns = Solution()\nprint(s.${runFunction})`;

  switch (language) {
    case "python":
      return runPythonInDocker(code + pythonTest);
  }
}
