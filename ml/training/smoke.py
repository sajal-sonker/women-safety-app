"""Synthetic execution test only. No generated data is retained as evaluation evidence."""
import hashlib
import csv
import json
import pathlib
import subprocess
import sys
import wave
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
folder = ROOT / ".local/training-smoke"
folder.mkdir(parents=True, exist_ok=True)
rows = []
for s, split in enumerate(["train", "validation", "test"]):
    for c, label in enumerate(["NEGATIVE", "SCREAM", "HELP", "BACHAO"]):
        for sample in range(2):
            rng = np.random.default_rng(s*100+c*10+sample)
            # Distinct generated PCM tests the toolchain, never human speech/detection.
            data = (rng.uniform(-1000, 1000, 15600)).astype("<i2")
            file = folder / f"{split}-{label}-{sample}.wav"
            with wave.open(str(file), "wb") as audio:
                audio.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
                audio.writeframes(data.tobytes())
            rows.append({"id": file.stem, "path": str(file), "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
                         "class": label, "split": split, "speaker": f"SYNTHETIC-{split}", "session": f"SYNTHETIC-{split}",
                         "environment": f"SYNTHETIC-{split}", "device": "GENERATED", "duration_s": .975,
                         "negative": label == "NEGATIVE", "consent_ref": "NO_PARTICIPANTS_GENERATED_PCM",
                         "license": "GENERATED_TOOLCHAIN_TEST_ONLY", "language": "GENERATED",
                         "noise": "GENERATED", "events": [] if label == "NEGATIVE" else [{"class": label, "start_s": 0}]})
manifest = folder / "manifest.json"
catalog = folder / "catalog.csv"
fields = ["id", "path", "class", "split", "speaker", "session", "environment", "device", "language", "noise", "consent_ref", "license", "event_start_s"]
with catalog.open("w", newline="", encoding="utf-8") as stream:
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    for row in rows:
        writer.writerow({**{key: row[key] for key in fields if key != "event_start_s"}, "event_start_s": "" if row["negative"] else "0"})
subprocess.run([sys.executable, str(ROOT / "ml/runtime/prepare.py"), str(catalog), str(manifest)], check=True)
result = subprocess.run([sys.executable, str(ROOT / "ml/training/train.py"), str(manifest), "--epochs", "1", "--output", str(folder / "candidate")], check=False)
if result.returncode:
    sys.exit(result.returncode)
report = json.loads((folder / "candidate/candidate.json").read_text())
assert report["input"] == [15600] and report["output"] == [1, 4] and report["automatic_dispatch"] is False
print(json.dumps({"status": "PASS_SYNTHETIC_TRAIN_EXPORT_TOOLCHAIN_ONLY", "accuracy": "NOT_MEASURED", "automatic_dispatch": False}))
