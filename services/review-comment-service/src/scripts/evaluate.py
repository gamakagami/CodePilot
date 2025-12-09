import sys
import json
import warnings
import os
import logging

# Suppress warnings and noisy logs
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
logging.getLogger('transformers').setLevel(logging.ERROR)

from nltk.translate.meteor_score import meteor_score
from nltk.tokenize import word_tokenize
from bert_score import score

def safe_bertscore(reference, hypothesis):
    """Calculate BERTScore"""
    try:
        P, R, F1 = score([hypothesis], [reference], lang="en", verbose=False, device='cpu')
        return {
            "precision": float(P.mean()),
            "recall": float(R.mean()),
            "f1": float(F1.mean())
        }
    except Exception as e:
        print(f"BERTScore calculation error: {e}", file=sys.stderr)
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0}

def main():
    try:
        args = sys.argv[1:]
        if len(args) < 2:
            print(json.dumps({"error": "Missing arguments. Usage: evaluate.py <generated> <reference>"}))
            sys.exit(1)

        generated = args[0]
        reference = args[1]

        # Parse JSON if generated is a JSON string
        try:
            generated_obj = json.loads(generated)
            if isinstance(generated_obj, dict):
                generated = generated_obj.get('summary', str(generated_obj))
        except:
            pass  # Use as-is if not JSON

        generated = str(generated).strip()
        reference = str(reference).strip()

        if not generated or not reference:
            print(json.dumps({"error": "Generated or reference text is empty"}))
            sys.exit(1)

        # Calculate metrics
        bert = safe_bertscore(reference, generated)

        result = {
            "bertScore": bert,
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": f"Evaluation failed: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
