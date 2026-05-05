import { Client, Partials } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import "dotenv/config";
// Hello! 👋
// :D

const token = process.env.TOKEN;
const client = new Client({
    intents: [
        'Guilds',
        'GuildMembers',
        'GuildMessages',
        'GuildMessageReactions',
        'GuildVoiceStates',
        'GuildModeration',
        'MessageContent',
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
});

const referenceImages = [
    '1.jpg',
    '2.jpg',
    '3.jpg',
    '4.jpg'
];

const referenceHashes = new Map();

async function computeDhash(buffer) {
    const data = await sharp(buffer)
        .resize(9, 8, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();

    let hash = 0n;
    for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
            const left = data[y * 9 + x];
            const right = data[y * 9 + x + 1];
            hash = (hash << 1n) | (left > right ? 1n : 0n);
        }
    }

    return hash;
}

function hammingDistance(a, b) {
    let x = a ^ b;
    let distance = 0;
    while (x) {
        distance += 1;
        x &= x - 1n;
    }
    return distance;
}

async function loadReferenceHashes() {
    for (const filename of referenceImages) {
        const filePath = path.join(process.cwd(), 'references', filename);
        const buffer = await fs.readFile(filePath);
        const hash = await computeDhash(buffer);
        referenceHashes.set(filename, hash);
    }
}

client.on('clientReady', async () => {
    await loadReferenceHashes();
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
    if (!msg.attachments.size) {
        return;
    }

    const threshold = 10;
    const hits = [];

    for (const attachment of msg.attachments.values()) {
        if (!attachment.contentType?.startsWith('image/')) {
            continue;
        }

        const response = await fetch(attachment.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const hash = await computeDhash(buffer);

        for (const [name, refHash] of referenceHashes.entries()) {
            const distance = hammingDistance(hash, refHash);
            if (distance <= threshold) {
                hits.push({ attachment: attachment.name ?? attachment.id, reference: name, distance });
                break;
            }
        }
    }

    if (hits.length) {
        const details = hits.map(hit => `${hit.attachment} ~ ${hit.reference} (d=${hit.distance})`).join(', ');
        await msg.reply(`Scam image detected: ${details}`);
    }
});

client.login(token)
