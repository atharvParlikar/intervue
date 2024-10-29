import "../App.css";

import { useState } from "react";

export type TestResultPacket = {
  testCase: number;
  expected_output: any;
  actual_output: any;
  status: "pass" | "fail";
};

export type TestResult =
  | {
      exitCode: 0;
      results: TestResultPacket[];
    }
  | { exitCode: 1; errorString: string };

export type TestResultProps = {
  testResults: TestResult;
};

const TestResults = ({ testResults }: TestResultProps) => {
  const { exitCode } = testResults;
  const [currentTestCase, setCurrentTestCase] = useState<number>(0);

  return exitCode === 0 ? (
    <div className="h-full w-full border-2 border-black flex">
      <div className="flex flex-col gap-2 m-2 overflow-y-scroll w-1/5 no-scrollbar">
        {testResults.results.map((result, index) => {
          return (
            <pre
              key={index}
              className={`w-fit ${result.status === "pass" ? "text-green-400" : "text-red-400"} hover:underline cursor-pointer`}
            >
              {`${result.testCase}.${result.status.toUpperCase()}`}
            </pre>
          );
        })}
      </div>
      <div className="w-full h-full">
        <div className="flex flex-col">
          <p>Expected:</p>
          {testResults.results[currentTestCase].expected_output}
        </div>
      </div>
    </div>
  ) : (
    <pre className="text-red-400">{testResults.errorString}</pre>
  );
};

export default TestResults;
