import { exec } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";
import fs from "fs";

type TcodeObject = {
  language: "python" | "javascript";
  code: string;
  problemFunction: string;
};

type TestResultPacket = {
  testCase: number;
  expected_output: any;
  actual_output: any;
  status: "pass" | "fail";
};

type TestResult =
  | {
      exitCode: 0;
      results: TestResult[];
    }
  | { exitCode: 1; errorString: string };

const testcases = [
  { input: [2, 2], output: 4 },
  { input: [-1, 1], output: 0 },
  { input: [0, 0], output: 0 },
  { input: [100, 200], output: 300 },
  { input: [-5, -3], output: -8 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [1.5, 2.5], output: 4 },
  { input: [9999999, 1], output: 10000000 },
];

const testcases2 = [{ input: [[1, 2, 3, 4, 5]], output: 15 }];

const writeFileAsync = promisify(fs.writeFile);
const execAsync = promisify(exec);

type Testcase = {
  input: any[];
  output: any;
};

async function runPythonInDocker(
  pythonScript: string,
  problemFunction: string,
  testcases: Testcase[],
): Promise<TestResult> {
  const tempDir = os.tmpdir();
  const scriptPath = path.join(tempDir, "script.py");

  const runFunction =
    problemFunction.split("(")[0] + "(" + testcases[0].input.join(",") + ")";

  console.log("[judge function] runFunction: ", runFunction);

  const testcasesinjetion = `\ntestcases = [${testcases.map((x) => JSON.stringify(x))}]\n`;

  const pythonTest =
    testcasesinjetion +
    `
s = Solution()
results = []
for i, testcase in enumerate(testcases):
    expected_output = testcase["output"]
    actual_output = s.${problemFunction.split("(")[0]}(*testcases[i]["input"])

    results.append({
        "testCase": i+1,
        "expected": expected_output,
        "actual": actual_output,
        "status": "pass" if expected_output == actual_output else "fail"
    })
print(json.dumps(results, indent=4))
`;

  const pythonScriptWithTest = "import json\n" + pythonScript + pythonTest;

  try {
    await writeFileAsync(scriptPath, pythonScriptWithTest);

    const { stdout, stderr } = await execAsync(
      `docker run --rm -v ${scriptPath}:/script.py python:3.9-slim python /script.py`,
    );

    console.log("[judge] stderr: ", stderr);

    const stdoutObj = JSON.parse(stdout);

    return { exitCode: 0, results: stdoutObj };
  } catch (error: any) {
    const pythonError = error.message.split("\n").slice(1).join("\n");
    return { exitCode: 1, errorString: pythonError };
  } finally {
    fs.unlink(scriptPath, (err) => {
      if (err) console.error(`Failed to delete temporary file: ${err}`);
    });
  }
}

export function judge(codeObject: TcodeObject) {
  const { language, code, problemFunction } = codeObject;

  switch (language) {
    case "python":
      return runPythonInDocker(code, problemFunction, testcases);
    default:
      return { exitCode: 1, errorString: "Language not supported yet" };
  }
}
