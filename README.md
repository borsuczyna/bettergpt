# About

bettergpt is a node module that allows you to easily interact with the [ChatGPT](https://chat.openai.com/)

# Install
```bash
npm install bettergpt
```

# Example
```js
const { GPT } = require("bettergpt")

async function example() {
    let gpt = new GPT('your_api_key');
    gpt.useProxy('https://ai.fakeopen.com/api/conversation');

    let response = await gpt.sendMessage('hey!');
    console.log(response)
}

example()
```

### History
```ts
import GPT, { Message } from './bettergpt';

function example() {
    let gpt = new GPT('your_api_key');
    gpt.useProxy('https://ai.fakeopen.com/api/conversation');

    gpt.addMessage({
        role: 'system',
        text: `You can only response with JSON format from now, {
            message: "your message",
        }`,
    })

    gpt.onProgress = (message: Message) => {
        console.log(message.text);
    }

    let result = await gpt.sendMessage("hey!");
    console.log(result);
}

example();
```

## npm
[npm module](https://www.npmjs.com/package/bettergpt)