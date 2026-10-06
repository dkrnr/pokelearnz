"""Lossless TTF → WOFF using Python's standard library; preserve all font tables."""
from pathlib import Path
import struct, zlib
for name in ('ReadexPro-Regular', 'ReadexPro-Bold'):
    source = Path('assets/fonts') / (name + '.ttf')
    data = source.read_bytes()
    flavor, count = struct.unpack_from('>IH', data)
    offset = 44 + 20 * count
    directory, payload = [], bytearray()
    sfnt_size = 12 + count * 16
    for i in range(count):
        tag, checksum, start, length = struct.unpack_from('>4sIII', data, 12 + i * 16)
        raw = data[start:start + length]
        compressed = zlib.compress(raw, 9)
        chunk = compressed if len(compressed) < len(raw) else raw
        directory.append(struct.pack('>4sIIII', tag, offset, len(chunk), length, checksum))
        payload.extend(chunk)
        padding = (-len(chunk)) % 4
        payload.extend(bytes(padding))
        offset += len(chunk) + padding
        sfnt_size += length + (-length) % 4
    header = struct.pack('>4sIIHHIHHIIIII', b'wOFF', flavor, offset, count, 0, sfnt_size, 1, 0, 0, 0, 0, 0, 0)
    target = source.with_suffix('.woff')
    target.write_bytes(header + b''.join(directory) + payload)
    print(source.name, len(data), '→', len(target.read_bytes()))
