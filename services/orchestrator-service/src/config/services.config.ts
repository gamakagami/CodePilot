export const servicesConfig = {
  analysis: {
    url: process.env.ANALYSIS_SERVICE_URL || "http://localhost:5003",
    endpoints: {
      analyze: "analysis"
    }
  },
  prediction: {
    url: process.env.PREDICTION_SERVICE_URL || "http://localhost:5000",
    endpoints: {
      predict: "predict"
    }
  },
  review: {
    url: process.env.REVIEW_SERVICE_URL || "http://localhost:6000",
    endpoints: {
      review: "review"
    }
  }
};