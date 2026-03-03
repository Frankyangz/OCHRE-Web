import { fetchItem } from 'ochre-sdk';

export async function load() {
    const { error, item: set } = await fetchItem(
        '240e6e06-9d05-4210-aa83-f4190639886d',
        'set',
    );
    if (error !== null) {
        throw new Error('Response failed!');
    }
    return set;
}