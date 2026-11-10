"""Real bundled-model inference on generated PCM; this measures execution, not recall."""
import hashlib
import json
import pathlib
import time
import numpy as np
from ai_edge_litert.interpreter import Interpreter

ROOT = pathlib.Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / "ml/models/manifest.json").read_text())
model = ROOT / "ml/models" / manifest["file"]
assert hashlib.sha256(model.read_bytes()).hexdigest() == manifest["sha256"]
runtime = Interpreter(model_path=str(model), num_threads=2)
runtime.allocate_tensors()
inp, out = runtime.get_input_details()[0], runtime.get_output_details()[0]
assert inp["shape"].tolist() == [15600] and out["shape"].tolist() == [1, 521]
assert inp["dtype"] == np.float32 and out["dtype"] == np.float32
rng = np.random.default_rng(7)
fixtures = {"silence": np.zeros(15600, np.float32),
            "synthetic_tone": (.1*np.sin(2*np.pi*440*np.arange(15600)/16000)).astype(np.float32),
            "synthetic_noise": rng.uniform(-.05, .05, 15600).astype(np.float32)}
timings, scores = [], {}
for name, wave in fixtures.items():
    for repeat in range(6):
        runtime.set_tensor(inp["index"], wave)
        start = time.perf_counter()
        runtime.invoke()
        timings.append((time.perf_counter()-start)*1000)
        values = runtime.get_tensor(out["index"])
        assert np.isfinite(values).all() and (values >= 0).all() and (values <= 1).all()
    scores[name] = float(values[0, 11])
result = {"status": "PASS_INTERPRETER_SMOKE_ONLY", "model_sha256": manifest["sha256"],
          "input_shape": [15600], "output_shape": [1, 521], "generated_fixtures": scores,
          "desktop_inference_p95_ms": float(np.percentile(timings, 95)),
          "distress_accuracy": "NOT_MEASURED", "phone_performance": "NOT_MEASURED",
          "automatic_dispatch": False}
folder = ROOT / ".local/reports"
folder.mkdir(parents=True, exist_ok=True)
(folder / "ml-smoke.json").write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
