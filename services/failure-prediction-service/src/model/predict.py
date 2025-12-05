import sys
import json
import pickle
import pandas as pd
import os

# Base directory of this file
BASE_DIR = os.path.dirname(__file__)

# Load model and encoders using absolute paths
model_path = os.path.join(BASE_DIR, "model.pkl")
encoders_path = os.path.join(BASE_DIR, "encoders.pkl")

model = pickle.load(open(model_path, "rb"))
encoders = pickle.load(open(encoders_path, "rb"))

def predict(input_data):

    df = pd.DataFrame([input_data])

    # Convert timestamp to seconds since epoch
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["timestamp"] = df["timestamp"].astype("int64") / 10**9   # Safe conversion

    # Encode categorical features
    df["developer"] = encoders["developer"].transform(df["developer"])
    df["module_type"] = encoders["module_type"].transform(df["module_type"])

    features = df.values.astype(float)

    prob = model.predict_proba(features)[0][1]
    label = int(prob >= 0.5)

    return {
        "predicted_failure": label,
        "failure_probability": float(prob)
    }


if __name__ == "__main__":
    # Read input from CLI args instead of stdin
    input_json = sys.argv[1]
    input_data = json.loads(input_json)

    result = predict(input_data)
    print(json.dumps(result))
