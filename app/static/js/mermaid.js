import mermaid from
    'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose'
});

export async function renderMermaid() {
    const blocks = document.querySelectorAll(
        'pre code.language-mermaid'
    );

    for (const block of blocks) {
        const parent = block.parentElement;

        const container = document.createElement('div');

        container.className = 'mermaid';
        container.textContent = block.textContent;

        parent.replaceWith(container);
    }

    await mermaid.run({
        querySelector: '.mermaid'
    });
}

document.addEventListener(
    'DOMContentLoaded',
    renderMermaid
);