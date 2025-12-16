import { spawn } from "child_process";
import path from "path";

export function runPythonPredict(input: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", "model", "predict.py");

    const py = spawn("python", ["-u", scriptPath]);

    let output = "";
    let errorOutput = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });

    py.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python exited with code ${code}: ${errorOutput}`));
      }

      try {
        resolve(JSON.parse(output));
      } catch (e) {
        reject(e);
      }
    });

    // Write input to python
    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}