import {BlobConversionType, convert_blob} from 'jsutils/conversion_web';

const CONFIG = {
    native_application_name: 'svtplay_downloader',
    get_page_info_script_path: '/components/content_scripts/get_page_info.js'
};

const DownloadStatus = {
    IN_PROGRESS: 'in_progress',
    INTERRUPTED: 'interrupted',
    COMPLETED: 'completed',
    ERROR: 'error'
};

const DOWNLOAD_ID_TO_PORT = new Map();

async function handle_message(message) {
    const {message_type, download_id} = message;

    switch (message_type) {
        case 'clear_download': {
            return browser.storage.local.remove(download_id);
        }
        case 'interrupt_download': {
            const download = (await browser.storage.local.get(download_id))[download_id];
            download.status = DownloadStatus.INTERRUPTED;
            browser.storage.local.set({[download_id]: download});

            const port = DOWNLOAD_ID_TO_PORT.get(download_id);
            DOWNLOAD_ID_TO_PORT.delete(download_id);
            port.disconnect();

            update_badge_count_text();

            break;
        }
        default: {
            console.error(`Unsupported message type: ${message_type}.`)
        }
    }
}

browser.runtime.onMessage.addListener(handle_message);

function update_badge_count_text() {
    // The badge text is the number of active downloads, i.e. the number of active ports.
    browser.browserAction.setBadgeText({text: (DOWNLOAD_ID_TO_PORT.size || '').toString()});
}

function make_port(download_id, initial_download_info) {
    const port = browser.runtime.connectNative(CONFIG.native_application_name);
    let last_download_info = null;

    port.onMessage.addListener(response => {
        const new_download_info = 'error' in response
            ? {status: DownloadStatus.ERROR, error: response.error}
            : response
        ;

        const download_info = {...initial_download_info, ...new_download_info};
        last_download_info = download_info;

        browser.storage.local.set({[download_id]: download_info});

        if ('error' in response) {
            console.error(response.error);

            DOWNLOAD_ID_TO_PORT.delete(download_id);
            port.disconnect();
            update_badge_count_text();
        }
    });

    port.onDisconnect.addListener(port => {

        let new_download_info;
        if (port.error !== null) {
            console.error(port.error);
            new_download_info = {status: DownloadStatus.ERROR, error: 'Unexpected error.'};
        } else if (last_download_info.status === DownloadStatus.IN_PROGRESS) {
            DOWNLOAD_ID_TO_PORT.delete(download_id);
            new_download_info = {
                status: DownloadStatus.COMPLETED,
                completion_timestamp: Date.now(),
                download_byte_size: last_download_info.progress.overall_num_bytes_downloaded
            }
        }

        browser.storage.local.set({
            [download_id]: {
                ...initial_download_info,
                ...new_download_info
            }
        });

        update_badge_count_text();
    });

    return port;
}

async function handle_page_action_click(tab) {
    const {thumbnail, title} = (await browser.tabs.executeScript({file: CONFIG.get_page_info_script_path}))[0];

    // The `download_id` is a composite of the time the download was added and the download's URL.
    // By starting of the id with the time, the downloads can be sorted chronologically.
    const download_id = `${Date.now()}|${tab.url}`;
    const initial_download_info = {
        status: DownloadStatus.IN_PROGRESS,
        cover_src: await convert_blob(new Blob([thumbnail]), BlobConversionType.DataURL),
        page_url: tab.url,
        title,
    };

    browser.storage.local.set({[download_id]: initial_download_info});

    const port = make_port(download_id, initial_download_info);

    DOWNLOAD_ID_TO_PORT.set(download_id, port);

    update_badge_count_text();

    // Send a message to the native application.
    port.postMessage({url: tab.url});
}

browser.pageAction.onClicked.addListener(handle_page_action_click);
