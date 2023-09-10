import {
    createParser
} from "eventsource-parser";

interface FetchInit extends RequestInit {
    onMessage?: (message: string) => void;
    onError?: (error: Error) => void;
    headers?: HeadersInit;
}

async function* streamAsyncIterable(stream: ReadableStream) {
    let reader = stream.getReader();

    try {
        while (true) {
            const {
                done,
                value
            } = await reader.read();
            if (done) {
                return;
            }
            yield value;
        }
    } finally {
        reader.releaseLock();
    }
}

export default async function fetchSSE(url: string, options: FetchInit) {
    const { onMessage, onError, ...fetchOptions } = options;
    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
        let reason;
        try {
            reason = await res.text();
        } catch (err) {
            reason = res.statusText;
        }

        const msg = `ChatGPT error ${res.status}: ${reason}`;
        throw new Error(msg);
    }

    const parser = createParser((event) => {
        if (event.type === "event" && onMessage != undefined) onMessage(event.data);
    });

    const feed = (chunk: string) => {
        var _a;
        let response = null;
        try {
            response = JSON.parse(chunk);
        } catch {}
        if (((_a = response == null ? void 0 : response.detail) == null ? void 0 : _a.type) === "invalid_request_error") {
            let error = new Error(`ChatGPT error ${response.detail.message}: ${response.detail.code} (${response.detail.type})`);

            if (onError) onError(error);
            else console.error(error);

            return;
        }
        parser.feed(chunk);
    };

    for await (const chunk of streamAsyncIterable(res.body as any as ReadableStream)) {
        const str = new TextDecoder().decode(chunk);
        feed(str);
    }
}