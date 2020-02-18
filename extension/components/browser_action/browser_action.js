import {html, render} from 'lit-html';
import {repeat} from 'lit-html/directives/repeat';
import RedBlackTree from 'jsutils/trees/red_black_tree';

function format_bytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function format_time(input_seconds) {
    const rounded_num_seconds = parseInt(input_seconds, 10);

    const num_hours = Math.floor(rounded_num_seconds / 3600);
    const num_minutes = Math.floor((rounded_num_seconds - (num_hours * 3600)) / 60);
    const num_seconds = rounded_num_seconds - (num_hours * 3600) - (num_minutes * 60);

    const hours_part = `${(num_hours < 10 ? "0" : "")}${num_hours}h`;
    const minutes_part = `${(num_minutes < 10 ? "0" : "")}${num_minutes}min`;
    const seconds_part = `${(num_seconds < 10 ? "0" : "")}${num_seconds}s`;

    return `${num_hours !== 0 ? hours_part : ""}${num_minutes !== 0 ? minutes_part : ""}${seconds_part}`;
}

const DownloadTemplate = (download_id, download_template_data) => {

    function clear_download() {
        browser.runtime.sendMessage({
            message_type: 'clear_download',
            download_id
        }).catch(reason => console.error(`Problem sending clear message: ${reason}`));
    }

    function interrupt_download() {
        browser.runtime.sendMessage({
            message_type: 'interrupt_download',
            download_id
        }).catch(reason => console.error(`Problem sending stop message: ${reason}`));
    }

    const {progress_bar, description, action_icon_src, action_icon_on_click} = (() => {
        switch (download_template_data.status) {
            case 'error': {
                return {
                    progress_bar: null,
                    description: download_template_data.error,
                    action_icon_src: '/icons/baseline-clear-24px.svg',
                    action_icon_on_click: clear_download
                };
            }
            case 'interrupted': {
                return {
                    progress_bar: null,
                    description: 'Interrupted',
                    action_icon_src: '/icons/baseline-clear-24px.svg',
                    action_icon_on_click: clear_download
                };
            }
            case 'completed': {
                return {
                    progress_bar: null,
                    description: `${new Date(download_template_data.completion_timestamp).toLocaleString('se-SV')} — ${format_bytes(download_template_data.download_byte_size)}`,
                    action_icon_src: '/icons/baseline-clear-24px.svg',
                    action_icon_on_click: clear_download
                };
            }
            case 'in_progress': {
                const [progress_bar, description] = (() => {
                    const class_name = 'download__progress';

                    if ('progress' in download_template_data) {
                        const {
                            num_segments_downloaded, total_num_segments, elapsed_seconds, num_bytes_downloaded
                        } = download_template_data.progress;

                        const estimated_share_done = num_segments_downloaded / total_num_segments;

                        const fmt_time_remaining = `~${format_time(elapsed_seconds / estimated_share_done)}`;
                        const fmt_speed = `${format_bytes(num_bytes_downloaded / elapsed_seconds)}/s`;
                        const fmt_amount_remaining = `~${format_bytes(num_bytes_downloaded / estimated_share_done)}`;

                        return [
                            html`<progress value=${num_segments_downloaded} max=${total_num_segments} class=${class_name}></progress>`,
                            `${fmt_time_remaining} — ${fmt_speed} — ${format_bytes(num_bytes_downloaded)} of ${fmt_amount_remaining}`
                        ];
                    } else {
                        return [
                            html`<progress class=${class_name}></progress`,
                            'Starting download...'
                        ];
                    }
                })();

                return {
                    progress_bar,
                    description,
                    action_icon_src: '/icons/baseline-stop-24px.svg',
                    action_icon_on_click: interrupt_download
                };
            }
        }
    })();

    return html`
        <li class="download" id=${download_id}>
            <div class="download__cover_container">
                <img class="download__cover" src=${download_template_data.cover_src} />
            </div>
            <small class="download__title">
                <a href=${download_template_data.page_url}>${download_template_data.title}</a>
            </small>
            ${progress_bar}
            <small class="download__description">${description}</small>
            <div class="download__action_icon_container">
                <img class="download__action_icon" src=${action_icon_src} @click=${action_icon_on_click}/>
            </div>
        </li>
    `;
};

function render_downloads(downloads_rbt) {
    render(
        repeat(
            downloads_rbt,
            ([download_id, _]) => download_id,
            ([_, download]) => download
        ),
        document.getElementById('list-group')
    );
}

function initialize_storage_sync(downloads_rbt) {
    // TODO: Ascertain whether the listener is still registered after the browser action is closed.
    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local')
            return;

        for (const [download_id, change] of Object.entries(changes)) {
            if (!('newValue' in change)) {
                downloads_rbt.delete(download_id);
            } else {
                const download = DownloadTemplate(download_id, change.newValue);
                if (change.oldValue === undefined) {
                    downloads_rbt.insert(download_id, download)
                } else {
                    downloads_rbt.search(download_id).value = download;
                }
            }
        }

        render_downloads(downloads_rbt);
    });
}

async function on_dom_content_loaded() {
    const downloads_rbt = RedBlackTree.from(
        Object.entries(await browser.storage.local.get()).map(([download_id, download_data]) => {
            return [download_id, DownloadTemplate(download_id, download_data)];
        })
    );

    if (downloads_rbt.size === 0)
        return void (document.body.innerText = 'No downloads.');

    initialize_storage_sync(downloads_rbt);

    render_downloads(downloads_rbt);
}

document.addEventListener('DOMContentLoaded', on_dom_content_loaded);
