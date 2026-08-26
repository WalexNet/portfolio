import mistune


markdown = mistune.create_markdown(
    plugins=[
        "strikethrough",
        "table",
        "task_lists",
        "footnotes",
        "url",
    ]
)

def render_markdown(content: str) -> str:
    """Render Markdown content to HTML."""
    return markdown(content)