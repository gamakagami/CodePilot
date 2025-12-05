import { PythonShell } from "python-shell";

export function runPythonPredict(input: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const results = await PythonShell.run("src/model/predict.py", {
        args: [JSON.stringify(input)]
      });

      const output = results?.[0];

      if (!output) {
        return reject(new Error("No output from Python script"));
      }

      resolve(JSON.parse(output));
    } catch (err) {
      reject(err);
    }
  });
}
