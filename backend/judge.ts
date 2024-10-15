import { spawn } from "child_process";

type TcodeObject = {
  language: "python" | "javascript";
  code: string;
  problemFunction: string;
};

const testCase1Arguments = [2, 2];

export function judge(codeObject: TcodeObject) {
  const { language, code, problemFunction } = codeObject;

  const runFunction =
    problemFunction.split("(")[0] + "(" + testCase1Arguments.join(",") + ")";

  const pythonTest = `\ns = Solution()\nprint(s.${runFunction})`;

  return new Promise((resolve, reject) => {
    switch (language) {
      case "python":
        let output = "";
        const pythonProcess = spawn("docker", [
          "run",
          "python",
          "python",
          "-c",
          code + pythonTest,
        ]);

        pythonProcess.stdout.on("data", (data) => {
          output += data.toString();
        });

        pythonProcess.on("close", () => {
          resolve(output);
        });
    }
  });
}
