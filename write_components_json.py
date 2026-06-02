import json

data = {
    "style": "default",
    "rsc": False,
    "tsx": True,
    "tailwind": {
        "config": "tailwind.config.ts",
        "css": "src/index.css",
        "baseColor": "slate",
        "cssVariables": True,
        "prefix": ""
    },
    "aliases": {
        "components": "@/components",
        "utils": "@/lib/utils",
        "ui": "@/components/ui",
        "lib": "@/lib",
        "hooks": "@/hooks"
    },
    "iconLibrary": "lucide"
}

with open("components.json", "w") as f:
    json.dump(data, f, indent=2)

print("done")
