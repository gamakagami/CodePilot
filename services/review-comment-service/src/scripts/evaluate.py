# scripts/evaluate.py
import sys, json
from nltk.translate.bleu_score import sentence_bleu
from rouge_score import rouge_scorer
from bert_score import score

def main():
    args = sys.argv[1:]
    generated = json.loads(args[0])
    reference = args[1]

    # BLEU
    bleu = sentence_bleu([reference.split()], generated.split())

    # ROUGE
    scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
    rouge_scores = scorer.score(reference, generated)
    rouge = {
        "precision": rouge_scores["rougeL"].precision,
        "recall": rouge_scores["rougeL"].recall,
        "f1": rouge_scores["rougeL"].fmeasure
    }

    # BERTScore
    P, R, F1 = score([generated], [reference], lang="en", verbose=False)
    bert = {
        "precision": float(P.mean()),
        "recall": float(R.mean()),
        "f1": float(F1.mean())
    }

    print(json.dumps({
        "bleu": bleu,
        "rouge": rouge,
        "bertScore": bert
    }))

if __name__ == "__main__":
    main()