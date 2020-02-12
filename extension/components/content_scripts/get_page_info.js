(async () => {
    return {
        thumbnail: await (async () => {
            const thumbnail_response = await fetch(
                document.querySelector('meta[itemprop="thumbnailUrl"]').content
            );

            if (!thumbnail_response.ok)
                throw new Error(`Download of thumbnail failed: ${thumbnail_response.statusText}`);

            return thumbnail_response.arrayBuffer();
        })(),
        title: document.querySelector('h1.play_video-page__title-element').textContent.trim()
    };
})();