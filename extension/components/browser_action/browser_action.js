import {html, render} from 'lit-html';
import {repeat} from 'lit-html/directives/repeat';
import RedBlackTree from 'jsutils/trees/red_black_tree';

const DOWNLOAD_TEMPLATE = (download_id, cover_src, page_url, title, status) => {

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
        switch (status) {
            case 'error': {
                return {
                    progress_bar: null,
                    description: '',
                    action_icon_src: '/icons/baseline-clear-24px.svg',
                    action_icon_on_click: clear_download
                };
            }
            case 'interrupted': {
                return {
                    progress_bar: null,
                    description: 'Aborted',
                    action_icon_src: '/icons/baseline-clear-24px.svg',
                    action_icon_on_click: clear_download
                };
            }
            case 'completed': {
                return {
                    progress_bar: null,
                    description: 'SIZE AND DATE',
                    action_icon_src: '/icons/baseline-clear-24px.svg',
                    action_icon_on_click: clear_download
                };
            }
            case 'in_progress': {
                return {
                    progress_bar: html`<progress class="download__progress"></progress>`,
                    description: 'DOWNLOAD STATUS',
                    action_icon_src: '/icons/baseline-stop-24px.svg',
                    action_icon_on_click: interrupt_download
                };
            }

        }
    })();

    return html`
        <li class="download" id=${download_id}>
            <div class="download__cover_container">
                <img class="download__cover" src=${cover_src} />
            </div>
            <small class="download__title">
                <a href=${page_url}>${title}</a>
            </small>
            ${progress_bar}
            <small class="download__description">${description}</small>
            <div class="download__action_icon_container">
                <img class="download__action_icon" src=${action_icon_src} />
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
    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local')
            return;

        for (const [download_id, change] of Object.entries(changes)) {
            if (!('newValue' in change)) {
                downloads_rbt.delete(download_id);
            } else {
                const download = DOWNLOAD_TEMPLATE(download_id, ...change.newValue);
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
            const {thumbnail_base64: cover_src, page_url, title, status} = download_data;
            return DOWNLOAD_TEMPLATE(download_id, cover_src, page_url, title, status);
        })
    );

    initialize_storage_sync(downloads_rbt);

    render_downloads(downloads_rbt);
}

document.addEventListener('DOMContentLoaded', on_dom_content_loaded);
