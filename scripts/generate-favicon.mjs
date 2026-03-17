import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import toIco from "to-ico";

const pngPath = join(process.cwd(), "assets", "favicon.png");
const icoPath = join(process.cwd(), "apps", "app", "src", "app", "favicon.ico");

const png = await readFile(pngPath);
const ico = await toIco(png, { resize: true, sizes: [16, 32, 48] });
await writeFile(icoPath, ico);
console.log("favicon.ico created at", icoPath);
