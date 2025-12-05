import os
import sys
import json
import pickle
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model = pickle.load(open(os.path.join(BASE_DIR, "model.pkl"), "rb"))
encoders = pickle.load(open(os.path.join(BASE_DIR, "encoders.pkl"), "rb"))

def predict(input_data):
    df = pd.DataFrame([input_data])

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["timestamp"] = df["timestamp"].astype("int64") // 10**9

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
    raw = sys.stdin.read()
    input_data = json.loads(raw)
    result = predict(input_data)
    print(json.dumps(result))
