import { runPythonPredict } from "../../utils/loadModel";

export class PredictionService {
  async predictFailure(data: any) {
    return await runPythonPredict(data);
  }
}

export const predictionService = new PredictionService();
