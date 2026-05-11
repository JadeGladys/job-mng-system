import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

Object.defineProperty(global, "TextEncoder", {
    writable: true,
    value: TextEncoder,
});

Object.defineProperty(global, "TextDecoder", {
    writable: true,
    value: TextDecoder,
});
