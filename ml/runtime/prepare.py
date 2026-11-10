"""Build a private manifest from explicit human labels/rights/splits, without guessing."""
import argparse
import csv
import hashlib
import json
import pathlib
import sys
import wave

FIELDS = ["id", "path", "class", "split", "speaker", "session", "environment", "device", "language", "noise", "consent_ref", "license", "event_start_s"]


def prepare(catalog, output):
    source = pathlib.Path(catalog).resolve()
    with source.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if not rows:
        raise ValueError("Add consented recordings to the private catalog; no data is invented")
    result, seen, ids, axes = [], set(), set(), [{}, {}, {}]
    for row in rows:
        if any(not row.get(field, "").strip() for field in FIELDS if field != "event_start_s"):
            raise ValueError("Missing required catalog field")
        if row["class"] not in ["SCREAM", "HELP", "BACHAO", "NEGATIVE"] or row["split"] not in ["train", "validation", "test"]:
            raise ValueError("Invalid class/split")
        if row["id"] in ids:
            raise ValueError("Duplicate recording ID")
        ids.add(row["id"])
        for mapping, axis in zip(axes, ["speaker", "session", "environment"]):
            key = row[axis]
            if key in mapping and mapping[key] != row["split"]:
                raise ValueError("Speaker/session/environment crosses splits; assign splits before tuning")
            mapping[key] = row["split"]
        path = (source.parent / row["path"]).resolve()
        if path.stat().st_size > 20*1024*1024:
            raise ValueError("Split recordings into <=10 minute clips")
        checksum = hashlib.sha256(path.read_bytes()).hexdigest()
        if checksum in seen:
            raise ValueError("Duplicate audio across catalog")
        seen.add(checksum)
        with wave.open(str(path), "rb") as audio:
            if (audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) != (16000, 1, 2):
                raise ValueError("Export recordings as mono16kHz PCM16 WAV before indexing")
            duration = audio.getnframes()/16000
        if duration < .975 or duration > 600:
            raise ValueError("Clips must be at least0.975s and at most600s")
        negative = row["class"] == "NEGATIVE"
        if negative and row["event_start_s"].strip():
            raise ValueError("Negative clips must not have positive event annotations")
        events = []
        if not negative:
            if not row["event_start_s"].strip():
                raise ValueError("Annotate actual event onset; the tool cannot infer it")
            onset = float(row["event_start_s"])
            if not 0 <= onset < duration:
                raise ValueError("Event onset outside clip")
            events = [{"class": row["class"], "start_s": onset}]
        result.append({**{field: row[field] for field in FIELDS if field not in ["path", "event_start_s"]},
                       "path": str(path), "sha256": checksum, "duration_s": duration, "negative": negative, "events": events})
    target = pathlib.Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, indent=2))
    print(json.dumps({"status": "PRIVATE_MANIFEST_PREPARED", "recordings": len(result), "graduation": "NOT_EVALUATED"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog")
    parser.add_argument("output")
    args = parser.parse_args()
    prepare(args.catalog, args.output)
