import fs from 'fs';
const data = {
  style: "default",
  rsc: false,
  tsx: true,
  tailwind: {
    config: "tailwind.config.ts",
    css: "src/index.css",
    baseColor: "slate",
    cssVariables: true,
    prefix: ""
  },
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks"
  },
  iconLibrary: "lucide"
};
fs.writeFileSync('components.json', JSON.stringify(data, null, 2));
console.log('done');
