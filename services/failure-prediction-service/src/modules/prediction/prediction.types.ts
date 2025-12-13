export interface PredictionInput {
  timestamp: string;
  developer: string;
  module_type: string;
  lines_added: number;
  lines_deleted: number;
  files_changed: number;
  avg_function_complexity: number;
  code_coverage_change: number;
  build_duration: number;
  contains_test_changes: number;
  previous_failure_rate: number;
}

export interface PredictionResult {
  predicted_failure: number;     
  failure_probability: number;   
}

export interface PredictionResponse {
  success: boolean;
  data: PredictionResult;
}
