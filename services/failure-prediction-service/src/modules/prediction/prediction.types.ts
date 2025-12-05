export interface PredictionInput {
  [key: string]: number;   // Any numeric fields
}

export interface PredictionResult {
  prediction: number;
  success: boolean;
}
