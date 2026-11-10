"""Score real private recordings. Test scoring requires the validation freeze artifact."""
import argparse
import hashlib
import json
import pathlib
import sys
import time
import wave
import numpy as np
from ai_edge_litert.interpreter import Interpreter


def read_pcm(row):
    path = pathlib.Path(row["path"])
    if path.stat().st_size > 20*1024*1024:
        raise ValueError("Split recordings into <=10 minute clips")
    if hashlib.sha256(path.read_bytes()).hexdigest() != row["sha256"]:
        raise ValueError("Recording checksum mismatch")
    with wave.open(str(path), "rb") as audio:
        if (audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) != (16000, 1, 2):
            raise ValueError("Use 16kHz mono PCM16 WAV")
        seconds = audio.getnframes()/16000
        if seconds < .975 or seconds > 600 or abs(seconds-row["duration_s"]) > .01:
            raise ValueError("Recording duration mismatch; inference clips must be >=0.975s and <=600s")
        return np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2").astype(np.float32)/32768.0


def run(args):
    raw_manifest = pathlib.Path(args.manifest).read_bytes()
    rows = json.loads(raw_manifest)
    dataset_sha = hashlib.sha256(raw_manifest).hexdigest()
    descriptor = json.loads(pathlib.Path(args.descriptor).read_text(encoding="utf-8-sig"))
    model = pathlib.Path(args.model)
    model_sha = hashlib.sha256(model.read_bytes()).hexdigest()
    if descriptor["sha256"] != model_sha:
        raise ValueError("Model descriptor checksum mismatch")
    classes = descriptor.get("classes")
    if classes is None:
        if descriptor.get("id") != "yamnet-classification-tflite-1":
            raise ValueError("Unsupported sound-model descriptor")
        mapping = [("SCREAM", descriptor["output"]["screaming_index"])]
        size = 521
    else:
        if classes != ["NEGATIVE", "SCREAM", "HELP", "BACHAO"]:
            raise ValueError("Unsupported candidate class order")
        mapping = [(name, i) for i, name in enumerate(classes) if name != "NEGATIVE"]
        size = 4
    if descriptor.get("automatic_dispatch") is not False:
        raise ValueError("Only non-dispatching candidates are supported")
    freeze_sha = None
    if args.split == "test":
        if not args.freeze:
            raise ValueError("Create a validation-only threshold freeze before scoring test")
        freeze_bytes = pathlib.Path(args.freeze).read_bytes()
        frozen = json.loads(freeze_bytes)
        if frozen.get("model_sha256") != model_sha or frozen.get("dataset_sha256") != dataset_sha or frozen.get("source_split") != "validation":
            raise ValueError("Frozen model/dataset mismatch")
        freeze_sha = hashlib.sha256(freeze_bytes).hexdigest()
    runtime = Interpreter(model_path=str(model), num_threads=2)
    runtime.allocate_tensors()
    inp, out = runtime.get_input_details()[0], runtime.get_output_details()[0]
    if inp["shape"].tolist() != [15600] or out["shape"].tolist() != [1, size] or inp["dtype"] != np.float32 or out["dtype"] != np.float32:
        raise ValueError("Candidate tensor mismatch")
    recordings = []
    for row in rows:
        if row["split"] != args.split:
            continue
        if row["negative"] != (row["class"] == "NEGATIVE") or not row["consent_ref"] or not row["license"]:
            raise ValueError("Invalid rights/label")
        events = row.get("events")
        if events is None or (not row["negative"] and not events) or (row["negative"] and events):
            raise ValueError("Explicit event annotations are required; do not invent onset times")
        data = read_pcm(row)
        predictions = []
        starts = list(range(0, len(data)-15600+1, 7800))
        if starts[-1] != len(data)-15600:
            starts.append(len(data)-15600)
        for start in starts:
            runtime.set_tensor(inp["index"], data[start:start+15600])
            runtime.invoke()
            values = runtime.get_tensor(out["index"])[0]
            if not np.isfinite(values).all() or (values < 0).any() or (values > 1).any():
                raise ValueError("Invalid model output")
            label, index = max(mapping, key=lambda pair: values[pair[1]])
            # Window END time prevents reporting detection before samples were captured.
            predictions.append({"class": label, "at_s": (start+15600)/16000, "score": float(values[index])})
        recordings.append({"id": row["id"], "duration_s": row["duration_s"], "negative": row["negative"],
                           "language": row["language"], "noise": row["noise"], "device": row["device"],
                           "events": events, "predictions": predictions})
    if not recordings:
        raise ValueError("No recordings in requested split")
    result = {"schema_version": 1, "split": args.split, "model_sha256": model_sha, "dataset_sha256": dataset_sha,
              "created_at_epoch_ms": int(time.time()*1000), "freeze_sha256": freeze_sha,
              "supported_classes": [c for c, _ in mapping], "recordings": recordings, "automatic_dispatch": False}
    target = pathlib.Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, indent=2))
    print(json.dumps({"status": "SCORED_PRIVATE_RECORDINGS", "split": args.split, "count": len(recordings), "automatic_dispatch": False}))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest")
    parser.add_argument("--model", required=True)
    parser.add_argument("--descriptor", required=True)
    parser.add_argument("--split", choices=["validation", "test"], required=True)
    parser.add_argument("--freeze")
    parser.add_argument("--output", required=True)
    sys.exit(run(parser.parse_args()))
