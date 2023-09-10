import fetchSSE from './fetch-sse';

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
    role: Role;
    id: string;
    conversationId: string;
    parentMessageId?: string;
    text: string;
}

interface GPTMessage {
    author: {
        role: Role;
    };
    content: {
        content_type: 'text' | 'image' | 'choice';
        parts: string[];
    };
    metadata: {};
}

interface GPTResponse {
    message: {
        id: string;
        author: {
            role: Role;
            name?: string;
            metadata: string[];
        };
        create_time: number;
        update_time?: number;
        content: {
            content_type: 'text' | 'image' | 'choice';
            parts: string[];
        };
        status: 'finished_successfully' | 'failed' | 'in_progress';
        end_turn?: boolean;
        weight: number;
        metadata: {
            timestamp_?: string;
            message_type?: string;
            model_slug?: string;
            parent_id?: string;
        };
        recipient: 'all';
    };

    moderation_response?: {
        flagged: boolean;
        blocked: boolean;
        moderation_id: string;
    };

    conversation_id: string;
    error: string;
}

export class GPT {
    private token: string;
    private proxy?: string;
    private organization?: string;
    private defaultAPI: string = 'https://api.openai.com/v1/chat/completions';
    private history: Message[] = [];
    conversationId?: string;
    model: string = 'text-davinci-002-render-sha';

    // callbacks
    public onProgress?: (message: Message) => void;
    public onPrompt?: (message: Message) => void;

    constructor(token: string) {
        this.token = token;
    }

    private mapMessages(messages: Message[]): GPTMessage[] {
        return messages.map((message) => {
            return {
                author: {
                    role: message.role
                },
                content: {
                    content_type: 'text',
                    parts: [message.text]
                },
                metadata: {}
            };
        });
    }

    private addHistory(message: Message) {
        this.history.push(message);
    }
    
    addMessage(data: { role: Role, text: string }) {
        this.addHistory({
            role: data.role,
            id: '',
            conversationId: this.conversationId || '',
            text: data.text
        });
    }

    useProxy(proxy?: string) {
        this.proxy = proxy;
    }

    useOrganization(organization?: string) {
        this.organization = organization;
    }

    getHistory(): Message[] {
        return this.history;
    }

    removeFromHistory(id: string | number) {
        if(typeof id == 'number') {
            this.history.splice(id, 1);
        } else {
            this.history = this.history.filter((message) => message.id != id);
        }
    }

    clearHistory() {
        this.history = [];
    }

    getLastMessage(): Message {
        return this.history[this.history.length - 1];
    }

    async sendMessage(message: string) {
        let url = this.proxy || this.defaultAPI;
        let headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'text/event-stream',
        };

        if (this.organization) headers['OpenAI-Organization'] = this.organization;

        this.addMessage({
            role: 'user',
            text: message
        });

        if(this.onPrompt) {
            this.onPrompt(this.getLastMessage());
        }

        let body = {
            action: 'next',
            messages: this.mapMessages(this.history),
            parent_message_id: 'd42fb76d-984a-4234-b02c-53fdcd53a0ba',
            suggestions: [],
            model: this.model,
            history_and_training_disabled: false
        };

        let result: Message = {
            role: 'assistant',
            id: '',
            conversationId: '',
            text: ''
        };

        return new Promise((resolve, reject) => {
            fetchSSE(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
                onMessage: (message) => {
                    if(message == '[DONE]') {
                        resolve(result);
                    } else {
                        try {
                            let response: GPTResponse = JSON.parse(message);
                            
                            if(response.conversation_id) {
                                result.conversationId = response.conversation_id;
                                this.conversationId = response.conversation_id;
                            }
                            
                            if(response.message) {
                                result.role = response.message.author.role;
                                result.id = response.message.id;
                                result.text = response.message.content.parts[0];

                                if(this.onProgress) {
                                    this.onProgress(result);
                                }
                            }
                        } catch {}
                    }
                }
            });
        });
    }
}