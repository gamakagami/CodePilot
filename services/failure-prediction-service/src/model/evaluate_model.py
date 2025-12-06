import pandas as pd
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import hashlib

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  
csv_path = os.path.join(BASE_DIR, "data", "synthetic_pr_dataset_v2.csv")

def hash_encode(value, num_buckets):
    hash_object = hashlib.md5(str(value).encode())
    hash_int = int(hash_object.hexdigest(), 16)
    return hash_int % num_buckets

# Load data
df = pd.read_csv(csv_path)

# Clean timestamps
df["timestamp"] = (
    df["timestamp"]
    .astype(str)
    .str.replace(r"\+.*", "", regex=True)
    .str.strip()
)
df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed", errors="coerce")
df = df.dropna(subset=["timestamp"])
df["timestamp"] = df["timestamp"].astype("int64") / 10**9

# Encode
df["developer"] = df["developer"].apply(lambda x: hash_encode(x, 50))
df["module_type"] = df["module_type"].apply(lambda x: hash_encode(x, 20))

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

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Load trained model
model = pickle.load(open("model.pkl", "rb"))

# Predictions
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)

# Evaluation
print("=" * 50)
print("MODEL EVALUATION")
print("=" * 50)
print(f"\nTotal test samples: {len(y_test)}")
print(f"Actual failures: {sum(y_test)}")
print(f"Predicted failures: {sum(y_pred)}")

print("\n" + "=" * 50)
print("CLASSIFICATION REPORT")
print("=" * 50)
print(classification_report(y_test, y_pred, target_names=["PASS", "FAIL"]))

print("\n" + "=" * 50)
print("CONFUSION MATRIX")
print("=" * 50)
cm = confusion_matrix(y_test, y_pred)
print(f"True Negatives (Correct PASS): {cm[0][0]}")
print(f"False Positives (Predicted FAIL, was PASS): {cm[0][1]}")
print(f"False Negatives (Predicted PASS, was FAIL): {cm[1][0]}")
print(f"True Positives (Correct FAIL): {cm[1][1]}")

print("\n" + "=" * 50)
print("FEATURE IMPORTANCE")
print("=" * 50)
feature_names = [
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

importances = model.feature_importances_
for name, importance in sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True):
    print(f"{name:30s}: {importance:.4f}")

print("\n" + "=" * 50)
print("SAMPLE PREDICTIONS")
print("=" * 50)
for i in range(min(5, len(X_test))):
    actual = "FAIL" if y_test.iloc[i] else "PASS"
    predicted = "FAIL" if y_pred[i] else "PASS"
    prob = y_proba[i][1]
    print(f"Actual: {actual:4s} | Predicted: {predicted:4s} | Probability: {prob:.2%}")