const axios = require('axios');
const SteamNewsState = require('../Schemas/steamNewsState');

const DEFAULT_APP_ID = '594650';
const DEFAULT_LANGUAGE = 'spanish';
const DEFAULT_INTERVAL_MINUTES = 10;
const DEFAULT_FETCH_COUNT = 10;
const STEAM_NEWS_URL = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/';
const DISCORD_MESSAGE_LIMIT = 2000;
const MESSAGE_CHUNK_LIMIT = 1900;
const CHANNEL_HISTORY_LIMIT = 100;
const STEAM_CLAN_IMAGE_BASE_URL = 'https://clan.cloudflare.steamstatic.com/images';

let intervalId = null;
let isChecking = false;

function decodeSteamEntities(content = '') {
    return content
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

async function fetchSteamNews(appId, language) {
    const response = await axios.get(STEAM_NEWS_URL, {
        params: {
            appid: appId,
            count: Number(process.env.STEAM_NEWS_FETCH_COUNT) || DEFAULT_FETCH_COUNT,
            maxlength: 0,
            format: 'json',
            l: language,
        },
        timeout: 15000,
    });

    return response.data?.appnews?.newsitems || [];
}

function buildSteamNewsUrl(newsItem, appId, language) {
    if (newsItem.url) return newsItem.url;
    if (newsItem.gid) {
        return `https://store.steampowered.com/news/app/${appId}/view/${newsItem.gid}?l=${language}`;
    }

    return `https://store.steampowered.com/news/app/${appId}`;
}

function steamClanImageToUrl(clanId, imagePath) {
    const cleanImagePath = imagePath.replace(/[.,;:!?]+$/, '');
    return `${STEAM_CLAN_IMAGE_BASE_URL}/${clanId}/${cleanImagePath}`;
}

function stripSteamTags(text = '') {
    return decodeSteamEntities(text)
        .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '**$1**')
        .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '*$1*')
        .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '$1')
        .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '[$2]($1)')
        .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '$1')
        .replace(/\[\/?[^\]]+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function steamTableToText(tableContent = '') {
    const rows = [...tableContent.matchAll(/\[tr\]([\s\S]*?)\[\/tr\]/gi)]
        .map(row => {
            return [...row[1].matchAll(/\[(?:td|th)\]([\s\S]*?)\[\/(?:td|th)\]/gi)]
                .map(cell => stripSteamTags(cell[1]));
        })
        .filter(row => row.length);

    if (!rows.length) return '';

    const columnCount = Math.max(...rows.map(row => row.length));
    const widths = Array(columnCount).fill(0);

    for (const row of rows) {
        for (let i = 0; i < columnCount; i++) {
            widths[i] = Math.max(widths[i], String(row[i] || '').length);
        }
    }

    const lines = rows.map(row => {
        return Array.from({ length: columnCount }, (_, i) => {
            return String(row[i] || '').padEnd(widths[i]);
        }).join(' | ');
    });

    return `\n\n\`\`\`text\n${lines.join('\n')}\n\`\`\`\n\n`;
}

function normalizeSteamLists(text = '') {
    let level = 0;

    return text
        .replace(/\[list\]/gi, () => {
            level++;
            return '\n';
        })
        .replace(/\[\/list\]/gi, () => {
            level = Math.max(0, level - 1);
            return '\n';
        })
        .replace(/\[\*\]\s*/gi, () => {
            const indent = '  '.repeat(Math.max(0, level - 1));
            return `\n${indent}- `;
        });
}

function trimBlock(text = '') {
    return text
        .replace(/^\n+/, '')
        .replace(/\n+$/, '');
}

function normalizeSteamContent(content = '') {
    return normalizeSteamLists(decodeSteamEntities(content))
        .replace(/\r/g, '')

        // Imagenes Steam dentro de [img]...[/img]
        .replace(/\[img\]\s*\{STEAM_CLAN_IMAGE\}\/(\d+)\/([^\[\]\s]+)\s*\[\/img\]/gi, (_, clanId, imagePath) => {
            return `\n\n{{IMAGE:${steamClanImageToUrl(clanId, imagePath)}}}\n\n`;
        })

        // Imagenes con URL normal dentro de [img]...[/img]
        .replace(/\[img\]\s*([\s\S]*?)\s*\[\/img\]/gi, (_, imageUrl) => {
            const cleanUrl = imageUrl.trim();
            return cleanUrl ? `\n\n{{IMAGE:${cleanUrl}}}\n\n` : '';
        })

        // Imagenes Steam sueltas
        .replace(/\{STEAM_CLAN_IMAGE\}\/(\d+)\/([^\s\])}]+)/gi, (_, clanId, imagePath) => {
            return `\n\n{{IMAGE:${steamClanImageToUrl(clanId, imagePath)}}}\n\n`;
        })

        // Tablas Steam
        .replace(/\[table\]([\s\S]*?)\[\/table\]/gi, (_, tableContent) => {
            return steamTableToText(tableContent);
        })

        // Saltos HTML
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')

        // Titulos Steam
        .replace(/\[h1\]([\s\S]*?)\[\/h1\]/gi, '\n\n# $1\n\n')
        .replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi, '\n\n## $1\n\n')
        .replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, '\n\n### $1\n\n')
        .replace(/\[h[4-6]\]([\s\S]*?)\[\/h[4-6]\]/gi, '\n\n**$1**\n\n')

        // Formato basico
        .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '**$1**')
        .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '*$1*')
        .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '$1')

        // Links
        .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '[$2]($1)')
        .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '$1')

        // Videos
        .replace(/\[previewyoutube[^\]]*\][\s\S]*?\[\/previewyoutube\]/gi, '')

        // Limpieza de BBCode restante
        .replace(/\[\/?[^\]]+\]/g, '')

        // Arreglar espacios y saltos
        .replace(/[ \t]+\n/g, '\n')
        // NO borrar espacios despues de salto de linea, porque son la sangria de listas
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function splitMessage(text, maxLength = MESSAGE_CHUNK_LIMIT) {
    text = trimBlock(text);

    if (!text || text.length <= maxLength) {
        return [text || 'Sin contenido disponible.'];
    }

    const chunks = [];
    let remaining = text;

    while (remaining.length > maxLength) {
        let splitAt = remaining.lastIndexOf('\n\n', maxLength);

        if (splitAt < maxLength * 0.5) {
            splitAt = remaining.lastIndexOf('\n', maxLength);
        }

        if (splitAt < maxLength * 0.5) {
            splitAt = remaining.lastIndexOf(' ', maxLength);
        }

        if (splitAt < maxLength * 0.5) {
            splitAt = maxLength;
        }

        chunks.push(trimBlock(remaining.slice(0, splitAt)));
        remaining = trimBlock(remaining.slice(splitAt));
    }

    if (remaining) chunks.push(trimBlock(remaining));
    return chunks;
}

function contentToBlocks(content) {
    const normalized = normalizeSteamContent(content);
    const blocks = [];
    const imagePattern = /\{\{IMAGE:([^}]+)}}/g;
    let cursor = 0;
    let match;

    while ((match = imagePattern.exec(normalized)) !== null) {
        const text = trimBlock(normalized.slice(cursor, match.index));

        if (text) {
            for (const chunk of splitMessage(text)) {
                blocks.push({ type: 'text', content: chunk });
            }
        }

        blocks.push({ type: 'image', url: match[1].trim() });
        cursor = imagePattern.lastIndex;
    }

    const tail = trimBlock(normalized.slice(cursor));

    if (tail) {
        for (const chunk of splitMessage(tail)) {
            blocks.push({ type: 'text', content: chunk });
        }
    }

    return blocks.length ? blocks : [{ type: 'text', content: 'Sin contenido disponible.' }];
}

function buildNewsMessages(newsItem, appId, language) {
    const url = buildSteamNewsUrl(newsItem, appId, language);
    const unixDate = Number(newsItem.date) || Math.floor(Date.now() / 1000);
    const title = newsItem.title || 'Nueva noticia de Steam';
    const blocks = contentToBlocks(newsItem.contents);
    const header = [
        `# ${title}`,
        `Publicado: <t:${unixDate}:F>`,
        `[Ver noticia en Steam](${url})`,
    ].join('\n');

    const firstTextBlockIndex = blocks.findIndex((block) => block.type === 'text');
    if (firstTextBlockIndex >= 0) {
        const firstTextBlock = blocks[firstTextBlockIndex];
        const firstMessage = `${header}\n\n${firstTextBlock.content}`.trim();

        if (firstMessage.length <= DISCORD_MESSAGE_LIMIT) {
            blocks[firstTextBlockIndex] = { type: 'text', content: firstMessage };
            return blocks;
        }
    }

    return [{ type: 'text', content: header }, ...blocks];
}

async function sendPlainNews(channel, newsItem, appId, language) {
    const blocks = buildNewsMessages(newsItem, appId, language);
    const sentMessages = [];

    for (const block of blocks) {
        const payload = block.type === 'image'
            ? { files: [block.url], allowedMentions: { parse: [] } }
            : { content: block.content, allowedMentions: { parse: [] } };

        let sent;

        try {
            sent = await channel.send(payload);
        } catch (error) {
            if (block.type !== 'image') throw error;

            console.error('[Steam News] No se pudo adjuntar una imagen de Steam:', error.message);

            sent = await channel.send({
                content: block.url,
                allowedMentions: { parse: [] },
            });
        }

        sentMessages.push(sent);
    }

    for (const message of sentMessages) {
        if (message.crosspostable) {
            await message.crosspost().catch((error) => {
                console.error('[Steam News] No se pudo autopublicar:', error.message);
            });
        }
    }

    return sentMessages;
}

function messageContainsNews(message, newsItem, appId, language) {
    const content = message?.content || '';
    const url = buildSteamNewsUrl(newsItem, appId, language);
    const gid = String(newsItem.gid || '');

    return Boolean(
        (gid && content.includes(gid))
        || (url && content.includes(url))
        || (newsItem.url && content.includes(newsItem.url))
    );
}

async function findNewsMessageInChannel(channel, newsItem, appId, language, state) {
    if (state?.lastMessageId) {
        const message = await channel.messages.fetch(state.lastMessageId).catch(() => null);
        if (message && messageContainsNews(message, newsItem, appId, language)) {
            return message;
        }
    }

    const messages = await channel.messages.fetch({ limit: CHANNEL_HISTORY_LIMIT }).catch((error) => {
        console.error('[Steam News] No se pudo leer el historial del canal:', error.message);
        return undefined;
    });

    if (messages === undefined) return undefined;
    return messages.find((message) => messageContainsNews(message, newsItem, appId, language)) || null;
}

async function getTargetChannel(client, channelId) {
    return client.channels.cache.get(channelId)
        || await client.channels.fetch(channelId).catch(() => null);
}

async function checkSteamNews(client) {
    if (isChecking) return;

    const channelId = process.env.STEAM_NEWS_CHANNEL_ID;
    if (!channelId) {
        console.log('[Steam News] STEAM_NEWS_CHANNEL_ID no configurado. Watcher desactivado.');
        return;
    }

    isChecking = true;

    try {
        const appId = process.env.STEAM_NEWS_APP_ID || DEFAULT_APP_ID;
        const language = process.env.STEAM_NEWS_LANGUAGE || DEFAULT_LANGUAGE;
        const channel = await getTargetChannel(client, channelId);

        if (!channel) {
            console.error(`[Steam News] No se pudo encontrar el canal: ${channelId}`);
            return;
        }

        const news = await fetchSteamNews(appId, language);
        if (!news.length) return;

        const latest = news[0];
        const state = await SteamNewsState.findOne({ appId });

        if (!state) {
            const existingMessage = await findNewsMessageInChannel(channel, latest, appId, language, null);
            if (existingMessage) {
                await SteamNewsState.create({
                    appId,
                    lastGid: latest.gid,
                    lastMessageId: existingMessage.id,
                    lastCheckedAt: new Date().toISOString(),
                });
                console.log(`[Steam News] No habia estado guardado, pero la ultima noticia ya estaba en el canal. Estado creado con gid ${latest.gid}.`);
                return;
            }

            const sentMessages = await sendPlainNews(channel, latest, appId, language);
            await SteamNewsState.create({
                appId,
                lastGid: latest.gid,
                lastMessageId: sentMessages[0]?.id,
                lastCheckedAt: new Date().toISOString(),
            });
            console.log(`[Steam News] No habia estado guardado. Ultima noticia enviada y estado guardado con gid ${latest.gid}.`);
            return;
        }

        if (latest.gid !== state.lastGid) {
            const missingItems = [];
            for (const item of news) {
                if (item.gid === state.lastGid) break;
                missingItems.push(item);
            }

            const itemsToSend = missingItems.length ? missingItems.reverse() : [latest];
            let latestMessageId = null;

            for (const item of itemsToSend) {
                const sentMessages = await sendPlainNews(channel, item, appId, language);
                if (item.gid === latest.gid) {
                    latestMessageId = sentMessages[0]?.id || null;
                }
            }

            state.lastGid = latest.gid;
            state.lastMessageId = latestMessageId;
            state.lastCheckedAt = new Date().toISOString();
            await state.save();
            console.log(`[Steam News] Habia ${itemsToSend.length} noticia(s) pendiente(s). Estado actualizado a gid ${latest.gid}.`);
            return;
        }

        const existingMessage = await findNewsMessageInChannel(channel, latest, appId, language, state);
        if (existingMessage === undefined) {
            state.lastCheckedAt = new Date().toISOString();
            await state.save();
            console.log('[Steam News] No pude verificar el canal. Revisa que el bot tenga permiso Leer historial de mensajes.');
            return;
        }

        if (!existingMessage) {
            const sentMessages = await sendPlainNews(channel, latest, appId, language);
            state.lastMessageId = sentMessages[0]?.id || null;
            state.lastCheckedAt = new Date().toISOString();
            await state.save();
            console.log(`[Steam News] El estado estaba al dia, pero no encontre la noticia en el canal. Reenviada gid ${latest.gid}.`);
            return;
        }

        if (state.lastMessageId !== existingMessage.id) {
            state.lastMessageId = existingMessage.id;
        }

        state.lastCheckedAt = new Date().toISOString();
        await state.save();
        console.log(`[Steam News] Ya esta al dia. Ultimo gid: ${state.lastGid}.`);
    } catch (error) {
        console.error('[Steam News] Error revisando noticias:', error.message);
    } finally {
        isChecking = false;
    }
}

function startSteamNewsWatcher(client) {
    if (intervalId) return;

    if (!process.env.STEAM_NEWS_CHANNEL_ID) {
        console.log('[Steam News] STEAM_NEWS_CHANNEL_ID no configurado. Watcher desactivado.');
        return;
    }

    const intervalMinutes = Number(process.env.STEAM_NEWS_INTERVAL_MINUTES) || DEFAULT_INTERVAL_MINUTES;
    const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;

    checkSteamNews(client);
    intervalId = setInterval(() => checkSteamNews(client), intervalMs);
    console.log(`[Steam News] Watcher activo cada ${Math.max(intervalMinutes, 1)} minutos.`);
}

module.exports = {
    startSteamNewsWatcher,
    checkSteamNews,
    sendLatestSteamNews: async (client, channel, options = {}) => {
        const appId = options.appId || process.env.STEAM_NEWS_APP_ID || DEFAULT_APP_ID;
        const language = options.language || process.env.STEAM_NEWS_LANGUAGE || DEFAULT_LANGUAGE;
        const news = await fetchSteamNews(appId, language);
        const latest = news[0];

        if (!latest) {
            throw new Error('Steam no devolvio noticias para esta app.');
        }

        const sentMessages = await sendPlainNews(channel, latest, appId, language);
        await SteamNewsState.findOneAndUpdate(
            { appId },
            {
                lastGid: latest.gid,
                lastMessageId: sentMessages[0]?.id || null,
                lastCheckedAt: new Date().toISOString(),
            },
            { upsert: true }
        );

        return latest;
    },
};
