import { createHash } from "node:crypto";
import { open, readFile, readdir, rename, rm, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const ZIP32_LIMIT = 0xffffffff;
const UTF8_FLAG = 0x0800;
const DOS_DATE_1980_01_01 = 0x0021;
const VERSION_NEEDED = 20;
const VERSION_MADE_BY_UNIX = (3 << 8) | VERSION_NEEDED;
const REGULAR_FILE_MODE = (0o100644 << 16) >>> 0;

const CRC_TABLE = Object.freeze(Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc >>> 0;
}));

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function listFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.push({ absolute, path: relative(root, absolute).split(sep).join("/") });
      else throw new Error(`unsupported catalog entry: ${relative(root, absolute)}`);
    }
  }
  await walk(root);
  return files.sort((left, right) => compareStrings(left.path, right.path));
}

function localHeader(name, size, crc) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(VERSION_NEEDED, 4);
  header.writeUInt16LE(UTF8_FLAG, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(DOS_DATE_1980_01_01, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(name.length, 26);
  return header;
}

function centralHeader(name, size, crc, offset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(VERSION_MADE_BY_UNIX, 4);
  header.writeUInt16LE(VERSION_NEEDED, 6);
  header.writeUInt16LE(UTF8_FLAG, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(DOS_DATE_1980_01_01, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(size, 20);
  header.writeUInt32LE(size, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt32LE(REGULAR_FILE_MODE, 38);
  header.writeUInt32LE(offset, 42);
  return header;
}

function endOfCentralDirectory(count, size, offset) {
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50, 0);
  footer.writeUInt16LE(count, 8);
  footer.writeUInt16LE(count, 10);
  footer.writeUInt32LE(size, 12);
  footer.writeUInt32LE(offset, 16);
  return footer;
}

function assertZip32(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= ZIP32_LIMIT) {
    throw new Error(`${label} exceeds deterministic ZIP32 limits`);
  }
}

async function writeAt(handle, buffer, position) {
  await handle.write(buffer, 0, buffer.length, position);
  return position + buffer.length;
}

export async function createDeterministicZip({ sourcePath, outputPath }) {
  if (typeof sourcePath !== "string" || sourcePath.trim() === "") throw new TypeError("sourcePath is required");
  if (typeof outputPath !== "string" || outputPath.trim() === "") throw new TypeError("outputPath is required");
  const source = resolve(sourcePath);
  const output = resolve(outputPath);
  if (output === source || output.startsWith(`${source}${sep}`)) throw new Error("outputPath must be outside sourcePath");
  if (!(await stat(source)).isDirectory()) throw new Error("sourcePath must be a directory");
  const files = await listFiles(source);
  if (files.length > 0xffff) throw new Error("file count exceeds deterministic ZIP32 limits");
  const temporary = `${output}.tmp-${process.pid}-${Date.now()}`;
  const central = [];
  let position = 0;
  const handle = await open(temporary, "wx");
  try {
    for (const file of files) {
      const name = Buffer.from(file.path, "utf8");
      if (name.length > 0xffff) throw new Error(`ZIP path is too long: ${file.path}`);
      const content = await readFile(file.absolute);
      assertZip32(content.length, `file ${file.path}`);
      assertZip32(position, "archive offset");
      const crc = crc32(content);
      central.push({ name, size: content.length, crc, offset: position });
      position = await writeAt(handle, localHeader(name, content.length, crc), position);
      position = await writeAt(handle, name, position);
      position = await writeAt(handle, content, position);
    }
    const centralOffset = position;
    for (const entry of central) {
      position = await writeAt(handle, centralHeader(entry.name, entry.size, entry.crc, entry.offset), position);
      position = await writeAt(handle, entry.name, position);
    }
    const centralSize = position - centralOffset;
    assertZip32(centralOffset, "central directory offset");
    assertZip32(centralSize, "central directory size");
    position = await writeAt(handle, endOfCentralDirectory(files.length, centralSize, centralOffset), position);
  } catch (error) {
    await handle.close();
    await rm(temporary, { force: true });
    throw error;
  }
  await handle.close();
  await rm(output, { force: true });
  await rename(temporary, output);
  const archive = await readFile(output);
  return {
    path: output,
    file_count: files.length,
    size: position,
    sha256: createHash("sha256").update(archive).digest("hex"),
  };
}
