"""Train a small phrase/audio baseline from private, licensed speaker-disjoint PCM.

No example dataset or generated labels are presented as validation. Output is a
candidate only; deployment requires a reviewed manifest and held-out/device gates.
"""
import argparse
import hashlib
import json
import pathlib
import sys
import wave
import numpy as np
import tensorflow as tf
from tensorflow.python.framework.convert_to_constants import convert_variables_to_constants_v2

CLASSES = ["NEGATIVE", "SCREAM", "HELP", "BACHAO"]
SAMPLES = 15600


def load_manifest(path):
    rows = json.loads(pathlib.Path(path).read_text())
    seen, ids, axes = set(), set(), [{}, {}, {}]
    for r in rows:
        if r["sha256"] in seen or r["class"] not in CLASSES or r["split"] not in ["train", "validation", "test"]:
            raise ValueError("Duplicate audio or invalid class/split")
        seen.add(r["sha256"])
        if not r["id"] or r["id"] in ids or r["negative"] != (r["class"] == "NEGATIVE"):
            raise ValueError("Invalid recording ID/negative designation")
        ids.add(r["id"])
        if not r["consent_ref"] or not r["license"]:
            raise ValueError("Every asset needs consent and rights")
        for mapping, axis in zip(axes, ["speaker", "session", "environment"]):
            key = r[axis]
            if not key or key in mapping and mapping[key] != r["split"]:
                raise ValueError("Speaker/session/environment leakage")
            mapping[key] = r["split"]
        if hashlib.sha256(pathlib.Path(r["path"]).read_bytes()).hexdigest() != r["sha256"]:
            raise ValueError("Audio checksum mismatch")
    for split in ["train", "validation", "test"]:
        if {r["class"] for r in rows if r["split"] == split} != set(CLASSES):
            raise ValueError("All four classes required in every split")
    return rows


def waveform(path):
    with wave.open(str(path), "rb") as audio:
        if (audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) != (16000, 1, 2):
            raise ValueError("Expected 16kHz mono PCM16 WAV")
        if audio.getnframes() > 16000*600:
            raise ValueError("Split recordings into bounded clips of at most ten minutes")
        result = np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2").astype(np.float32)/32768.0
    if not len(result):
        raise ValueError("Empty recording")
    return result


def windows(data):
    if len(data) < SAMPLES:
        yield np.pad(data, (0, SAMPLES-len(data)))
    else:
        for offset in range(0, len(data)-SAMPLES+1, SAMPLES//2):
            yield data[offset:offset+SAMPLES]


def features(waveform_batch):
    spectra = tf.abs(tf.signal.stft(waveform_batch, 400, 160, fft_length=512))**2
    mel = tf.signal.linear_to_mel_weight_matrix(64, 257, 16000, 125., 7500.)
    return tf.math.log(tf.matmul(spectra, mel)+.001)[..., tf.newaxis]


def build_model():
    inputs = tf.keras.Input((96, 64, 1))
    x = tf.keras.layers.Conv2D(16, 3, activation="relu")(inputs)
    x = tf.keras.layers.MaxPooling2D()(x)
    x = tf.keras.layers.Conv2D(32, 3, activation="relu")(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(32, activation="relu")(x)
    return tf.keras.Model(inputs, tf.keras.layers.Dense(4, activation="softmax")(x))


class Export(tf.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    @tf.function(input_signature=[tf.TensorSpec([SAMPLES], tf.float32, name="waveform")])
    def serve(self, pcm):
        return self.model(features(pcm[tf.newaxis]), training=False)


def run(args):
    if not args.manifest:
        print(json.dumps({"status": "BLOCKED_EXTERNAL", "reason": "Supply a private licensed recording manifest; no fabricated phrase model is trained."}))
        return 2
    tf.keras.utils.set_random_seed(args.seed)
    tf.config.experimental.enable_op_determinism()
    tf.config.threading.set_intra_op_parallelism_threads(2)
    tf.config.threading.set_inter_op_parallelism_threads(2)
    rows = load_manifest(args.manifest)
    def dataset(split):
        def generate():
            for r in rows:
                if r["split"] == split:
                    for w in windows(waveform(r["path"])):
                        yield w, np.int32(CLASSES.index(r["class"]))
        data = tf.data.Dataset.from_generator(generate, output_signature=(tf.TensorSpec([SAMPLES], tf.float32), tf.TensorSpec([], tf.int32)))
        if split == "train":
            data = data.shuffle(256, seed=args.seed)
        options = tf.data.Options()
        options.threading.private_threadpool_size = 2
        options.deterministic = True
        return data.batch(32).map(lambda x, y: (features(x), y), num_parallel_calls=1).prefetch(1).with_options(options)
    model = build_model()
    model.compile(optimizer=tf.keras.optimizers.Adam(.001), loss="sparse_categorical_crossentropy")
    # Validation controls early stopping; test is never used to tune training/thresholds.
    model.fit(dataset("train"), validation_data=dataset("validation"), epochs=args.epochs,
              callbacks=[tf.keras.callbacks.TerminateOnNaN(), tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)], verbose=2)
    export = Export(model)
    concrete = export.serve.get_concrete_function()
    folder = pathlib.Path(args.output)
    folder.mkdir(parents=True, exist_ok=True)
    # Freeze Keras3 variables explicitly on this pinned TF2.20 toolchain. Merely
    # saving a resource-based graph can leave invalid READ_VARIABLE nodes in LiteRT.
    frozen = convert_variables_to_constants_v2(concrete)
    frozen_module = tf.Module()
    frozen_module.serve = frozen
    tf.saved_model.save(frozen_module, str(folder / "float.savedmodel"), signatures={"serving_default": frozen})
    converter = tf.lite.TFLiteConverter.from_saved_model(str(folder / "float.savedmodel"))
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converted = converter.convert()
    runtime = tf.lite.Interpreter(model_content=converted)
    runtime.allocate_tensors()
    matches, total = 0, 0
    for row in [r for r in rows if r["split"] == "validation"]:
        for w in windows(waveform(row["path"])):
            expected = export.serve(tf.constant(w)).numpy()
            runtime.set_tensor(runtime.get_input_details()[0]["index"], w)
            runtime.invoke()
            actual = runtime.get_tensor(runtime.get_output_details()[0]["index"])
            if not np.isfinite(expected).all() or not np.isfinite(actual).all():
                raise ValueError("Non-finite float/export inference; candidate cannot be published")
            if expected.shape != (1, 4) or actual.shape != (1, 4) or (actual < 0).any() or (actual > 1).any() or abs(actual.sum()-1) > .001:
                raise ValueError("Invalid candidate probability tensor")
            matches += int(expected.argmax() == actual.argmax())
            total += 1
    if not total:
        raise ValueError("No validation parity windows")
    (folder / "candidate.tflite").write_bytes(converted)
    report = {"status": "SYNTHETIC_TOOLCHAIN_TEST_ONLY" if any(r["license"] == "GENERATED_TOOLCHAIN_TEST_ONLY" for r in rows) else "CANDIDATE_NOT_GRADUATED", "seed": args.seed, "classes": CLASSES,
              "sha256": hashlib.sha256(converted).hexdigest(), "size_bytes": len(converted),
              "input": [15600], "output": [1, 4], "sample_rate_hz": 16000,
              "preprocessing": "STFT400/160/512, power,64mel125..7500Hz,log(x+.001); inside graph",
              "parity_split": "validation", "validation_float_quantized_decision_agreement": matches/total if total else None,
              "validation_windows": total, "automatic_dispatch": False,
              "event_metrics": "Run frozen-threshold event evaluator; clip accuracy is not graduation"}
    (folder / "candidate.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", nargs="?")
    parser.add_argument("--output", default=".local/ml-candidate")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--seed", type=int, default=7)
    sys.exit(run(parser.parse_args()))
