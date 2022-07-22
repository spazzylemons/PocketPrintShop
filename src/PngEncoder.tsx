import { Buffer } from 'buffer';
import { NativeModules } from 'react-native';

const { PngEncoderModule } = NativeModules;

namespace PngEncoder {
    export function encode(pixels: Uint32Array, width: number, height: number): Promise<string> {
        return PngEncoderModule.encode(Buffer.from(pixels.buffer).toString('base64'), width, height);
    }
}

export default PngEncoder;
