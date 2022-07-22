import UsbSerial from './UsbSerial';
import PngEncoder from './PngEncoder';

export type PrinterImage = {
    png: string,
    width: number,
    height: number,
}

enum Command {
    Init = 1,
    Print = 2,
    Fill = 4,
    Status = 15,
}

/** The default palette to use for rendering. */
const DEFAULT_PALETTE = [0xff000000, 0xff555555, 0xffaaaaaa, 0xffffffff];

const PRINT_TIMEOUT = 500;

/**
 * Allows asynchronoous reading of the printer packets.
 */
class AsyncStream {
    /** The current resolve() function for the pending available() call, if any. */
    public availableResolve: ((result: boolean) => void) | null;
    /** The queue of bytes read. */
    public dataQueue: number[];

    /**
     * Create a new AsyncStream.
     */
    constructor() {
        this.availableResolve = null;
        this.dataQueue = [];
    }

    /**
     * @return True if data is available.
     */
    public available(): Promise<boolean> {
        return new Promise((res, rej) => {
            this.availableResolve = res;
        });
    }

    /**
     * @param length The number of bytes to read.
     * @return The next bytes in the stream.
     */
    public async nextSlice(length: number): Promise<number[]> {
        while (this.dataQueue.length < length) {
            if (!await this.available()) {
                throw 'unexpected end of packet';
            }
        }
        return this.dataQueue.splice(0, length);
    }

    /**
     * @return The next byte in the stream.
     */
    public async next(): Promise<number> {
        return (await this.nextSlice(1))[0];
    }

    /**
     * @return The next word in the stream.
     */
    public async nextWord(): Promise<number> {
        const [lo, hi] = await this.nextSlice(2);
        return lo | (hi << 8);
    }

    /**
     * @param value True if more data is available, false otherwise.
     */
    public setAvailable(value: boolean): void {
        if (this.availableResolve !== null) {
            this.availableResolve(value);
            this.availableResolve = null;
        }
    }
}

async function processData(stream: AsyncStream): Promise<PrinterImage> {
    // width of a print is always 160
    const width = 160;
    // height depends on the amount of data provided
    let height = 0;
    // the vram collects data from the game
    let vram: number[] = [];
    // the parts of the print to stitch together
    const imageParts: { payload: number[], tiles: number[] }[] = [];

    while (await stream.available()) {
        const magic = await stream.nextWord();
        if (magic !== 0x3388) {
            throw 'magic data missing - unreliable connection?';
        }
        const command = await stream.next();
        const compression = await stream.next();
        const size = await stream.nextWord();
        const payload = await stream.nextSlice(size);
        const checksum = await stream.nextWord();
        let compare = command + compression + (size & 0xff) + (size >> 8);
        for (let k = 0; k < size; k++) {
            compare = (compare + payload[k]) & 0xffff;
        }
        // ignore ack
        await stream.next();
        // perform checksum check
        const status = await stream.next();
        if (compare != checksum) {
            if ((status & 1) == 0) {
                throw 'checksum error but emulator did not report error - unreliable connection?';
            } else {
                continue;
            }
        }
        // process packet
        switch (command) {
            case Command.Init: {
                // initialize the vram
                vram = [];
                break;
            }
            case Command.Print: {
                // add part of the image
                imageParts.push({ payload, tiles: vram.slice() });
                height += Math.floor(vram.length / 40);
                break;
            }
            case Command.Fill: {
                // read payload as tile data
                if (compression !== 0) {
                    // handle RLE-compressed data
                    // (based on docs at https://shonumi.github.io/articles/art2.html)
                    let j = 0;
                    while (j < payload.length) {
                        if ((payload[j] & 0x80) !== 0) {
                            const length = (payload[j++] & 0x7f) + 2;
                            const value = payload[j++];
                            for (let k = 0; k < length; k++) vram.push(value);
                        } else {
                            const length = payload[j++] + 1;
                            for (let k = 0; k < length; k++) vram.push(payload[j++]);
                        }
                    }
                } else {
                    // paste data verbatim
                    vram = vram.concat(payload);
                }
                break;
            }
            default: {
                // other packets can be ignored
                break;
            }
        }
    }

    // convert to bitmap
    const pixels = new Uint32Array(new ArrayBuffer(width * height * 4));
    let y = 0;
    for (const { payload, tiles } of imageParts) {
        const palette = payload[2];
        let i = 0;
        while (i < tiles.length) {
            for (let x = 0; x < width; x += 8) {
                for (let py = 0; py < 8; py++) {
                    let lo = tiles[i++];
                    let hi = tiles[i++];
                    for (let px = 0; px < 8; px++) {
                        const paletteIndex = (lo >> 7) | ((hi >> 6) & 2);
                        const paletteColor = 3 - ((palette >> (paletteIndex << 1)) & 3);
                        pixels[width * (y + py) + x + px] = DEFAULT_PALETTE[paletteColor];
                        lo = (lo << 1) & 0xff;
                        hi = (hi << 1) & 0xff;
                    }
                }
            }
            y += 8;
        }
    }
    // encode to PNG
    const png = await PngEncoder.encode(pixels, width, height);
    return { png, width, height };
}

class PacketProcessor {
    private timeout: NodeJS.Timeout;
    private stream: AsyncStream;
    private promise: Promise<PrinterImage>;
    private readonly onTimeout: () => void;

    constructor(onTimeout: () => void) {
        this.timeout = setTimeout(onTimeout, PRINT_TIMEOUT);
        this.stream = new AsyncStream();
        this.promise = processData(this.stream);
        this.onTimeout = onTimeout;
    }

    public read(data: Buffer) {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.onTimeout, PRINT_TIMEOUT);
        this.stream.dataQueue.push(...data);
        this.stream.setAvailable(true);
    }

    public finish(): Promise<PrinterImage> {
        clearTimeout(this.timeout);
        this.stream.setAvailable(false);
        return this.promise;
    }
}

/**
 * @param imageConsumer Called everr time an image is parsed.
 * @return A callback to execute every time the device is disconnected.
 */
export default function parsePackets(imageConsumer: (image: PrinterImage) => void): () => void {
    let processor: PacketProcessor | null = null;

    function endData() {
        processor = null;
    }

    UsbSerial.onRead(data => {
        if (processor === null) {
            processor = new PacketProcessor(async () => {
                if (processor !== null) {
                    imageConsumer(await processor.finish());
                    processor = null;
                }
            });
        }
        processor.read(data);
    });

    return endData;
}
