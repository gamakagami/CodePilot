import pandas as pd
import pickle
import joblib
from sklearn.preprocessing import OneHotEncoder
import os
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  
csv_path = os.path.join(BASE_DIR, "data", "synthetic_pr_dataset_v2.csv")

df = pd.read_csv(csv_path)

# Remove Excel artifacts
df["timestamp"] = (
    df["timestamp"]
    .astype(str)
    .str.replace(r"\+.*", "", regex=True)
    .str.strip()
)

# Convert to datetime
df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed", errors="coerce")

# Drop invalid timestamps
df = df.dropna(subset=["timestamp"])

# Convert to unix seconds (float)
df["timestamp"] = df["timestamp"].astype("int64") / 10**9



# Encode categorical fields
dev_encoder = LabelEncoder()
module_encoder = LabelEncoder()

df["developer"] = dev_encoder.fit_transform(df["developer"])
df["module_type"] = module_encoder.fit_transform(df["module_type"])

# Features
X = df[
    [
        "timestamp",
        "developer",
        "module_type",
        "lines_added",
        "lines_deleted",
        "files_changed",
        "avg_function_complexity",
        "code_coverage_change",
        "build_duration",
        "contains_test_changes",
        "previous_failure_rate",
    ]
]

y = df["label_test_failed"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier(n_estimators=300, random_state=42)
model.fit(X_train, y_train)

# Save model + encoders inside src/model/
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

with open("encoders.pkl", "wb") as f:
    pickle.dump(
        {
            "developer": dev_encoder,
            "module_type": module_encoder,
        },
        f,
    )

print("Model trained and saved.")
