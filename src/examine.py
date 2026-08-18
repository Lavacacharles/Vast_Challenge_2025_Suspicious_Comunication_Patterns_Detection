import os
import json
from pathlib import Path
from collections import Counter

import pandas as pd


MAX_SAMPLE_CHARS = 1200
MAX_LIST_SAMPLE = 3
MAX_DICT_KEYS = 20


# =========================================================
# Helpers
# =========================================================

def truncate(text, limit=MAX_SAMPLE_CHARS):
    text = str(text)
    return text if len(text) <= limit else text[:limit] + " ..."


def safe_json(obj):
    try:
        return json.dumps(obj, indent=2, ensure_ascii=False)
    except Exception:
        return str(obj)


def infer_type(value):
    if value is None:
        return "null"

    if isinstance(value, bool):
        return "bool"

    if isinstance(value, int):
        return "int"

    if isinstance(value, float):
        return "float"

    if isinstance(value, str):
        return "str"

    if isinstance(value, list):
        return "list"

    if isinstance(value, dict):
        return "dict"

    return type(value).__name__


# =========================================================
# Graph detection
# =========================================================

def is_valid_graph(data):
    """
    Detecta si el JSON sigue realmente
    una estructura node-link graph.
    """

    if not isinstance(data, dict):
        return False

    if "nodes" not in data or "links" not in data:
        return False

    nodes = data["nodes"]
    links = data["links"]

    if not isinstance(nodes, list):
        return False

    if not isinstance(links, list):
        return False

    if len(nodes) == 0 or len(links) == 0:
        return False

    # Validar estructura node
    if not isinstance(nodes[0], dict):
        return False

    # Validar estructura edge
    if not isinstance(links[0], dict):
        return False

    edge_keys = set(links[0].keys())

    # Grafo válido debe tener source-target
    if not {"source", "target"}.issubset(edge_keys):
        return False

    return True


# =========================================================
# Schema inference
# =========================================================

def infer_schema_from_records(records):
    """
    Infere tipos de columnas/atributos
    desde una lista de diccionarios.
    """

    schema = {}

    for record in records[:100]:

        if not isinstance(record, dict):
            continue

        for key, value in record.items():
            schema.setdefault(key, Counter())
            schema[key][infer_type(value)] += 1

    return {
        key: dict(counter)
        for key, counter in schema.items()
    }


# =========================================================
# Structured JSON analysis
# =========================================================

def analyze_generic_json(data, filename):

    report = f"## File: {filename} (JSON)\n"

    report += "- **Type:** Generic JSON Structure\n"

    report += f"- **Top-Level Python Type:** `{type(data).__name__}`\n"

    # Dict
    if isinstance(data, dict):

        keys = list(data.keys())

        report += f"- **Top-Level Keys ({len(keys)}):**\n"

        for key in keys[:MAX_DICT_KEYS]:
            value = data[key]
            report += (
                f"  - `{key}` → "
                f"`{infer_type(value)}`\n"
            )

        # Nested schema inference
        report += "\n### Key Details\n"

        for key in keys[:10]:

            value = data[key]

            report += f"#### `{key}`\n"

            report += (
                f"- Type: `{infer_type(value)}`\n"
            )

            if isinstance(value, list):

                report += f"- Length: {len(value)}\n"

                if len(value) > 0:

                    report += (
                        f"- Item Type: "
                        f"`{infer_type(value[0])}`\n"
                    )

                    if isinstance(value[0], dict):

                        schema = infer_schema_from_records(value)

                        report += "- Schema:\n"

                        for col, types in schema.items():
                            report += (
                                f"  - `{col}`: {types}\n"
                            )

            elif isinstance(value, dict):

                nested_keys = list(value.keys())[:15]

                report += (
                    f"- Nested Keys: {nested_keys}\n"
                )

    # List
    elif isinstance(data, list):

        report += f"- **Length:** {len(data)}\n"

        if len(data) > 0:

            report += (
                f"- **Item Type:** "
                f"`{infer_type(data[0])}`\n"
            )

            if isinstance(data[0], dict):

                schema = infer_schema_from_records(data)

                report += "\n### Inferred Schema\n"

                for col, types in schema.items():
                    report += (
                        f"- `{col}`: {types}\n"
                    )

    report += "\n### Sample\n\n"

    report += "```json\n"

    report += truncate(safe_json(data))

    report += "\n```\n"

    return report


# =========================================================
# Graph analysis
# =========================================================

def analyze_graph_json(data, filename):

    nodes = data["nodes"]
    links = data["links"]

    report = f"## File: {filename} (Graph JSON)\n"

    report += "- **Type:** Directed/Undirected Graph Structure\n"

    report += f"- **Nodes:** {len(nodes)}\n"

    report += f"- **Links:** {len(links)}\n"

    # Node schema
    if nodes:

        node_schema = infer_schema_from_records(nodes)

        report += "\n### Node Schema\n"

        for col, types in node_schema.items():
            report += f"- `{col}`: {types}\n"

        report += "\n### Node Sample\n"

        report += "```json\n"

        report += truncate(safe_json(nodes[0]))

        report += "\n```\n"

    # Link schema
    if links:

        link_schema = infer_schema_from_records(links)

        report += "\n### Link Schema\n"

        for col, types in link_schema.items():
            report += f"- `{col}`: {types}\n"

        report += "\n### Link Sample\n"

        report += "```json\n"

        report += truncate(safe_json(links[0]))

        report += "\n```\n"

    return report


# =========================================================
# CSV analysis
# =========================================================

def analyze_csv(file_path, filename):

    df = pd.read_csv(file_path)

    report = f"## File: {filename} (CSV)\n"

    report += f"- **Rows:** {len(df)}\n"

    report += f"- **Columns ({len(df.columns)}):**\n"

    for col in df.columns:

        dtype = str(df[col].dtype)

        nulls = int(df[col].isna().sum())

        unique = int(df[col].nunique())

        report += (
            f"  - `{col}` "
            f"(dtype={dtype}, "
            f"nulls={nulls}, "
            f"unique={unique})\n"
        )

    report += "\n### Sample\n\n"

    report += df.head(5).to_markdown(index=False)

    report += "\n"

    return report


# =========================================================
# Main
# =========================================================

def analyze_data_directory(directory):

    context_report = (
        "# Dataset Context Report\n\n"
        "Generated for LLM/Agent ingestion.\n\n"
    )

    directory = Path(directory)

    for file_path in sorted(directory.iterdir()):

        if not file_path.is_file():
            continue

        filename = file_path.name

        try:

            # JSON
            if filename.endswith(".json"):

                with open(
                    file_path,
                    "r",
                    encoding="utf-8"
                ) as f:

                    data = json.load(f)

                if is_valid_graph(data):

                    context_report += analyze_graph_json(
                        data,
                        filename
                    )

                else:

                    context_report += analyze_generic_json(
                        data,
                        filename
                    )

            # CSV
            elif filename.endswith(".csv"):

                context_report += analyze_csv(
                    file_path,
                    filename
                )

            context_report += "\n---\n\n"

        except Exception as e:

            context_report += (
                f"## File: {filename}\n"
                f"- ERROR: `{str(e)}`\n\n"
                "---\n\n"
            )

    return context_report


# =========================================================
# Run
# =========================================================

data_folder = (
    r"C:\Users\LENOVO\Documents\Utec\2026 - 1"
    r"\Visualizacion de datos\VAST 2025"
    r"\observable\src\data"
)

report = analyze_data_directory(data_folder)

output_file = "data_context_for_llm.md"

with open(output_file, "w", encoding="utf-8") as f:
    f.write(report)

print(f"Generated: {output_file}")